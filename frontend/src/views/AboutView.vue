<script setup>
import { useGraphStore, MC1_META } from '@/stores/graph'
const store = useGraphStore()
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 py-6 px-4 text-sm text-slate-700">

    <div>
      <h1 class="text-2xl font-bold text-slate-900">KG·LENS</h1>
      <p class="mt-1 text-slate-500 text-xs uppercase tracking-widest font-semibold">VAST Challenge 2025 — Design Challenge · University of Pisa · Visual Analytics</p>
      <p class="mt-3 leading-relaxed">
        KG·LENS is a visual analytics interface for knowledge graph exploration, designed for the
        <strong>VAST Challenge 2025 Design Challenge</strong>. It targets three analytical tasks:
        <em>discovery</em>, <em>anomaly detection</em>, and <em>missing-data inference</em>.
        Use the dataset switcher in the top bar to toggle between the curated ICIJ dataset and the
        VAST 2025 MC1 reference graph (server-side aggregated).
      </p>
    </div>

    <div class="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
      <h2 class="text-base font-semibold text-indigo-900 mb-2">Scale Demonstration — VAST 2025 MC1 (17,412 nodes)</h2>
      <p class="leading-relaxed mb-3 text-indigo-950">
        MC1 is the official VAST Challenge 2025 reference graph: an Oceanus music-industry knowledge
        graph with <strong>17,412 nodes</strong> and <strong>37,857 edges</strong> across 5 entity
        types (Person, MusicalGroup, RecordLabel, Album, Song) and 12 relation types.
        Rendering all 17K nodes in a force-directed D3 layout is not viable client-side
        (Section 6.2, Scale Limits) — so KG·LENS implements the
        <strong>server-side aggregation</strong> strategy it identifies as the required architectural
        change: an offline NetworkX/Louvain pipeline computes degree centrality and community
        structure on the full graph, then samples the <strong>top-25 highest-degree nodes per
        community</strong> (super-node sampling) plus all structurally anomalous nodes, producing a
        90-node / 113-edge subgraph that KG·LENS renders with full interactivity.
      </p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
        <div v-for="[k,v] in [
          ['Full graph nodes', MC1_META.full_graph.nodes.toLocaleString()],
          ['Full graph edges', MC1_META.full_graph.edges.toLocaleString()],
          ['Louvain communities', MC1_META.subgraph.communities_total],
          ['Sampled subgraph', MC1_META.subgraph.nodes + ' / ' + MC1_META.subgraph.edges],
        ]" :key="k"
          class="rounded-lg border border-indigo-200 bg-white px-3 py-2">
          <div class="text-lg font-bold text-indigo-700">{{ v }}</div>
          <div class="text-[10px] text-indigo-500">{{ k }}</div>
        </div>
      </div>
      <p class="leading-relaxed text-indigo-950">
        <strong>Independent verification (mirroring Telescope's audit methodology):</strong>
        the pipeline independently re-derives the finding that
        <strong>{{ MC1_META.subgraph.reversed_recordedby_count }} RecordedBy edges run in the wrong
        direction</strong> (RecordLabel → Album/Song instead of work → label) — confirmed directly
        via NetworkX on the raw 37,857-edge graph, the same defect identified in the Telescope
        report (Section 3.2). These nodes are flagged <code>anomaly: true</code> and surface in
        KG·LENS's Anomaly task mode.
      </p>
    </div>

    <div>
      <h2 class="text-base font-semibold text-slate-800 mb-2">Dataset 1 — ICIJ Offshore Finance Knowledge Graph</h2>
      <p class="leading-relaxed mb-3">
        The knowledge graph is modelled after the real-world dataset published by the
        <strong>International Consortium of Investigative Journalists (ICIJ)</strong> in the
        Panama Papers (2016), Pandora Papers (2021), FinCEN Files (2020), SwissLeaks (2015),
        and Luxembourg Leaks (2014). The ICIJ Offshore Leaks Database
        (<a href="https://offshoreleaks.icij.org" class="text-indigo-600 underline" target="_blank">offshoreleaks.icij.org</a>)
        contains over 810,000 offshore entities linked across 240+ jurisdictions.
      </p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div v-for="[k,v] in [
          ['Nodes', store.stats.nodes],
          ['Edges', store.stats.edges],
          ['Entity types', store.stats.types],
          ['Clusters', store.stats.clusters],
          ['Anomalous nodes', store.stats.anomalies],
          ['Nodes w/ missing attrs', store.stats.missing]
        ]" :key="k"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div class="text-xl font-bold text-indigo-600">{{ v }}</div>
          <div class="text-[10px] text-slate-500">{{ k }}</div>
        </div>
      </div>
    </div>

    <div>
      <h2 class="text-base font-semibold text-slate-800 mb-2">Entity Types — ICIJ Dataset</h2>
      <ul class="space-y-1 text-xs">
        <li><span class="font-semibold text-indigo-600">Person</span> — Beneficial owners, directors, nominees, PEPs</li>
        <li><span class="font-semibold text-purple-600">Organization</span> — Shell companies, banks, holding entities, SPVs</li>
        <li><span class="font-semibold text-cyan-600">Jurisdiction</span> — Secrecy havens, offshore financial centres, conduit OFCs</li>
        <li><span class="font-semibold text-amber-600">Intermediary</span> — Law firms, trust administrators, company formation agents</li>
        <li><span class="font-semibold text-emerald-600">Asset</span> — Real estate, vessels, funds, commodities, crypto</li>
      </ul>
      <h2 class="text-base font-semibold text-slate-800 mb-2 mt-4">Entity Types — MC1 Dataset (mapped)</h2>
      <ul class="space-y-1 text-xs">
        <li><span class="font-semibold text-indigo-600">Person</span> ← Person (11,361 in full graph)</li>
        <li><span class="font-semibold text-purple-600">Organization</span> ← MusicalGroup (223)</li>
        <li><span class="font-semibold text-amber-600">Intermediary</span> ← RecordLabel (1,217)</li>
        <li><span class="font-semibold text-emerald-600">Asset</span> ← Album / Song (996 / 3,615)</li>
      </ul>
    </div>

    <div>
      <h2 class="text-base font-semibold text-slate-800 mb-2">Novel Visualizations</h2>
      <ul class="space-y-1 text-xs list-disc list-inside">
        <li><strong>Uncertainty ring</strong> — dashed concentric halo on low-confidence nodes (D3.js)</li>
        <li><strong>Community-aware force simulation</strong> — cluster-attraction force groups nodes by offshore network</li>
        <li><strong>Task-mode reconfiguration</strong> — Discovery / Anomaly / Missing-Data modes restyle the entire graph</li>
        <li><strong>Attribute-coverage heatmap</strong> — per-node completeness grid in the detail panel</li>
        <li><strong>Geographic arc map</strong> — pie-chart bubbles per jurisdiction with arc overlays</li>
      </ul>
    </div>

    <div>
      <h2 class="text-base font-semibold text-slate-800 mb-2">References</h2>
      <ul class="space-y-1 text-xs text-slate-600">
        <li>ICIJ Offshore Leaks Database — <a href="https://offshoreleaks.icij.org" class="text-indigo-600 underline" target="_blank">offshoreleaks.icij.org</a></li>
        <li>VAST Challenge 2025 DC — <a href="https://vast-challenge.github.io/2025/DC.html" class="text-indigo-600 underline" target="_blank">vast-challenge.github.io/2025/DC.html</a></li>
        <li>Bostock et al. (2011). D3: Data-Driven Documents. IEEE TVCG 17(12).</li>
        <li>Bertin, J. (1983). Semiology of Graphics. U. of Wisconsin Press.</li>
        <li>Tax Justice Network — Financial Secrecy Index 2022.</li>
        <li>VAST Challenge 2025 MC1 — <a href="https://github.com/vast-challenge/2025-data" class="text-indigo-600 underline" target="_blank">github.com/vast-challenge/2025-data</a> (MC1_graph.json, 17,412 nodes / 37,857 edges)</li>
        <li>Blondel et al. (2008). Fast unfolding of communities in large networks. J. Stat. Mech.</li>
      </ul>
    </div>

    <p class="text-xs text-slate-400">
      Md Al Amin (701533) · University of Pisa · Visual Analytics 2025–2026
    </p>
  </div>
</template>
