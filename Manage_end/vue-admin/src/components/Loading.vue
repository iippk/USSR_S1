<template>
  <div v-if="show" class="loading-overlay">
    <div class="loading-spinner"></div>
  </div>
</template>

<script setup>
defineProps({ show: Boolean });
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(245, 249, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-light);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
