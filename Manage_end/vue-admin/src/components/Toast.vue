<template>
  <div v-if="show" class="toast" :class="type">{{ message }}</div>
</template>

<script setup>
defineProps({
  message: String,
  type: { type: String, default: "info" },
  show: Boolean,
});
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  padding: 14px 22px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-modal);
  z-index: 100000;
  animation: slideIn 0.25s ease-out;
  max-width: 380px;
  font: 500 14px/1.4 var(--font-family);
  border-left: 4px solid var(--color-primary);
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  border-left-color: var(--color-success);
}

.toast.error {
  border-left-color: var(--color-error);
}

.toast.warning {
  border-left-color: var(--color-warning);
}
</style>
