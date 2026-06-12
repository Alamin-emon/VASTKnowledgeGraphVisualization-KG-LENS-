<script setup>
import { useGraphStore, TYPE_COLORS } from '@/stores/graph'
const store = useGraphStore()

const typeList = Object.keys(TYPE_COLORS)

function nodeCountByType(t) {
  return store.allNodes.filter(n => n.type === t).length
}
</script>

<template>
  <aside class="flex h-full w-64 flex-col border-r border-slate-200 bg-white text-sm shrink-0">
    <!-- Header -->
    <div class="border-b border-slate-200 px-4 py-3">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filters</p>
    </div>

    <!-- Search -->
    <div class="border-b border-slate-200 px-4 py-3">
      <label class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Search</label>
      <input
        v-model="store.searchQuery"
        type="text"
        placeholder="node name or type…"
        class="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
      />
    </div>

    <!-- Task mode -->
    <div class="border-b border-slate-200 px-4 py-3">
      <label class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Analytical task</label>
      <div class="mt-2 flex flex-col gap-1">
        <button
          v-for="task in ['discovery','anomaly','missing']"
          :key="task"
          @click="store.activeTask = task"
          :class="[
            'rounded-md px-3 py-1.5 text-left text-xs font-medium transition',
            store.activeTask === task
              ? task === 'discovery' ? 'bg-indigo-100 text-indigo-700'
                : task === 'anomaly' ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          ]"
        >
          {{ task === 'discovery' ? '🔍 Discovery' : task === 'anomaly' ? '⚠️ Anomalies' : '🕳️ Missing Data' }}
        </button>
      </div>
    </div>

    <!-- Entity types -->
    <div class="border-b border-slate-200 px-4 py-3">
      <label class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Entity types</label>
      <div class="mt-2 flex flex-col gap-1">
        <label
          v-for="t in typeList"
          :key="t"
          class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50"
        >
          <input
            type="checkbox"
            :checked="store.activeTypes.has(t)"
            @change="store.toggleType(t)"
            class="accent-indigo-500"
          />
          <span
            class="h-2.5 w-2.5 rounded-full shrink-0"
            :style="{ background: TYPE_COLORS[t] }"
          ></span>
          <span class="flex-1 text-xs text-slate-700">{{ t }}</span>
          <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {{ nodeCountByType(t) }}
          </span>
        </label>
      </div>
    </div>

    <!-- Confidence -->
    <div class="border-b border-slate-200 px-4 py-3">
      <div class="flex items-center justify-between">
        <label class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Min confidence</label>
        <span class="text-[10px] font-semibold text-indigo-600">{{ Math.round(store.confThreshold * 100) }}%</span>
      </div>
      <input
        type="range" min="0" max="100" step="5"
        :value="store.confThreshold * 100"
        @input="store.confThreshold = $event.target.value / 100"
        class="mt-2 w-full accent-indigo-500"
      />
      <div class="mt-1 flex justify-between text-[9px] text-slate-400">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>

    <!-- Edge legend -->
    <div class="px-4 py-3">
      <label class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Edge types</label>
      <div class="mt-2 flex flex-col gap-1.5">
        <div v-for="[type, color] in [['known','#6366f1'],['uncertain','#94a3b8'],['inferred','#475569'],['anomaly','#ef4444']]"
          :key="type" class="flex items-center gap-2">
          <div class="h-0.5 w-5 shrink-0" :style="{ background: color, borderTop: type === 'inferred' ? `2px dashed ${color}` : 'none', height: type === 'inferred' ? '0' : '2px' }"></div>
          <span class="text-xs capitalize text-slate-600">{{ type }}</span>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="mt-auto border-t border-slate-200 px-4 py-3">
      <label class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Graph stats</label>
      <div class="mt-2 grid grid-cols-2 gap-1.5">
        <div v-for="[k,v] in [['Nodes', store.stats.nodes],['Edges',store.stats.edges],['Clusters',store.stats.clusters],['Anomalies',store.stats.anomalies]]"
          :key="k" class="rounded-md bg-slate-50 px-2 py-1.5 text-center">
          <div class="text-base font-bold text-indigo-600">{{ v }}</div>
          <div class="text-[9px] text-slate-500">{{ k }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>
