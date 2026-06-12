"""
KG·LENS — MC1 Scale Pipeline
=============================
Implements the "server-side aggregation" approach described in our
Section 6.2 (Scale Limits) and explicitly named as the required
architectural change for MC1-class graphs (17,412 nodes / 37,857 edges).

This mirrors the Telescope report's design intent (Section 2.3 / 4):
"a substantially larger graph would move [filtering] work back to the
server, sending only the part the client needs."

Pipeline steps:
  1. Load full MC1 graph (NetworkX MultiDiGraph)
  2. Compute degree centrality for every node (on full graph)
  3. Compute community labels (Louvain, on undirected projection)
  4. Compute confidence proxy + anomaly flags from structural signals
     (mirrors our existing "conf" / "anomaly" schema in graph.js)
  5. Select top-N nodes by degree per community (super-node sampling)
  6. Re-derive edges among selected nodes + aggregate "+N more" counts
  7. Compute genre/year aggregates for Sankey + Temporal panels
  8. Emit mc1_subgraph.json — drop-in second dataset for KG·LENS

Output schema matches frontend/src/stores/graph.js (RAW_NODES / RAW_EDGES)
"""

import json
import math
import random
from collections import Counter, defaultdict

import networkx as nx
import networkx.algorithms.community as nx_comm

random.seed(42)

# ── 1. Load ──────────────────────────────────────────────────────────────────
print("Loading MC1_graph.json ...")
with open("MC1_graph.json") as f:
    data = json.load(f)

print(f"  nodes: {len(data['nodes'])}  edges: {len(data['links'])}")

G = nx.MultiDiGraph()
for n in data["nodes"]:
    G.add_node(n["id"], **n)
for e in data["links"]:
    G.add_edge(e["source"], e["target"], **e)

# Undirected simple projection for community detection / degree
UG = nx.Graph()
for n in G.nodes():
    UG.add_node(n)
for u, v, k, ed in G.edges(keys=True, data=True):
    if UG.has_edge(u, v):
        UG[u][v]["weight"] += 1
    else:
        UG.add_edge(u, v, weight=1)

print(f"  undirected simple graph: {UG.number_of_nodes()} nodes, {UG.number_of_edges()} edges")

# ── 2. Degree ─────────────────────────────────────────────────────────────────
print("Computing degree ...")
degree = dict(UG.degree())
max_deg = max(degree.values())

# ── 3. Communities (Louvain) ──────────────────────────────────────────────────
print("Computing Louvain communities (this may take ~30-60s) ...")
communities = nx_comm.louvain_communities(UG, seed=42, resolution=1.0)
node_to_comm = {}
for ci, comm in enumerate(communities):
    for n in comm:
        node_to_comm[n] = ci

print(f"  found {len(communities)} communities; sizes (top 10): "
      f"{sorted([len(c) for c in communities], reverse=True)[:10]}")

# Map communities to our 5-cluster scheme by size rank, mod 5
comm_rank = {ci: i for i, ci in enumerate(
    sorted(range(len(communities)), key=lambda c: -len(communities[c]))
)}
def cluster5(ci):
    return comm_rank[ci] % 5

# ── 4. Confidence proxy + anomaly flags ───────────────────────────────────────
# Confidence proxy: derived from data completeness + degree position
# (mirrors our schema's "source-quality" semantics: well-attested,
#  highly-connected nodes = higher confidence; sparse/isolated = lower)
def attr_completeness(n):
    attrs = G.nodes[n]
    keys = [k for k in attrs.keys() if k not in ("id", "Node Type")]
    filled = sum(1 for k in keys if attrs.get(k) not in (None, "", []))
    total = max(len(keys), 1)
    return filled / total

def confidence(n):
    deg = degree[n]
    deg_norm = math.log1p(deg) / math.log1p(max_deg) if max_deg > 0 else 0
    comp = attr_completeness(n)
    conf = 0.35 + 0.45 * deg_norm + 0.20 * comp
    return round(min(conf, 0.99), 2)

# Anomaly flags — reuse the audit finding from the Telescope report:
# reversed RecordedBy edges (RecordLabel -> Album / Song instead of work -> label)
reversed_recordedby_nodes = set()
for u, v, k, ed in G.edges(keys=True, data=True):
    if ed.get("Edge Type") == "RecordedBy":
        ut, vt = G.nodes[u].get("Node Type"), G.nodes[v].get("Node Type")
        if ut == "RecordLabel" and vt in ("Album", "Song"):
            reversed_recordedby_nodes.add(u)
            reversed_recordedby_nodes.add(v)

print(f"  reversed RecordedBy nodes flagged as anomalous: {len(reversed_recordedby_nodes)}")

# Additional anomaly: nodes with degree 0 (isolated) among "notable" entities
isolated_notable = {n for n in G.nodes()
                     if degree.get(n, 0) == 0 and G.nodes[n].get("notable")}
print(f"  isolated-but-notable nodes flagged as anomalous: {len(isolated_notable)}")

anomaly_set = reversed_recordedby_nodes | isolated_notable

# ── 5. Top-N per community (super-node sampling) ─────────────────────────────
N_TOTAL = 90  # similar order of magnitude to our curated 80-node ICIJ set
TOP_PER_COMM = 25

selected = set()
comm_items = sorted(communities, key=len, reverse=True)
for comm in comm_items:
    ranked = sorted(comm, key=lambda n: -degree.get(n, 0))
    take = ranked[:TOP_PER_COMM]
    selected.update(take)
    if len(selected) >= N_TOTAL:
        break

# Always include anomalous nodes (so the Anomaly task mode has content)
for n in list(anomaly_set)[:15]:
    selected.add(n)

selected = list(selected)[:N_TOTAL]
print(f"  selected {len(selected)} nodes for KG·LENS scale subgraph")

# ── 6. Edges among selected nodes ─────────────────────────────────────────────
sel_set = set(selected)
edges_out = []
edge_id_counter = 0
EDGE_TYPE_MAP = {
    # map MC1 edge types -> KG-LENS semantic edge "type" bucket
    "RecordedBy": "known",
    "DistributedBy": "known",
    "PerformerOf": "known",
    "ComposerOf": "known",
    "ProducerOf": "known",
    "LyricistOf": "known",
    "MemberOf": "known",
    "InStyleOf": "uncertain",
    "InterpolatesFrom": "uncertain",
    "LyricalReferenceTo": "inferred",
    "CoverOf": "inferred",
    "DirectlySamples": "anomaly",
}

def edge_year(u, v):
    for n in (u, v):
        attrs = G.nodes[n]
        for key in ("release_date", "written_date", "notoriety_date"):
            val = attrs.get(key)
            if val:
                try:
                    y = int(str(val)[:4])
                    if 1950 <= y <= 2026:
                        return y
                except ValueError:
                    pass
    return None

extra_edges_count = 0
for u, v, k, ed in G.edges(keys=True, data=True):
    if u in sel_set and v in sel_set:
        et = ed.get("Edge Type", "?")
        bucket = EDGE_TYPE_MAP.get(et, "uncertain")
        # flag reversed RecordedBy specifically as anomaly
        if et == "RecordedBy":
            ut, vt = G.nodes[u].get("Node Type"), G.nodes[v].get("Node Type")
            if ut == "RecordLabel" and vt in ("Album", "Song"):
                bucket = "anomaly"
        conf = round((confidence(u) + confidence(v)) / 2, 2)
        edges_out.append({
            "source": f"M{u}",
            "target": f"M{v}",
            "rel": et,
            "conf": conf,
            "type": bucket,
            "year": edge_year(u, v),
        })
    elif (u in sel_set) != (v in sel_set):
        extra_edges_count += 1


print(f"  edges among selected: {len(edges_out)}")
print(f"  edges to outside selection (aggregated as '+N more'): {extra_edges_count}")

# ── 7. Build node records ─────────────────────────────────────────────────────
TYPE_TO_KG_LENS = {
    "Person": "Person",
    "MusicalGroup": "Organization",
    "RecordLabel": "Intermediary",
    "Album": "Asset",
    "Song": "Asset",
}

# approximate lat/lng per cluster (reuse our 5-cluster geographic spread)
CLUSTER_GEO = {
    0: (51.5074, -0.1278),   # London
    1: (40.7128, -74.0060),  # New York
    2: (34.0522, -118.2437), # LA
    3: (48.8566, 2.3522),    # Paris
    4: (35.6762, 139.6503),  # Tokyo
}

nodes_out = []
for n in selected:
    attrs = G.nodes[n]
    ntype = attrs.get("Node Type", "Person")
    cluster = cluster5(node_to_comm.get(n, 0))
    lat0, lng0 = CLUSTER_GEO[cluster]
    jitter = lambda: (random.random() - 0.5) * 8
    extra_attrs = {k: v for k, v in attrs.items() if k not in ("id", "Node Type", "name")}
    if not extra_attrs:
        extra_attrs = {"degree": degree.get(n, 0)}
    else:
        extra_attrs["degree"] = degree.get(n, 0)

    nodes_out.append({
        "id": f"M{n}",
        "label": attrs.get("name", f"Node {n}"),
        "type": TYPE_TO_KG_LENS.get(ntype, "Person"),
        "mc1_type": ntype,
        "cluster": cluster,
        "conf": confidence(n),
        "lat": round(lat0 + jitter(), 4),
        "lng": round(lng0 + jitter(), 4),
        "anomaly": n in anomaly_set,
        "attrs": extra_attrs,
    })

# ── 8. Genre / temporal aggregates (for Sankey + Temporal panels) ─────────────
genre_counts = Counter(n.get("genre") for n in data["nodes"] if n.get("genre"))
top_genres = genre_counts.most_common(12)

year_genre = defaultdict(lambda: Counter())
for n in data["nodes"]:
    rd = n.get("release_date")
    genre = n.get("genre")
    if rd and genre:
        try:
            year = int(str(rd)[:4])
            if 1950 <= year <= 2026:
                year_genre[year][genre] += 1
        except ValueError:
            pass

oceanus_folk_timeline = sorted(
    [(y, c.get("Oceanus Folk", 0), sum(c.values())) for y, c in year_genre.items()],
    key=lambda x: x[0]
)

# Type-mixing matrix (edge type x source/target node type) — small summary
type_mixing = defaultdict(lambda: Counter())
for u, v, k, ed in G.edges(keys=True, data=True):
    ut = G.nodes[u].get("Node Type", "?")
    vt = G.nodes[v].get("Node Type", "?")
    type_mixing[ut][vt] += 1

type_mixing_table = {ut: dict(c) for ut, c in type_mixing.items()}

# ── 9. Output ──────────────────────────────────────────────────────────────────
output = {
    "meta": {
        "source": "VAST Challenge 2025 MC1_graph.json",
        "full_graph": {
            "nodes": len(data["nodes"]),
            "edges": len(data["links"]),
            "node_types": dict(Counter(n.get("Node Type") for n in data["nodes"])),
            "edge_types": dict(Counter(e.get("Edge Type") for e in data["links"])),
        },
        "subgraph": {
            "nodes": len(nodes_out),
            "edges": len(edges_out),
            "communities_total": len(communities),
            "anomalous_in_full_graph": len(anomaly_set),
            "reversed_recordedby_count": len(reversed_recordedby_nodes),
        },
        "top_genres": top_genres,
        "oceanus_folk_timeline": oceanus_folk_timeline,
        "type_mixing": type_mixing_table,
    },
    "nodes": nodes_out,
    "edges": edges_out,
}

with open("mc1_subgraph.json", "w") as f:
    json.dump(output, f, indent=1)

print()
print("Done. Wrote mc1_subgraph.json")
print(f"  Subgraph: {len(nodes_out)} nodes, {len(edges_out)} edges")
print(f"  Anomalous nodes in subgraph: {sum(1 for n in nodes_out if n['anomaly'])}")
