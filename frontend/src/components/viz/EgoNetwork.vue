<script setup>
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import { useGraphStore, TYPE_COLORS, EDGE_COLORS } from '@/stores/graph'

const store = useGraphStore()
const svgRef = ref(null)

function build() {
  if (!svgRef.value) return
  const el = svgRef.value
  const W = el.clientWidth || 420
  const H = el.clientHeight || 420
  d3.select(el).selectAll('*').remove()

  const egoId = store.egoNodeId || store.selectedNodeId
  const egoNode = egoId ? store.allNodes.find(n => n.id === egoId) : null

  const svg = d3.select(el).attr('width', W).attr('height', H)

  if (!egoNode) {
    svg.append('text').attr('x', W / 2).attr('y', H / 2)
      .attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#94a3b8')
      .text('Click a node in the graph to see its ego network')
    return
  }

  const cx = W / 2, cy = H / 2
  const neighbors = store.allEdges
    .filter(e => e.source === egoId || e.target === egoId)
    .map(e => {
      const nid = e.source === egoId ? e.target : e.source
      return { node: store.allNodes.find(n => n.id === nid), edge: e }
    }).filter(x => x.node)

  // 2-hop neighbors
  const hop2Edges = store.allEdges.filter(e =>
    (neighbors.some(nb => nb.node.id === e.source) && e.target !== egoId) ||
    (neighbors.some(nb => nb.node.id === e.target) && e.source !== egoId)
  )
  const hop2Ids = new Set([
    ...hop2Edges.map(e => e.source),
    ...hop2Edges.map(e => e.target),
  ].filter(id => id !== egoId && !neighbors.some(nb => nb.node.id === id)))

  const hop2Nodes = [...hop2Ids].map(id => store.allNodes.find(n => n.id === id)).filter(Boolean)

  const R1 = Math.min(W, H) * 0.28 // ring 1
  const R2 = Math.min(W, H) * 0.44 // ring 2

  // Draw rings
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R1)
    .attr('fill', 'none').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '4,3')
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R2)
    .attr('fill', 'none').attr('stroke', '#f1f5f9').attr('stroke-dasharray', '4,3')

  // Ring labels
  svg.append('text').attr('x', cx + R1 + 4).attr('y', cy).attr('font-size', 8).attr('fill', '#cbd5e1').text('1-hop')
  svg.append('text').attr('x', cx + R2 + 4).attr('y', cy).attr('font-size', 8).attr('fill', '#e2e8f0').text('2-hop')

  // Position neighbors on ring 1
  const n1Positions = neighbors.map((nb, i) => {
    const angle = (i / neighbors.length) * 2 * Math.PI - Math.PI / 2
    return { ...nb.node, x: cx + R1 * Math.cos(angle), y: cy + R1 * Math.sin(angle), edge: nb.edge }
  })

  // Position hop-2 on ring 2
  const n2Positions = hop2Nodes.map((n, i) => {
    const angle = (i / Math.max(hop2Nodes.length, 1)) * 2 * Math.PI - Math.PI / 2 + 0.2
    return { ...n, x: cx + R2 * Math.cos(angle), y: cy + R2 * Math.sin(angle) }
  })

  const g = svg.append('g')

  // Draw hop-2 edges
  hop2Edges.forEach(e => {
    const sn = n1Positions.find(n => n.id === e.source) || n2Positions.find(n => n.id === e.source)
    const tn = n1Positions.find(n => n.id === e.target) || n2Positions.find(n => n.id === e.target)
    if (!sn || !tn) return
    g.append('line')
      .attr('x1', sn.x).attr('y1', sn.y).attr('x2', tn.x).attr('y2', tn.y)
      .attr('stroke', '#e2e8f0').attr('stroke-width', 1)
  })

  // Draw ego edges
  n1Positions.forEach(nb => {
    g.append('line')
      .attr('x1', cx).attr('y1', cy).attr('x2', nb.x).attr('y2', nb.y)
      .attr('stroke', EDGE_COLORS[nb.edge.type] || '#94a3b8')
      .attr('stroke-width', Math.max(1, nb.edge.conf * 3))
      .attr('stroke-dasharray', nb.edge.type === 'inferred' ? '5,3' : null)
      .attr('opacity', 0.7)
    // Edge label
    g.append('text')
      .attr('x', (cx + nb.x) / 2).attr('y', (cy + nb.y) / 2 - 4)
      .attr('text-anchor', 'middle').attr('font-size', 7.5).attr('fill', '#94a3b8')
      .text(nb.edge.rel)
  })

  // Draw hop-2 nodes
  n2Positions.forEach(n => {
    const ng = g.append('g').attr('cursor', 'pointer').on('click', () => { store.selectNode(n.id); store.setEgoNode(n.id) })
    ng.append('circle').attr('cx', n.x).attr('cy', n.y).attr('r', 8)
      .attr('fill', TYPE_COLORS[n.type] || '#888').attr('opacity', 0.5)
      .attr('stroke', 'white').attr('stroke-width', 0.5)
    ng.append('text').attr('x', n.x).attr('y', n.y + 17)
      .attr('text-anchor', 'middle').attr('font-size', 7.5).attr('fill', '#94a3b8')
      .text(n.label.split(' ')[0])
  })

  // Draw ring-1 neighbor nodes
  n1Positions.forEach(nb => {
    const ng = g.append('g').attr('cursor', 'pointer').on('click', () => { store.selectNode(nb.id); store.setEgoNode(nb.id) })
    ng.append('circle').attr('cx', nb.x).attr('cy', nb.y).attr('r', 12)
      .attr('fill', TYPE_COLORS[nb.type] || '#888')
      .attr('stroke', nb.anomaly ? '#ef4444' : 'white').attr('stroke-width', nb.anomaly ? 2 : 1.5)
    ng.append('text').attr('x', nb.x).attr('y', nb.y + 20)
      .attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#334155').attr('font-weight', 500)
      .text(nb.label.split(' ')[0])
  })

  // Draw ego node (center)
  const egoG = svg.append('g')
  egoG.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 20)
    .attr('fill', TYPE_COLORS[egoNode.type] || '#888')
    .attr('stroke', '#1e293b').attr('stroke-width', 2.5)
  egoG.append('text').attr('x', cx).attr('y', cy)
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('font-size', 9).attr('fill', '#fff').attr('font-weight', 700)
    .text(egoNode.label.split(' ')[0].slice(0, 8))
  egoG.append('text').attr('x', cx).attr('y', cy + 30)
    .attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', '#64748b')
    .text(`(ego) ${egoNode.type}`)
}

onMounted(build)
watch([() => store.selectedNodeId, () => store.egoNodeId, () => store.visibleNodes.length], build)
</script>

<template>
  <svg ref="svgRef" class="w-full h-full bg-slate-50 rounded-lg"></svg>
</template>
