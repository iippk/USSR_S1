import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Seats from '../views/Seats.vue'
import Orders from '../views/Orders.vue'
import Users from '../views/Users.vue'
import Logs from '../views/Logs.vue'
import Coupons from '../views/Coupons.vue'
import Announcements from '../views/Announcements.vue'
import Settings from '../views/Settings.vue'
import DataScreen from '../views/DataScreen.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: '数据概览', icon: '📊', group: 'main' }
  },
  {
    path: '/datascreen',
    name: 'DataScreen',
    component: DataScreen,
    meta: { title: '可视化大屏', icon: '🖥️', group: 'main', fullscreen: true }
  },
  {
    path: '/seats',
    name: 'Seats',
    component: Seats,
    meta: { title: '座位管理', icon: '🪑', group: 'main' }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: Orders,
    meta: { title: '订单记录', icon: '📋', group: 'main' }
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { title: '用户管理', icon: '👥', group: 'main' }
  },
  {
    path: '/coupons',
    name: 'Coupons',
    component: Coupons,
    meta: { title: '优惠券管理', icon: '🎫', group: 'operation' }
  },
  {
    path: '/announcements',
    name: 'Announcements',
    component: Announcements,
    meta: { title: '公告管理', icon: '📢', group: 'operation' }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: Logs,
    meta: { title: '操作日志', icon: '📝', group: 'system' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: '系统设置', icon: '⚙️', group: 'system' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
