<script setup>
import { useGraphStore, TYPE_COLORS } from '@/stores/graph'
const store = useGraphStore()

const confColor = (c) => c >= 0.8 ? 'text-emerald-600' : c >= 0.5 ? 'text-amber-600' : 'text-red-500'
const confBg    = (c) => c >= 0.8 ? 'bg-emerald-500'  : c >= 0.5 ? 'bg-amber-500'  : 'bg-red-500'
</script>

<template>
  <aside class="flex h-full w-64 shrink-0 flex-col border-l border-slate-200 bg-white text-sm overflow-y-auto">
    <!-- Header -->
    <div class="border-b border-slate-200 px-4 py-3">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Node Details</p>
    </div>

    <!-- Empty state -->
    <div v-if="!store.selectedNode" class="flex flex-1 flex-col items-center justify-center p-6 text-center text-slate-400">
      <svg class="mb-3 h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" stroke-width="1.5"/>
        <path stroke-width="1.5" d="M12 8v4m0 4h.01"/>
      </svg>
      <p class="text-xs">Click any node<br>to inspect its properties</p>
    </div>

    <template v-else>
      <!-- Node header -->
      <div class="border-b border-slate-200 px-4 py-3">
        <div class="flex items-start gap-2">
          <span
            class="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full"
            :style="{ background: TYPE_COLORS[store.selectedNode.type] }"
          ></span>
          <div>
            <h3 class="font-semibold text-slate-900 leading-tight">{{ store.selectedNode.label }}</h3>
            <p class="text-[11px] text-slate-500">{{ store.selectedNode.type }} · {{ store.selectedNode.id }}</p>
          </div>
        </div>
        <div v-if="store.selectedNode.anomaly" class="mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></span>
          <span class="text-[11px] font-medium text-red-600">Anomalous entity</span>
        </div>
      </div>

      <!-- Confidence -->
      <div class="border-b border-slate-200 px-4 py-3">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Confidence</span>
          <span :class="['text-xs font-bold', confColor(store.selectedNode.conf)]">
            {{ Math.round(store.selectedNode.conf * 100) }}%
          </span>
        </div>
        <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            :class="['h-full rounded-full transition-all', confBg(store.selectedNode.conf)]"
            :style="{ width: (store.selectedNode.conf * 100) + '%' }"
          ></div>
        </div>
      </div>

      <!-- Attributes -->
      <div class="border-b border-slate-200 px-4 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Attributes</p>
        <dl class="mt-2 space-y-2">
          <div v-for="[k, v] in Object.entries(store.selectedNode.attrs)" :key="k">
            <dt class="text-[9px] uppercase tracking-wider text-slate-400">{{ k }}</dt>
            <dd :class="['text-xs', v === null ? 'italic text-red-400' : 'text-slate-700']">
              {{ v === null ? '⚠ not available' : v }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Attribute coverage heatmap -->
      <div class="border-b border-slate-200 px-4 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Attribute coverage</p>
        <div class="flex gap-0.5 flex-wrap">
          <div
            v-for="[k, v] in Object.entries(store.selectedNode.attrs)"
            :key="k"
            :title="`${k}: ${v ?? 'missing'}`"
            :class="['h-5 w-5 rounded-sm text-[8px] flex items-center justify-center', v === null ? 'bg-red-100 text-red-400' : 'bg-indigo-100 text-indigo-600']"
          >{{ k.slice(0,2) }}</div>
        </div>
        <p class="mt-1 text-[9px] text-slate-400">
          {{ Object.values(store.selectedNode.attrs).filter(v => v !== null).length }}/{{ Object.keys(store.selectedNode.attrs).length }} attributes present
        </p>
      </div>

      <!-- Neighbors -->
      <div class="px-4 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Connections ({{ store.nodeNeighbors.length }})
        </p>
        <div class="mt-2 space-y-1">
          <button
            v-for="nb in store.nodeNeighbors"
            :key="nb.node.id"
            @click="store.selectNode(nb.node.id)"
            class="flex w-full items-center gap-2 rounded-md border border-slate-100 px-2 py-1.5 text-left hover:border-indigo-200 hover:bg-indigo-50 transition"
          >
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: TYPE_COLORS[nb.node.type] }"></span>
            <span class="flex-1 truncate text-xs text-slate-700">{{ nb.node.label }}</span>
            <span class="text-[9px] text-slate-400">{{ nb.rel }}</span>
            <span :class="['text-[9px]', nb.conf >= 0.7 ? 'text-emerald-500' : 'text-amber-500']">
              {{ Math.round(nb.conf * 100) }}%
            </span>
          </button>
        </div>
      </div>
    </template>
  </aside>
</template>
