<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { useGraphStore, TYPE_COLORS } from '@/stores/graph'

const store = useGraphStore()
const svgRef = ref(null)

function buildSankey() {
  if (!svgRef.value) return
  const el = svgRef.value
  const W = el.clientWidth || 700
  const H = el.clientHeight || 420
  d3.select(el).selectAll('*').remove()

  const svg = d3.select(el).attr('width', W).attr('height', H)
  const margin = { top: 20, right: 20, bottom: 20, left: 20 }
  const iW = W - margin.left - margin.right
  const iH = H - margin.top - margin.bottom
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // Build source→type→target flow: edgeType → nodeType pairs
  const edges = store.visibleEdges
  const sourceTypes = [...new Set(edges.map(e => {
    const n = store.allNodes.find(n => n.id === e.source)
    return n ? n.type : null
  }).filter(Boolean))]
  const targetTypes = [...new Set(edges.map(e => {
    const n = store.allNodes.find(n => n.id === e.target)
    return n ? n.type : null
  }).filter(Boolean))]
  const allTypes = [...new Set([...sourceTypes, ...targetTypes])]

  // Flow matrix: source type → target type
  const flowMap = {}
  edges.forEach(e => {
    const sn = store.allNodes.find(n => n.id === e.source)
    const tn = store.allNodes.find(n => n.id === e.target)
    if (!sn || !tn) return
    const key = `${sn.type}||${tn.type}`
    flowMap[key] = (flowMap[key] || 0) + 1
  })

  // Sankey layout: left column = source types, right column = target types
  const leftTypes  = [...new Set(Object.keys(flowMap).map(k => k.split('||')[0]))]
  const rightTypes = [...new Set(Object.keys(flowMap).map(k => k.split('||')[1]))]

  const leftTotals  = {}
  const rightTotals = {}
  Object.entries(flowMap).forEach(([k, v]) => {
    const [s, t] = k.split('||')
    leftTotals[s]  = (leftTotals[s]  || 0) + v
    rightTotals[t] = (rightTotals[t] || 0) + v
  })

  const totalFlow = Object.values(flowMap).reduce((a, b) => a + b, 0) || 1
  const nodeH = 28
  const gap   = 10

  function layoutNodes(types, totals, x) {
    let y = 0
    return types.map(t => {
      const h = Math.max(nodeH, (totals[t] / totalFlow) * (iH - gap * (types.length - 1)))
      const node = { type: t, x, y, h }
      y += h + gap
      return node
    })
  }

  const leftNodes  = layoutNodes(leftTypes,  leftTotals,  0)
  const rightNodes = layoutNodes(rightTypes, rightTotals, iW - 120)

  const leftMap  = Object.fromEntries(leftNodes.map(n => [n.type, n]))
  const rightMap = Object.fromEntries(rightNodes.map(n => [n.type, n]))

  // Draw flows
  const flows = Object.entries(flowMap).map(([k, v]) => {
    const [s, t] = k.split('||')
    return { s, t, v }
  })

  // Track used height within each node
  const leftUsed  = {}
  const rightUsed = {}
  leftTypes.forEach(t => leftUsed[t] = 0)
  rightTypes.forEach(t => rightUsed[t] = 0)

  flows.forEach(({ s, t, v }) => {
    const lNode = leftMap[s]
    const rNode = rightMap[t]
    if (!lNode || !rNode) return
    const frac = v / totalFlow
    const fH = frac * (lNode.h)
    const rH = frac * (rNode.h)

    const x0 = lNode.x + 120
    const x1 = rNode.x
    const y0s = lNode.y + leftUsed[s]
    const y1s = lNode.y + leftUsed[s] + fH
    const y0t = rNode.y + rightUsed[t]
    const y1t = rNode.y + rightUsed[t] + rH

    leftUsed[s]  += fH
    rightUsed[t] += rH

    const col = TYPE_COLORS[s] || '#6366f1'
    g.append('path')
      .attr('d', `M${x0},${y0s} C${x0 + (x1-x0)*0.5},${y0s} ${x0 + (x1-x0)*0.5},${y0t} ${x1},${y0t}
                  L${x1},${y1t} C${x0 + (x1-x0)*0.5},${y1t} ${x0 + (x1-x0)*0.5},${y1s} ${x0},${y1s} Z`)
      .attr('fill', col).attr('opacity', 0.35)
      .on('mouseover', function() { d3.select(this).attr('opacity', 0.65) })
      .on('mouseout',  function() { d3.select(this).attr('opacity', 0.35) })
      .append('title').text(`${s} → ${t}: ${v} edge${v > 1 ? 's' : ''}`)
  })

  // Draw left nodes
  leftNodes.forEach(n => {
    g.append('rect')
      .attr('x', n.x).attr('y', n.y)
      .attr('width', 120).attr('height', n.h)
      .attr('fill', TYPE_COLORS[n.type] || '#888')
      .attr('rx', 4).attr('opacity', 0.85)
    g.append('text')
      .attr('x', n.x + 6).attr('y', n.y + n.h / 2)
      .attr('dominant-baseline', 'central')
      .attr('font-size', 11).attr('fill', '#fff').attr('font-weight', 600)
      .text(n.type)
    g.append('text')
      .attr('x', n.x + 116).attr('y', n.y + n.h / 2)
      .attr('dominant-baseline', 'central').attr('text-anchor', 'end')
      .attr('font-size', 9).attr('fill', '#fff').attr('opacity', 0.75)
      .text(leftTotals[n.type])
  })

  // Draw right nodes
  rightNodes.forEach(n => {
    g.append('rect')
      .attr('x', n.x).attr('y', n.y)
      .attr('width', 120).attr('height', n.h)
      .attr('fill', TYPE_COLORS[n.type] || '#888')
      .attr('rx', 4).attr('opacity', 0.85)
    g.append('text')
      .attr('x', n.x + 6).attr('y', n.y + n.h / 2)
      .attr('dominant-baseline', 'central')
      .attr('font-size', 11).attr('fill', '#fff').attr('font-weight', 600)
      .text(n.type)
    g.append('text')
      .attr('x', n.x + 116).attr('y', n.y + n.h / 2)
      .attr('dominant-baseline', 'central').attr('text-anchor', 'end')
      .attr('font-size', 9).attr('fill', '#fff').attr('opacity', 0.75)
      .text(rightTotals[n.type])
  })

  // Title labels
  g.append('text').attr('x', 60).attr('y', -8).attr('text-anchor', 'middle')
    .attr('font-size', 10).attr('fill', '#64748b').attr('font-weight', 600).text('SOURCE TYPE')
  g.append('text').attr('x', iW - 60).attr('y', -8).attr('text-anchor', 'middle')
    .attr('font-size', 10).attr('fill', '#64748b').attr('font-weight', 600).text('TARGET TYPE')
}

onMounted(buildSankey)
watch([() => store.visibleEdges.length], buildSankey)
</script>

<template>
  <svg ref="svgRef" class="w-full h-full"></svg>
</template>
