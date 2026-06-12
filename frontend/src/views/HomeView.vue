<script setup>
import { ref } from 'vue'
import SidebarFilters  from '@/components/SidebarFilters.vue'
import NodeDetail      from '@/components/NodeDetail.vue'
import NodeLinkDiagram from '@/components/viz/NodeLinkDiagram.vue'
import SankeyDiagram   from '@/components/viz/SankeyDiagram.vue'
import ConnectedComponents from '@/components/viz/ConnectedComponents.vue'
import EgoNetwork      from '@/components/viz/EgoNetwork.vue'
import SpatialView     from '@/components/viz/SpatialView.vue'
import TemporalView    from '@/components/viz/TemporalView.vue'
import { useGraphStore } from '@/stores/graph'

const store = useGraphStore()
const expandedPanel = ref(null)

const panels = [
  { key: 'nodelink',    title: 'Node-Link Diagram',      subtitle: 'Force-directed graph · D3.js novel viz',         comp: NodeLinkDiagram  },
  { key: 'sankey',      title: 'Sankey Diagram',          subtitle: 'Flow of relationships between entity types',      comp: SankeyDiagram    },
  { key: 'components',  title: 'Connected Components',    subtitle: 'Bubble pack · community structure',               comp: ConnectedComponents },
  { key: 'ego',         title: 'Ego Network',             subtitle: '1-hop & 2-hop neighbourhood of selected node',    comp: EgoNetwork       },
  { key: 'spatial',     title: 'Spatial / Geographic',    subtitle: 'Entity distribution on world map',                comp: SpatialView      },
  { key: 'temporal',    title: 'Temporal View',           subtitle: 'Edge activity over time',                         comp: TemporalView     },
]

function toggleExpand(key) {
  expandedPanel.value = expandedPanel.value === key ? null : key
}
</script>

<template>
  <!-- Full-height workspace: sidebar | main | detail -->
  <div class="flex h-[calc(100vh-52px)] overflow-hidden -m-4 md:-m-6">
    <SidebarFilters />

    <!-- Centre: grid of panels -->
    <main class="flex flex-1 flex-col overflow-auto bg-slate-100 p-4 gap-4">

      <!-- Expanded single panel -->
      <template v-if="expandedPanel">
        <div v-for="p in panels" :key="p.key">
          <div v-if="p.key === expandedPanel"
            class="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            style="height: calc(100vh - 110px)">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{{ p.subtitle }}</p>
                <h3 class="text-sm font-semibold text-slate-800">{{ p.title }}</h3>
              </div>
              <button @click="toggleExpand(p.key)"
                class="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 transition">
                ↙ Collapse
              </button>
            </div>
            <div class="flex-1 p-3">
              <component :is="p.comp" class="w-full h-full" />
            </div>
          </div>
        </div>
      </template>

      <!-- 2-column grid of all panels -->
      <template v-else>
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div v-for="p in panels" :key="p.key"
            class="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{{ p.subtitle }}</p>
                <h3 class="text-sm font-semibold text-slate-800">{{ p.title }}</h3>
              </div>
              <button @click="toggleExpand(p.key)"
                class="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 transition">
                ↗ Expand
              </button>
            </div>
            <div class="p-3" style="height: 320px;">
              <component :is="p.comp" class="w-full h-full" />
            </div>
          </div>
        </div>
      </template>
    </main>

    <NodeDetail />
  </div>
</template>
