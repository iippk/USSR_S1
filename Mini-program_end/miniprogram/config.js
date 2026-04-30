var DEFAULT_ZONE_PRICES = {
  immersive: { hour: 3, day: 21, week: 126 },
  sunshine: { hour: 4, day: 28, week: 168 },
  vip: { hour: 6, day: 42, week: 252 }
}

var DEFAULT_SYSTEM_SETTINGS = {
  maintenanceMode: false,
  maintenanceMessage: '系统维护中，请稍后再试',
  openTime: '06:00',
  closeTime: '23:00'
}

function loadZonePrices(callback) {
  wx.cloud.callFunction({
    name: 'getSettings',
    data: { action: 'getZonePrices' },
    success: function(res) {
      if (res.result && res.result.success && res.result.data) {
        if (callback) callback(res.result.data)
      } else {
        if (callback) callback(DEFAULT_ZONE_PRICES)
      }
    },
    fail: function() {
      if (callback) callback(DEFAULT_ZONE_PRICES)
    }
  })
}

function loadAnnouncements(callback) {
  wx.cloud.callFunction({
    name: 'getSettings',
    data: { action: 'getAnnouncements' },
    success: function(res) {
      if (res.result && res.result.success && res.result.data) {
        if (callback) callback(res.result.data)
      } else {
        if (callback) callback([])
      }
    },
    fail: function() {
      if (callback) callback([])
    }
  })
}

function loadSystemSettings(callback) {
  wx.cloud.callFunction({
    name: 'getSettings',
    data: { action: 'getSettings' },
    success: function(res) {
      if (res.result && res.result.success && res.result.data) {
        var data = res.result.data
        var settings = {
          maintenanceMode: data.maintenanceMode || false,
          maintenanceMessage: data.maintenanceMessage || DEFAULT_SYSTEM_SETTINGS.maintenanceMessage,
          openTime: data.openTime || DEFAULT_SYSTEM_SETTINGS.openTime,
          closeTime: data.closeTime || DEFAULT_SYSTEM_SETTINGS.closeTime
        }
        if (callback) callback(settings)
      } else {
        if (callback) callback(DEFAULT_SYSTEM_SETTINGS)
      }
    },
    fail: function() {
      if (callback) callback(DEFAULT_SYSTEM_SETTINGS)
    }
  })
}

module.exports = {
  enableMockPay: true,
  subscribeTemplateIdExpireReminder: '',
  DEFAULT_ZONE_PRICES: DEFAULT_ZONE_PRICES,
  DEFAULT_SYSTEM_SETTINGS: DEFAULT_SYSTEM_SETTINGS,
  loadZonePrices: loadZonePrices,
  loadAnnouncements: loadAnnouncements,
  loadSystemSettings: loadSystemSettings
}
