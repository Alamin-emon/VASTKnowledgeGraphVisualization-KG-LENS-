<script setup>
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import { useGraphStore, TYPE_COLORS, EDGE_COLORS } from '@/stores/graph'

const store = useGraphStore()
const svgRef = ref(null)

function build() {
  if (!svgRef.value) return
  const el = svgRef.value
  const W = el.clientWidth || 700
  const H = el.clientHeight || 420
  d3.select(el).selectAll('*').remove()

  const svg = d3.select(el).attr('width', W).attr('height', H)
  const margin = { top: 30, right: 24, bottom: 50, left: 48 }
  const iW = W - margin.left - margin.right
  const iH = H - margin.top - margin.bottom
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // Edges with year
  const timedEdges = store.visibleEdges.filter(e => e.year)
  if (timedEdges.length === 0) {
    svg.append('text').attr('x', W / 2).attr('y', H / 2)
      .attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#94a3b8')
      .text('No temporal data available for visible edges')
    return
  }

  const years = timedEdges.map(e => e.year)
  const minY = Math.min(...years) - 0.5
  const maxY = Math.max(...years) + 0.5

  const xScale = d3.scaleLinear().domain([minY, maxY]).range([0, iW])
  const edgeTypes = ['known', 'uncertain', 'anomaly', 'inferred']
  const yScale = d3.scaleBand().domain(edgeTypes).range([0, iH]).padding(0.3)

  // Grid lines
  g.append('g').call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(t => t))
    .call(ax => ax.select('.domain').remove())
    .call(ax => ax.selectAll('.tick line').attr('stroke', '#f1f5f9').attr('stroke-width', 1))
    .call(ax => ax.selectAll('.tick text').attr('font-size', 10).attr('fill', '#64748b'))

  // X axis
  g.append('g').attr('transform', `translate(0,${iH})`).call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('d')))
    .call(ax => ax.select('.domain').attr('stroke', '#e2e8f0'))
    .call(ax => ax.selectAll('.tick text').attr('font-size', 10).attr('fill', '#94a3b8'))
  g.append('text').attr('x', iW / 2).attr('y', iH + 36)
    .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#94a3b8').text('Year')

  // Count edges per year per type
  const bins = {}
  timedEdges.forEach(e => {
    const k = `${e.year}||${e.type}`
    bins[k] = (bins[k] || [])
    bins[k].push(e)
  })

  // Stacked bar per year
  const yearGroups = d3.group(timedEdges, e => e.year)
  const yearBand = d3.scaleBand()
    .domain([...yearGroups.keys()].sort())
    .range([0, iW]).padding(0.25)

  // Bars per year per type
  yearGroups.forEach((edges, year) => {
    const typeCounts = {}
    edges.forEach(e => typeCounts[e.type] = (typeCounts[e.type] || 0) + 1)
    const total = Object.values(typeCounts).reduce((a, b) => a + b, 0)
    const maxCount = d3.max([...yearGroups.values()].map(es => es.length)) || 1
    const barH = (total / maxCount) * iH * 0.75
    const barX = xScale(year) - yearBand.bandwidth() / 2
    let cumH = 0

    edgeTypes.forEach(type => {
      const count = typeCounts[type] || 0
      if (!count) return
      const h = (count / total) * barH
      g.append('rect')
        .attr('x', barX).attr('y', iH - cumH - h)
        .attr('width', yearBand.bandwidth()).attr('height', h)
        .attr('fill', EDGE_COLORS[type] || '#888').attr('opacity', 0.8).attr('rx', 2)
        .append('title').text(`${year} · ${type}: ${count}`)
      cumH += h
    })

    // Count label
    g.append('text').attr('x', barX + yearBand.bandwidth() / 2).attr('y', iH - cumH - 4)
      .attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#64748b').text(total)
  })

  // Overlay: scatter dots per edge
  timedEdges.forEach(e => {
    const sn = store.allNodes.find(n => n.id === e.source)
    if (!sn) return
    const jitterY = (Math.random() - 0.5) * (yScale.bandwidth() * 0.6)
    const cy = (yScale(e.type) || 0) + yScale.bandwidth() / 2 + jitterY
    g.append('circle')
      .attr('cx', xScale(e.year))
      .attr('cy', cy)
      .attr('r', 4)
      .attr('fill', TYPE_COLORS[sn.type] || '#888')
      .attr('opacity', 0.7)
      .attr('stroke', e.type === 'anomaly' ? '#ef4444' : 'rgba(0,0,0,0.1)')
      .attr('stroke-width', e.type === 'anomaly' ? 1.5 : 0.5)
      .attr('cursor', 'pointer')
      .on('click', () => store.selectNode(sn.id))
      .append('title').text(`${sn.label} → ${e.target}\n${e.rel} (${e.type}, ${Math.round(e.conf * 100)}%)`)
  })

  // Legend
  const legG = svg.append('g').attr('transform', `translate(${W - 110}, ${margin.top})`)
  legG.append('text').attr('x', 0).attr('y', -5).attr('font-size', 9).attr('fill', '#94a3b8').text('Edge type')
  edgeTypes.forEach((t, i) => {
    legG.append('rect').attr('x', 0).attr('y', i * 14 + 2).attr('width', 10).attr('height', 6)
      .attr('fill', EDGE_COLORS[t]).attr('rx', 2)
    legG.append('text').attr('x', 14).attr('y', i * 14 + 8).attr('font-size', 9).attr('fill', '#475569').text(t)
  })

  // Title
  svg.append('text').attr('x', W / 2).attr('y', 16).attr('text-anchor', 'middle')
    .attr('font-size', 10).attr('fill', '#94a3b8')
    .text('Bars: edge count per year (stacked by type) · Dots: individual edges (coloured by source node type)')
}

onMounted(build)
watch([() => store.visibleEdges.length], build)
</script>

<template>
  <svg ref="svgRef" class="w-full h-full bg-white rounded-lg"></svg>
</template>
