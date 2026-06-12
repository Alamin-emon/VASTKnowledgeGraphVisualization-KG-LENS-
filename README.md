# KG·LENS — Knowledge Graph Visual Analytics Interface
### VAST Challenge 2025 · Design Challenge · University of Pisa

**Student:** Md Al Amin (701533) · Visual Analytics 2025–2026

---

## Dataset

**ICIJ Offshore Finance Knowledge Graph** — modelled after the International Consortium of
Investigative Journalists (ICIJ) Offshore Leaks Database, which covers the Panama Papers (2016),
Pandora Papers (2021), FinCEN Files (2020), SwissLeaks (2015), and Luxembourg Leaks (2014).

| Metric | Value |
|--------|-------|
| Nodes  | 80 |
| Edges  | 140 |
| Entity types | 5 (Person, Organization, Jurisdiction, Intermediary, Asset) |
| Clusters | 5 (Secrecy Havens, European Network, Asian-Pacific, Americas, Regulatory) |
| Anomalous nodes | 18 |
| Nodes with missing attributes | ~30 |
| Confidence range | [0.25, 1.00] |

Real-world source: https://offshoreleaks.icij.org

---

## Dataset 2 — VAST 2025 MC1 (scale demonstration)

A second, switchable dataset built from the **official VAST Challenge 2025 MC1
reference graph**: an Oceanus music-industry knowledge graph with **17,412
nodes** and **37,857 edges** (5 entity types, 12 relation types).

Since a 17K-node force-directed layout is not viable client-side (Section 6.2,
Scale Limits), this dataset is produced by an **offline NetworkX pipeline**
(`mc1_pipeline/build_subgraph.py`) that:

1. Computes degree centrality and Louvain communities on the full graph
2. Independently re-derives the **129 reversed `RecordedBy` edges**
   (RecordLabel→Album/Song instead of work→label) — the same defect found
   in the Telescope report's audit (Section 3.2), confirmed via NetworkX
3. Samples the top-25 highest-degree nodes per community + all anomalies
   into a **90-node / 113-edge** subgraph

| Metric | Full MC1 graph | Sampled subgraph |
|--------|---------------|------------------|
| Nodes | 17,412 | 90 |
| Edges | 37,857 | 113 |
| Communities | 94 (Louvain) | — |
| Anomalous (reversed RecordedBy) | 129 | 15 (sampled) |

Switch between datasets via the toggle in the app header. All 6 panels
(Node-Link, Sankey, Connected Components, Ego Network, Spatial, Temporal)
work unchanged on both. See `mc1_pipeline/README.md` for reproduction steps.

Source: https://github.com/vast-challenge/2025-data (MC1_release.zip)

---

## Running the project

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Requirements: Node.js ≥ 18, npm ≥ 9

---

## Visual Widgets

| Panel | Technology | Description |
|-------|------------|-------------|
| Node-Link Diagram | D3.js force simulation | **Novel viz** — community-aware layout, uncertainty rings, task-mode reconfiguration |
| Sankey Diagram | D3.js custom Sankey | Relationship flow between entity types |
| Connected Components | D3.js pack layout | Bubble pack of graph communities |
| Ego Network | D3.js radial layout | 1-hop and 2-hop neighbourhood of selected node |
| Spatial / Geographic | D3.js geoEquirectangular | Jurisdiction map with arc overlays and pie-chart bubbles |
| Temporal View | D3.js axes + scatter | Edge activity over time, stacked by edge type |

All panels share state via **Pinia** store — selecting a node in any panel updates all others.

---

## Analytical Task Modes

- 🔍 **Discovery** — semantic edge labels visible; full graph equally weighted
- ⚠️ **Anomaly** — anomalous nodes pulse red; anomalous edges highlighted
- 🕳️ **Missing Data** — inferred edges highlighted green; attribute heatmap emphasises null values

---

## Novel D3 Contribution — Uncertainty Ring

Nodes with confidence < 0.70 receive a dashed, semi-transparent concentric ring drawn as a
separate SVG `<circle>` element. This encodes epistemic uncertainty through **shape/texture**
(Bertin's visual variable), keeping it perceptually orthogonal to the hue encoding used for
entity type — the key design insight of this project.

---

## References

- VAST Challenge 2025 DC: https://vast-challenge.github.io/2025/DC.html
- ICIJ Offshore Leaks: https://offshoreleaks.icij.org
- Bostock et al. (2011). D3: Data-Driven Documents. IEEE TVCG 17(12).
- Bertin, J. (1983). Semiology of Graphics.
- Tax Justice Network Financial Secrecy Index 2022.
- FATF (2022). Beneficial Ownership and Transparency Report.

