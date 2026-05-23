import { describe, it, expect } from 'vitest'
import router from '../../src/router/index.js'

describe('路由配置', () => {
  it('路由配置已定义且非空', () => {
    expect(router.getRoutes().length).toBeGreaterThan(0)
  })

  it('根路径 "/" 重定向到 /dashboard', () => {
    const routes = router.getRoutes()
    const rootRoute = routes.find(r => r.path === '/')
    expect(rootRoute).toBeDefined()
    expect(rootRoute.redirect).toBe('/dashboard')
  })

  it('包含所有预期的页面路由', () => {
    const paths = router.getRoutes().map(r => r.path)
    const expectedPaths = [
      '/dashboard',
      '/datascreen',
      '/seats',
      '/orders',
      '/users',
      '/coupons',
      '/announcements',
      '/logs',
      '/settings'
    ]
    expectedPaths.forEach(path => {
      expect(paths).toContain(path)
    })
  })

  it('每个路由都有 name 和 meta 信息', () => {
    const namedRoutes = router.getRoutes().filter(r => r.name)
    namedRoutes.forEach(route => {
      if (route.name && route.name !== 'Dashboard' || route.path !== '/') {
        expect(route.meta).toBeDefined()
        expect(route.meta.title).toBeDefined()
        expect(route.meta.icon).toBeDefined()
      }
    })
  })

  it('Dashboard 路由元信息正确', () => {
    const dashboardRoute = router.getRoutes().find(r => r.name === 'Dashboard')
    expect(dashboardRoute.meta.title).toBe('数据概览')
    expect(dashboardRoute.meta.group).toBe('main')
  })

  it('系统设置路由属于 system 分组', () => {
    const settingsRoute = router.getRoutes().find(r => r.name === 'Settings')
    expect(settingsRoute.meta.group).toBe('system')
  })

  it('运营管理路由属于 operation 分组', () => {
    const routes = router.getRoutes()
    const couponsRoute = routes.find(r => r.name === 'Coupons')
    const announcementsRoute = routes.find(r => r.name === 'Announcements')

    expect(couponsRoute.meta.group).toBe('operation')
    expect(announcementsRoute.meta.group).toBe('operation')
  })

  it('使用 Hash 模式', () => {
    const options = router.options
    expect(options.history).toBeDefined()
    expect(router.options.history.base).toBe('/#')
    const routes = router.getRoutes()
    expect(routes.length).toBeGreaterThan(0)
  })
})
