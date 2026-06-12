# MC1 Scale Pipeline

Implements the server-side aggregation strategy described in Section 6.2
(Scale Limits) of the report, applied to the real VAST Challenge 2025
MC1 reference graph (17,412 nodes / 37,857 edges, Oceanus music KG).

## Steps to reproduce

1. Download `MC1_graph.json` from
   https://github.com/vast-challenge/2025-data (`MC1_release.zip`) and
   place it in this folder.
2. `pip install networkx --break-system-packages`
3. `python3 build_subgraph.py`

## What it computes (on the FULL 17,412-node graph, via NetworkX)

- Degree centrality for every node
- Louvain community detection (94 communities found)
- A confidence proxy from log-degree + attribute completeness
- Anomaly flags via **independent re-derivation of the reversed
  `RecordedBy` edge defect**: 129 edges run `RecordLabel → Album/Song`
  instead of `work → label` — the same finding reported in the
  Telescope report's audit (Section 3.2), confirmed here directly via
  NetworkX on the raw graph.

## Sampling strategy

The **top-25 highest-degree nodes per community** (super-node sampling)
plus all anomalous nodes are selected, producing a **90-node / 113-edge**
subgraph. This is the exact "send only the part the client needs"
approach that both this report (Section 6.2) and the Telescope report
(Section 4) identify as the required architecture for graphs beyond the
client-side force-simulation ceiling.

## Output

`mc1_subgraph.json` matches the `RAW_NODES` / `RAW_EDGES` schema used
by `frontend/src/stores/graph.js` (`id, label, type, cluster, conf,
lat, lng, anomaly, attrs`), plus a `meta` block containing:

- Full-graph statistics (node/edge type distributions)
- Top-12 genre counts
- The Oceanus Folk release-date timeline (year → count)
- A type-mixing summary table

The frontend imports this file directly
(`frontend/src/data/mc1_subgraph.json`) and exposes it as a second
dataset via the header switcher: **ICIJ Offshore Finance (80 nodes)**
↔ **VAST 2025 MC1 — Oceanus Music KG (90 / 17,412 nodes, sampled)**.
All 6 visualization panels (Node-Link, Sankey, Connected Components,
Ego Network, Spatial, Temporal) work unchanged on both datasets.
