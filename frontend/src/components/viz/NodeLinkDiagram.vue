<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { useGraphStore, TYPE_COLORS, EDGE_COLORS } from '@/stores/graph'

const store = useGraphStore()
const svgRef = ref(null)
let simulation = null

function nodeRadius(d) {
  const base = { Person: 12, Organization: 14, Location: 10, Event: 12, Concept: 11 }
  const nbCount = store.allEdges.filter(e => e.source === d.id || e.target === d.id).length
  return (base[d.type] || 11) + Math.min(nbCount * 0.8, 6)
}

function buildGraph() {
  if (!svgRef.value) return
  const el = svgRef.value
  const W = el.clientWidth || 700
  const H = el.clientHeight || 500

  d3.select(el).selectAll('*').remove()

  const svg = d3.select(el)
    .attr('width', W).attr('height', H)

  const defs = svg.append('defs')
  ;['default', 'accent', 'red'].forEach((k, i) => {
    defs.append('marker')
      .attr('id', `arrow-${k}`)
      .attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0 1L9 5L0 9z')
      .attr('fill', k === 'accent' ? '#6366f1' : k === 'red' ? '#ef4444' : '#94a3b8')
  })

  const zoom = d3.zoom().scaleExtent([0.2, 4])
    .on('zoom', e => g.attr('transform', e.transform))
  svg.call(zoom)

  const g = svg.append('g')

  const nodes = store.visibleNodes.map(d => ({ ...d }))
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  const edges = store.visibleEdges
    .map(e => ({ ...e, source: nodeMap[e.source], target: nodeMap[e.target] }))
    .filter(e => e.source && e.target)

  // Cluster centres
  const cw = W / 2, ch = H / 2
  const clusterPos = { 0: [cw, ch * 0.4], 1: [cw * 0.5, ch], 2: [cw, ch * 1.5], 3: [cw * 1.6, ch * 0.8] }

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges).id(d => d.id).distance(e => e.type === 'inferred' ? 130 : 90).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-250))
    .force('collision', d3.forceCollide(d => nodeRadius(d) + 10))
    .force('cluster', alpha => {
      nodes.forEach(n => {
        const c = clusterPos[n.cluster] || [cw, ch]
        n.vx += (c[0] - n.x) * 0.015 * alpha
        n.vy += (c[1] - n.y) * 0.015 * alpha
      })
    })
    .force('center', d3.forceCenter(cw, ch).strength(0.03))

  // Links
  const linkSel = g.append('g').selectAll('line')
    .data(edges).enter().append('line')
    .attr('stroke', e => EDGE_COLORS[e.type] || '#94a3b8')
    .attr('stroke-width', e => Math.max(1, e.conf * 3))
    .attr('stroke-dasharray', e => e.type === 'inferred' ? '5,3' : null)
    .attr('stroke-opacity', e => {
      if (store.activeTask === 'anomaly') return e.type === 'anomaly' ? 1 : 0.15
      if (store.activeTask === 'missing') return e.type === 'inferred' ? 1 : 0.15
      return 0.65
    })
    .attr('marker-end', e => e.type === 'anomaly' ? 'url(#arrow-red)' : e.conf > 0.7 ? 'url(#arrow-accent)' : 'url(#arrow-default)')

  // Edge labels (discovery mode only)
  const edgeLabelSel = g.append('g').selectAll('text')
    .data(edges).enter().append('text')
    .attr('text-anchor', 'middle').attr('font-size', 8)
    .attr('fill', '#94a3b8').attr('pointer-events', 'none')
    .text(e => e.rel)
    .style('opacity', store.activeTask === 'discovery' ? 0.8 : 0)

  // Node groups
  const nodeG = g.append('g').selectAll('g')
    .data(nodes).enter().append('g')
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (ev, d) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y })
      .on('end',   (ev, d) => { if (!ev.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
    )
    .on('click', (ev, d) => store.selectNode(d.id))

  // Uncertainty ring
  nodeG.filter(d => d.conf < 0.7).append('circle')
    .attr('r', d => nodeRadius(d) + 5)
    .attr('fill', 'none')
    .attr('stroke', d => TYPE_COLORS[d.type] || '#888')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,2')
    .attr('opacity', 0.5)

  // Main circle
  nodeG.append('circle')
    .attr('r', d => nodeRadius(d))
    .attr('fill', d => {
      const c = TYPE_COLORS[d.type] || '#888'
      if (d.anomaly && store.activeTask === 'anomaly') return '#ef4444'
      return d.conf < 0.55 ? d3.color(c).darker(1).toString() : c
    })
    .attr('stroke', d => {
      if (d.id === store.selectedNodeId) return '#fff'
      if (d.anomaly) return '#ef4444'
      return 'rgba(0,0,0,0.15)'
    })
    .attr('stroke-width', d => d.id === store.selectedNodeId ? 3 : d.anomaly ? 2 : 1)

  // Label
  nodeG.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', d => nodeRadius(d) + 11)
    .attr('font-size', 9).attr('fill', '#334155')
    .attr('pointer-events', 'none')
    .text(d => d.label.split(' ')[0])

  simulation.on('tick', () => {
    linkSel
      .attr('x1', e => e.source.x).attr('y1', e => e.source.y)
      .attr('x2', e => e.target.x).attr('y2', e => e.target.y)
    edgeLabelSel
      .attr('x', e => (e.source.x + e.target.x) / 2)
      .attr('y', e => (e.source.y + e.target.y) / 2 - 4)
    nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
  })
}

onMounted(buildGraph)
watch([() => store.visibleNodes.length, () => store.visibleEdges.length, () => store.activeTask, () => store.selectedNodeId], buildGraph)
onUnmounted(() => simulation?.stop())
</script>

<template>
  <svg ref="svgRef" class="w-full h-full bg-slate-50 rounded-lg"></svg>
</template>
