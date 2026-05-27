var i18n = require('../i18n/i18n.js')

function compareVersion(v1, v2) {
  var parts1 = v1.split('.')
  var parts2 = v2.split('.')
  var len = Math.max(parts1.length, parts2.length)
  for (var i = 0; i < len; i++) {
    var n1 = parseInt(parts1[i]) || 0
    var n2 = parseInt(parts2[i]) || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

Component({
  data: {
    selected: 0,
    blurSupported: true,
    list: [
      { pagePath: '/pages/index/index', text: '首页', iconPath: '🏠' },
      { pagePath: '/pages/seat/seat', text: '座位', iconPath: '🪑' },
      { pagePath: '/pages/study/study', text: '学时', iconPath: '⏱' },
      { pagePath: '/pages/rank/rank', text: '排行', iconPath: '🏆' },
      { pagePath: '/pages/mine/mine', text: '我的', iconPath: '👤' }
    ]
  },

  attached: function () {
    this.checkBlurSupport()
    this.applyLanguage()
  },

  pageLifetimes: {
    show: function () {
      this.applyLanguage()
    }
  },

  methods: {
    checkBlurSupport: function () {
      var supported = true
      try {
        var sysInfo = wx.getSystemInfoSync()
        var sdkVersion = sysInfo.SDKVersion || '0.0.0'
        if (compareVersion(sdkVersion, '2.24.0') < 0) {
          supported = false
        }
      } catch (e) {
        supported = false
      }
      this.setData({ blurSupported: supported })
    },

    applyLanguage: function () {
      var lang = i18n.getCurrentLang()
      var tabBarText = i18n.getTabBarText()
      var list = this.data.list
      var keys = ['home', 'seat', 'study', 'rank', 'mine']
      for (var i = 0; i < list.length; i++) {
        if (tabBarText[keys[i]]) {
          list[i].text = tabBarText[keys[i]]
        }
      }
      this.setData({ list: list })
    },

    switchTab: function (e) {
      var index = e.currentTarget.dataset.index
      var item = this.data.list[index]
      if (index === this.data.selected) return
      wx.switchTab({ url: item.pagePath })
    },

    switchTo: function (index) {
      this.setData({ selected: index })
    }
  }
})
