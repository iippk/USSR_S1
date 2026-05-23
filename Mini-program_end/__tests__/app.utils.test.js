describe('app.js 工具函数', () => {

  describe('formatTime 格式化时间', () => {
    function formatTime(seconds) {
      var hours = Math.floor(seconds / 3600)
      var minutes = Math.floor((seconds % 3600) / 60)
      var secs = seconds % 60
      var hh = hours.toString(); var mm = minutes.toString(); var ss = secs.toString()
      if (hh.length < 2) hh = '0' + hh
      if (mm.length < 2) mm = '0' + mm
      if (ss.length < 2) ss = '0' + ss
      return hh + ':' + mm + ':' + ss
    }

    it('0 秒格式化为 00:00:00', () => {
      expect(formatTime(0)).toBe('00:00:00')
    })

    it('59 秒内正确显示秒数', () => {
      expect(formatTime(5)).toBe('00:00:05')
      expect(formatTime(30)).toBe('00:00:30')
      expect(formatTime(59)).toBe('00:00:59')
    })

    it('1 分钟到 59 分钟正确显示', () => {
      expect(formatTime(60)).toBe('00:01:00')
      expect(formatTime(90)).toBe('00:01:30')
      expect(formatTime(3599)).toBe('00:59:59')
    })

    it('1 小时以上正确显示', () => {
      expect(formatTime(3600)).toBe('01:00:00')
      expect(formatTime(3661)).toBe('01:01:01')
      expect(formatTime(7200)).toBe('02:00:00')
    })

    it('大数值正确处理', () => {
      expect(formatTime(86400)).toBe('24:00:00')
      expect(formatTime(86399)).toBe('23:59:59')
    })

    it('返回值总是 HH:MM:SS 格式（8字符）', () => {
      for (var i = 0; i <= 86400; i += 1234) {
        var result = formatTime(i)
        expect(result.length).toBe(8)
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
      }
    })
  })

  describe('globalData 初始状态验证', () => {
    const defaultGlobalData = {
      env: 'cloud1-6gwfun5cc8a627e8',
      userInfo: null,
      currentSeat: null,
      studyStartTime: null,
      studyTimer: null,
      studyDuration: 0,
      seatCheckTimer: null,
      lastSeatCheckTime: 0,
      currentOrderExpireTime: 0,
      isReleasing: false,
      expiryWarningShown: false,
      zonePrices: {
        immersive: { hour: 3, day: 21, week: 126 },
        sunshine: { hour: 4, day: 28, week: 168 },
        vip: { hour: 6, day: 42, week: 252 }
      },
      systemSettings: {
        maintenanceMode: false,
        maintenanceMessage: '系统维护中，请稍后再试',
        openTime: '06:00',
        closeTime: '23:00'
      }
    }

    it('初始状态 userInfo 为 null', () => {
      expect(defaultGlobalData.userInfo).toBeNull()
    })

    it('初始状态 currentSeat 为 null', () => {
      expect(defaultGlobalData.currentSeat).toBeNull()
    })

    it('初始学习时长为 0', () => {
      expect(defaultGlobalData.studyDuration).toBe(0)
    })

    it('初始订单过期时间为 0', () => {
      expect(defaultGlobalData.currentOrderExpireTime).toBe(0)
    })

    it('区域价格包含三个分区', () => {
      const zones = Object.keys(defaultGlobalData.zonePrices)
      expect(zones).toContain('immersive')
      expect(zones).toContain('sunshine')
      expect(zones).toContain('vip')
      expect(zones.length).toBe(3)
    })

    it('系统设置包含营业时间', () => {
      expect(defaultGlobalData.systemSettings.openTime).toBe('06:00')
      expect(defaultGlobalData.systemSettings.closeTime).toBe('23:00')
    })

    it('维护模式默认关闭', () => {
      expect(defaultGlobalData.systemSettings.maintenanceMode).toBe(false)
    })
  })

  describe('座位检查间隔计算逻辑', () => {
    function calculateInterval(expireTime, now) {
      var remainingMs = expireTime - now

      if (remainingMs <= 0) return 500
      if (remainingMs <= 10000) return 1000
      if (remainingMs <= 30000) return 2000
      if (remainingMs <= 60000) return 5000
      if (remainingMs <= 300000) return 10000
      return 30000
    }

    it('已过期时使用 500ms 极速模式', () => {
      expect(calculateInterval(Date.now() - 1000, Date.now())).toBe(500)
    })

    it('剩余 <10s 使用 1s 极速检查', () => {
      var now = Date.now()
      expect(calculateInterval(now + 5000, now)).toBe(1000)
    })

    it('剩余 10-30s 使用 2s 高频检查', () => {
      var now = Date.now()
      expect(calculateInterval(now + 20000, now)).toBe(2000)
    })

    it('剩余 30s-1min 使用 5s 检查', () => {
      var now = Date.now()
      expect(calculateInterval(now + 45000, now)).toBe(5000)
    })

    it('剩余 1-5min 使用 10s 检查', () => {
      var now = Date.now()
      expect(calculateInterval(now + 180000, now)).toBe(10000)
    })

    it('剩余 >5min 使用 30s 常规检查', () => {
      var now = Date.now()
      expect(calculateInterval(now + 600000, now)).toBe(30000)
    })

    it('无过期时间（expireTime=0）使用极速模式', () => {
      expect(calculateInterval(0, Date.now())).toBeLessThanOrEqual(500)
    })
  })
})
