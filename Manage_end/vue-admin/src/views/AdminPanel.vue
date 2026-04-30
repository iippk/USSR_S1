<template>
  <div class="admin-layout" v-if="!isFullscreen">
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">🎓</div>
          <div v-if="!isCollapsed" class="logo-text">
            <span class="logo-title">USSR</span>
            <span class="logo-sub">Admin</span>
          </div>
        </div>
        <button class="collapse-btn" @click="toggleSidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path v-if="!isCollapsed" d="M11 2L5 8L11 14" />
            <path v-else d="M5 2L11 8L5 14" />
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <template v-for="(group, groupKey) in groupedRoutes" :key="groupKey">
          <div v-if="!isCollapsed" class="nav-group-label">{{ group.label }}</div>
          <router-link 
            v-for="route in group.routes" 
            :key="route.path"
            :to="route.path"
            class="nav-item"
            active-class="active"
          >
            <span class="nav-icon">{{ route.meta.icon }}</span>
            <span v-if="!isCollapsed" class="nav-text">{{ route.meta.title }}</span>
          </router-link>
        </template>
      </nav>

      <div v-if="!isCollapsed" class="sidebar-footer">
        <div class="version-info">v2.0 · Vue3</div>
      </div>
    </aside>

    <div class="main-content" :class="{ collapsed: isCollapsed }">
      <header class="top-header">
        <div class="header-left">
          <button class="mobile-menu-btn" @click="toggleSidebar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          </button>
          <div class="breadcrumb">
            <span class="current-page">{{ currentPageTitle }}</span>
          </div>
        </div>
        
        <div class="header-right">
          <div class="sync-indicator" :class="{ active: syncActive }">
            <span class="sync-dot"></span>
            {{ syncMessage }}
          </div>
          <button class="logout-btn" @click="handleLogout">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H6" />
              <polyline points="9,5 12,8 9,11" />
              <line x1="12" y1="8" x2="5" y2="8" />
            </svg>
            退出
          </button>
        </div>
      </header>

      <main class="content-area">
        <router-view @sync="handleSync" />
      </main>
    </div>
  </div>
  <router-view v-else @sync="handleSync" />
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const emit = defineEmits(['logout'])
const toast = inject('toast')
const router = useRouter()
const route = useRoute()

const isCollapsed = ref(false)
const syncActive = ref(false)
const syncMessage = ref('已连接')

const isFullscreen = computed(() => {
  return route.meta?.fullscreen === true
})

const menuRoutes = computed(() => {
  return router.getRoutes().filter(r => r.meta && r.meta.title)
})

const groupedRoutes = computed(() => {
  const groups = {
    main: { label: '核心功能', routes: [] },
    operation: { label: '运营管理', routes: [] },
    system: { label: '系统管理', routes: [] }
  }
  menuRoutes.value.forEach(r => {
    const group = r.meta.group || 'main'
    if (groups[group]) groups[group].routes.push(r)
  })
  return groups
})

const currentPageTitle = computed(() => {
  return route.meta?.title || '数据概览'
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleSync = () => {
  syncActive.value = true
  syncMessage.value = '已同步'
  setTimeout(() => {
    syncActive.value = false
    syncMessage.value = '已连接'
  }, 3000)
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.removeItem('isAdminLoggedIn')
    localStorage.removeItem('loginTime')
    toast.showToastMessage('已退出登录', 'success')
    emit('logout')
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}

.sidebar {
  width: 240px;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;
  box-shadow: 2px 0 8px rgba(74, 144, 226, 0.06);
  border-right: 1px solid var(--color-border-light);
}

.sidebar.collapsed {
  width: 68px;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 72px;
  border-bottom: 1px solid var(--color-border-light);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.logo-text {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
}

.logo-title {
  font: 700 16px/1.2 var(--font-family);
  color: var(--color-primary);
}

.logo-sub {
  font: 400 11px/1 var(--font-family);
  color: var(--color-text-aux);
}

.collapse-btn {
  background: none;
  border: none;
  color: var(--color-text-aux);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  overflow-y: auto;
}

.nav-group-label {
  padding: 16px 14px 6px;
  font: 500 11px/1 var(--font-family);
  color: var(--color-text-aux);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  margin-bottom: 4px;
  color: var(--color-text-body);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
  position: relative;
  font: 500 14px/1 var(--font-family);
}

.nav-item:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.nav-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 4px 4px 0;
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
  text-align: center;
  width: 22px;
}

.nav-text {
  white-space: nowrap;
  transition: opacity var(--transition-normal);
}

.sidebar.collapsed .nav-text {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border-light);
  text-align: center;
}

.version-info {
  font: var(--font-small);
  color: var(--color-text-aux);
}

.main-content {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left var(--transition-normal);
}

.main-content.collapsed {
  margin-left: 68px;
}

.top-header {
  background: var(--color-surface);
  padding: 0 28px;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(74, 144, 226, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--color-border-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.breadcrumb {
  font: var(--font-h2);
  color: var(--color-text-primary);
}

.current-page {
  color: var(--color-text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-success-bg);
  color: var(--color-success);
  padding: 6px 14px;
  border-radius: 20px;
  font: 500 12px/1 var(--font-family);
}

.sync-indicator.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.sync-dot {
  width: 6px;
  height: 6px;
  background: var(--color-success);
  border-radius: 50%;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-body);
  padding: 7px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font: 500 13px/1 var(--font-family);
  transition: all var(--transition-normal);
}

.logout-btn:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: var(--color-error-bg);
}

.logout-btn:active {
  transform: scale(0.98);
}

.content-area {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 68px;
  }

  .sidebar .nav-text,
  .sidebar .logo-text,
  .sidebar .version-info {
    display: none;
  }

  .main-content {
    margin-left: 68px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform var(--transition-normal);
    width: 240px;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .mobile-menu-btn {
    display: flex;
  }
}
</style>
