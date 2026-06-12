<script setup>
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import { useGraphStore, TYPE_COLORS } from '@/stores/graph'

const store = useGraphStore()
const svgRef = ref(null)

function build() {
  if (!svgRef.value) return
  const el = svgRef.value
  const W = el.clientWidth || 700
  const H = el.clientHeight || 420
  d3.select(el).selectAll('*').remove()

  const svg = d3.select(el).attr('width', W).attr('height', H)

  // Simple equirectangular projection from lat/lng
  const projection = d3.geoEquirectangular()
    .scale(W / 6.5)
    .translate([W / 2, H / 2 + 30])

  // World map simplified as background rectangles per continent
  const continentBoxes = [
    { name: 'Europe',     fill: '#f0f4ff', bounds: [[-25, 35], [40, 71]] },
    { name: 'N.America',  fill: '#f0fff4', bounds: [[-170, 15], [-50, 75]] },
    { name: 'Africa',     fill: '#fffbeb', bounds: [[-18, -35], [52, 38]] },
    { name: 'Asia',       fill: '#fdf4ff', bounds: [[25, 0],  [180, 75]] },
    { name: 'S.America',  fill: '#f0f9ff', bounds: [[-82, -56], [-34, 15]] },
  ]

  continentBoxes.forEach(c => {
    const [tl, br] = c.bounds
    const [x0, y0] = projection([tl[0], br[1]])
    const [x1, y1] = projection([br[0], tl[1]])
    svg.append('rect')
      .attr('x', x0).attr('y', y0).attr('width', x1 - x0).attr('height', y1 - y0)
      .attr('fill', c.fill).attr('rx', 4)
      .attr('stroke', '#e2e8f0').attr('stroke-width', 0.5)
    svg.append('text')
      .attr('x', (x0 + x1) / 2).attr('y', y0 + 12)
      .attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', '#94a3b8')
      .text(c.name)
  })

  // Draw edge arcs between nodes that have coordinates
  const geoNodes = store.visibleNodes.filter(n => n.lat !== 0 || n.lng !== 0)
  const geoIds = new Set(geoNodes.map(n => n.id))

  store.visibleEdges
    .filter(e => geoIds.has(e.source) && geoIds.has(e.target))
    .forEach(e => {
      const sn = geoNodes.find(n => n.id === e.source)
      const tn = geoNodes.find(n => n.id === e.target)
      if (!sn || !tn) return
      const [x0, y0] = projection([sn.lng, sn.lat])
      const [x1, y1] = projection([tn.lng, tn.lat])
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.3

      svg.append('path')
        .attr('d', `M${x0},${y0} Q${mx},${my} ${x1},${y1}`)
        .attr('fill', 'none')
        .attr('stroke', e.type === 'anomaly' ? '#fca5a5' : '#c7d2fe')
        .attr('stroke-width', Math.max(0.5, e.conf * 2))
        .attr('stroke-dasharray', e.type === 'inferred' ? '4,3' : null)
        .attr('opacity', 0.6)
        .append('title').text(`${sn.label} → ${tn.label}: ${e.rel}`)
    })

  // Draw grouped node bubbles per location
  const locGroups = {}
  geoNodes.forEach(n => {
    const key = `${n.lat},${n.lng}`
    if (!locGroups[key]) locGroups[key] = { lat: n.lat, lng: n.lng, nodes: [] }
    locGroups[key].nodes.push(n)
  })

  Object.values(locGroups).forEach(({ lat, lng, nodes }) => {
    const [px, py] = projection([lng, lat])
    const r = Math.max(10, Math.sqrt(nodes.length) * 7)

    // Pie chart per location
    const typeCounts = {}
    nodes.forEach(n => typeCounts[n.type] = (typeCounts[n.type] || 0) + 1)
    const pie = d3.pie().sort(null).value(d => d[1])
    const arc = d3.arc().innerRadius(0).outerRadius(r)
    const pieData = pie(Object.entries(typeCounts))

    const locG = svg.append('g').attr('transform', `translate(${px},${py})`)

    pieData.forEach(slice => {
      locG.append('path')
        .attr('d', arc(slice))
        .attr('fill', TYPE_COLORS[slice.data[0]] || '#888')
        .attr('stroke', 'white').attr('stroke-width', 0.5)
        .attr('opacity', 0.85)
    })

    // Location label
    const locationName = nodes.find(n => n.type === 'Location')?.label ||
      nodes[0].attrs?.location || `${lat.toFixed(1)},${lng.toFixed(1)}`
    locG.append('text')
      .attr('text-anchor', 'middle').attr('dy', r + 11)
      .attr('font-size', 8.5).attr('fill', '#334155').attr('font-weight', 500)
      .text(locationName)
    locG.append('text')
      .attr('text-anchor', 'middle').attr('dy', r + 21)
      .attr('font-size', 7.5).attr('fill', '#94a3b8')
      .text(`${nodes.length} entit${nodes.length > 1 ? 'ies' : 'y'}`)

    // Click selects first node in group
    locG.attr('cursor', 'pointer').on('click', () => store.selectNode(nodes[0].id))
  })

  // Legend
  const legG = svg.append('g').attr('transform', `translate(10, 10)`)
  const legendTypes = [...new Set(store.visibleNodes.map(n => n.type))]
  legendTypes.forEach((t, i) => {
    legG.append('circle').attr('cx', 5).attr('cy', i * 14).attr('r', 4)
      .attr('fill', TYPE_COLORS[t]).attr('opacity', 0.85)
    legG.append('text').attr('x', 13).attr('y', i * 14)
      .attr('dominant-baseline', 'central').attr('font-size', 8).attr('fill', '#475569').text(t)
  })

  // Title
  svg.append('text').attr('x', W / 2).attr('y', 14).attr('text-anchor', 'middle')
    .attr('font-size', 10).attr('fill', '#94a3b8')
    .text('Pie charts show entity-type distribution per geographic location · Nodes without coordinates not shown')
}

onMounted(build)
watch([() => store.visibleNodes.length, () => store.visibleEdges.length], build)
</script>

<template>
  <svg ref="svgRef" class="w-full h-full bg-white rounded-lg"></svg>
</template>
