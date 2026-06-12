<script setup>
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import { useGraphStore, TYPE_COLORS } from '@/stores/graph'

const store = useGraphStore()
const svgRef = ref(null)

function findComponents() {
  const nodes = store.visibleNodes
  const edges = store.visibleEdges
  const parent = Object.fromEntries(nodes.map(n => [n.id, n.id]))
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])) }
  function union(a, b) { parent[find(a)] = find(b) }
  edges.forEach(e => { if (parent[e.source] !== undefined && parent[e.target] !== undefined) union(e.source, e.target) })
  const comps = {}
  nodes.forEach(n => {
    const root = find(n.id)
    if (!comps[root]) comps[root] = []
    comps[root].push(n)
  })
  return Object.values(comps).sort((a, b) => b.length - a.length)
}

function build() {
  if (!svgRef.value) return
  const el = svgRef.value
  const W = el.clientWidth || 700
  const H = el.clientHeight || 420
  d3.select(el).selectAll('*').remove()

  const svg = d3.select(el).attr('width', W).attr('height', H)
  const components = findComponents()

  // Bubble pack: each component = a cluster bubble, nodes inside as smaller bubbles
  const root = { name: 'root', children: components.map((comp, ci) => ({
    name: `comp-${ci}`,
    children: comp.map(n => ({ ...n, value: 1 }))
  }))}

  const pack = d3.pack().size([W, H]).padding(8)
  const hierarchy = d3.hierarchy(root)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value)
  pack(hierarchy)

  // Cluster (component) bubbles
  const compNodes = hierarchy.children || []

  compNodes.forEach((cn, ci) => {
    svg.append('circle')
      .attr('cx', cn.x).attr('cy', cn.y).attr('r', cn.r)
      .attr('fill', `hsl(${(ci * 60 + 220) % 360}, 60%, 96%)`)
      .attr('stroke', `hsl(${(ci * 60 + 220) % 360}, 50%, 75%)`)
      .attr('stroke-width', 1.5)

    svg.append('text')
      .attr('x', cn.x).attr('y', cn.y - cn.r + 14)
      .attr('text-anchor', 'middle').attr('font-size', 9)
      .attr('fill', '#64748b').attr('font-weight', 600)
      .text(`Component ${ci + 1} (${(cn.children || []).length} nodes)`)

    // Node bubbles inside
    ;(cn.children || []).forEach(leaf => {
      const g = svg.append('g')
        .attr('cursor', 'pointer')
        .on('click', () => store.selectNode(leaf.data.id))

      g.append('circle')
        .attr('cx', leaf.x).attr('cy', leaf.y).attr('r', Math.max(leaf.r, 4))
        .attr('fill', leaf.data.anomaly ? '#fecaca' : TYPE_COLORS[leaf.data.type] || '#888')
        .attr('fill-opacity', 0.85)
        .attr('stroke', leaf.data.id === store.selectedNodeId ? '#1e293b' : 'rgba(0,0,0,0.1)')
        .attr('stroke-width', leaf.data.id === store.selectedNodeId ? 2 : 0.5)

      if (leaf.r > 10) {
        g.append('text')
          .attr('x', leaf.x).attr('y', leaf.y)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', Math.min(leaf.r * 0.5, 9))
          .attr('fill', '#fff').attr('pointer-events', 'none')
          .text(leaf.data.label.split(' ')[0].slice(0, 7))
      }
    })
  })

  // Legend: type colour dots
  const types = [...new Set(store.visibleNodes.map(n => n.type))]
  const leg = svg.append('g').attr('transform', `translate(12, ${H - 12 - types.length * 16})`)
  types.forEach((t, i) => {
    leg.append('circle').attr('cx', 5).attr('cy', i * 16).attr('r', 5)
      .attr('fill', TYPE_COLORS[t]).attr('fill-opacity', 0.85)
    leg.append('text').attr('x', 14).attr('y', i * 16)
      .attr('dominant-baseline', 'central').attr('font-size', 9).attr('fill', '#475569').text(t)
  })
}

onMounted(build)
watch([() => store.visibleNodes.length, () => store.selectedNodeId], build)
</script>

<template>
  <svg ref="svgRef" class="w-full h-full bg-slate-50 rounded-lg"></svg>
</template>
