<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useGraphStore, DATASETS } from '@/stores/graph'
const store = useGraphStore()
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-0 backdrop-blur h-[52px] flex items-center">
      <div class="mx-auto flex w-full max-w-none items-center gap-4 px-2">
        <div class="flex items-center gap-2.5">
          <span class="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white text-xs font-bold">KG</span>
          <div>
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">VAST 2025 · Design Challenge</p>
            <p class="text-sm font-semibold text-slate-900 leading-tight">KG·LENS — Knowledge Graph Visual Analytics</p>
          </div>
        </div>

        <div class="h-5 w-px bg-slate-200 mx-1"></div>

        <nav class="flex items-center gap-1">
          <RouterLink to="/" class="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition">Dashboard</RouterLink>
          <RouterLink to="/about" class="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition">About</RouterLink>
        </nav>

        <div class="h-5 w-px bg-slate-200 mx-1"></div>

        <!-- Dataset switcher -->
        <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          <button
            v-for="ds in Object.values(DATASETS)" :key="ds.id"
            @click="store.setDataset(ds.id)"
            :class="[
              'rounded-md px-2.5 py-1 text-[10px] font-semibold transition',
              store.datasetId === ds.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            ]"
            :title="ds.label"
          >
            {{ ds.shortLabel }}
          </button>
        </div>

        <!-- Task badge -->
        <div class="ml-auto flex items-center gap-2">
          <span :class="[
            'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
            store.activeTask === 'discovery' ? 'bg-indigo-100 text-indigo-700'
            : store.activeTask === 'anomaly' ? 'bg-red-100 text-red-700'
            : 'bg-emerald-100 text-emerald-700'
          ]">
            {{ store.activeTask === 'discovery' ? '🔍 Discovery'
              : store.activeTask === 'anomaly' ? '⚠️ Anomaly'
              : '🕳️ Missing Data' }}
          </span>
          <span class="text-[10px] text-slate-400">{{ store.stats.nodes }}N · {{ store.stats.edges }}E · {{ store.stats.anomalies }} anomalies</span>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-hidden p-4 md:p-6">
      <RouterView />
    </main>
  </div>
</template>
