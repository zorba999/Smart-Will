<template>
  <div class="bg-slate-50 rounded-lg p-3">
    <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold">{{ label }}</div>
    <div class="text-lg font-semibold text-slate-900 mt-1">{{ value }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
});
</script>

<script>
export default { name: "Stat" };
</script>
