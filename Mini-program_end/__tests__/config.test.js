const config = require('../miniprogram/config.js')

describe('config.js 配置模块', () => {
  describe('默认区域价格', () => {
    it('导出 DEFAULT_ZONE_PRICES 对象', () => {
      expect(config.DEFAULT_ZONE_PRICES).toBeDefined()
      expect(typeof config.DEFAULT_ZONE_PRICES).toBe('object')
    })

    it('包含沉浸区价格配置', () => {
      const immersive = config.DEFAULT_ZONE_PRICES.immersive
      expect(immersive).toBeDefined()
      expect(immersive.hour).toBe(3)
      expect(immersive.day).toBe(21)
      expect(immersive.week).toBe(126)
    })

    it('包含阳光区价格配置', () => {
      const sunshine = config.DEFAULT_ZONE_PRICES.sunshine
      expect(sunshine).toBeDefined()
      expect(sunshine.hour).toBe(4)
      expect(sunshine.day).toBe(28)
      expect(sunshine.week).toBe(168)
    })

    it('包含 VIP 区价格配置', () => {
      const vip = config.DEFAULT_ZONE_PRICES.vip
      expect(vip).toBeDefined()
      expect(vip.hour).toBe(6)
      expect(vip.day).toBe(42)
      expect(vip.week).toBe(252)
    })

    it('日价格 = 小时价格 × 7', () => {
      Object.keys(config.DEFAULT_ZONE_PRICES).forEach(zone => {
        const zoneConfig = config.DEFAULT_ZONE_PRICES[zone]
        expect(zoneConfig.day).toBe(zoneConfig.hour * 7)
      })
    })

    it('周价格 = 日价格 × 6', () => {
      Object.keys(config.DEFAULT_ZONE_PRICES).forEach(zone => {
        const zoneConfig = config.DEFAULT_ZONE_PRICES[zone]
        expect(zoneConfig.week).toBe(zoneConfig.day * 6)
      })
    })

    it('VIP 价格 > 阳光区 > 沉浸区', () => {
      const { immersive, sunshine, vip } = config.DEFAULT_ZONE_PRICES
      expect(vip.hour).toBeGreaterThan(sunshine.hour)
      expect(sunshine.hour).toBeGreaterThan(immersive.hour)
    })
  })

  describe('默认系统设置', () => {
    it('导出 DEFAULT_SYSTEM_SETTINGS 对象', () => {
      expect(config.DEFAULT_SYSTEM_SETTINGS).toBeDefined()
      expect(typeof config.DEFAULT_SYSTEM_SETTINGS).toBe('object')
    })

    it('维护模式默认关闭', () => {
      expect(config.DEFAULT_SYSTEM_SETTINGS.maintenanceMode).toBe(false)
    })

    it('包含默认维护消息', () => {
      expect(config.DEFAULT_SYSTEM_SETTINGS.maintenanceMessage).toBe('系统维护中，请稍后再试')
    })

    it('包含营业时间设置', () => {
      expect(config.DEFAULT_SYSTEM_SETTINGS.openTime).toBe('06:00')
      expect(config.DEFAULT_SYSTEM_SETTINGS.closeTime).toBe('23:00')
    })
  })

  describe('模块导出', () => {
    it('导出 loadZonePrices 函数', () => {
      expect(typeof config.loadZonePrices).toBe('function')
    })

    it('导出 loadAnnouncements 函数', () => {
      expect(typeof config.loadAnnouncements).toBe('function')
    })

    it('导出 loadSystemSettings 函数', () => {
      expect(typeof config.loadSystemSettings).toBe('function')
    })

    it('enableMockPay 默认为 true', () => {
      expect(config.enableMockPay).toBe(true)
    })
  })
})
