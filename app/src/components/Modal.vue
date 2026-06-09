<template>
  <div class="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
});
defineEmits(["close"]);
</script>

<script>
export default { name: "Modal" };
</script>
