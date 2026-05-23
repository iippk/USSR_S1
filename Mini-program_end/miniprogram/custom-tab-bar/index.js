var i18n = require('../i18n/i18n.js')
Component({
  data: {
    selected: 0,
    color: '#64748B',
    selectedColor: '#2563EB',
    currentLang: 'zh-CN',
    list: [
      { pagePath: '/pages/index/index', text: '首页', iconPath: '🏠', activeIcon: '🏠' },
      { pagePath: '/pages/seat/seat', text: '座位', iconPath: '🪑', activeIcon: '🪑' },
      { pagePath: '/pages/study/study', text: '学时', iconPath: '⏱', activeIcon: '⏱' },
      { pagePath: '/pages/rank/rank', text: '排行', iconPath: '🏆', activeIcon: '🏆' },
      { pagePath: '/pages/mine/mine', text: '我的', iconPath: '👤', activeIcon: '👤' }
    ],
    animatingIndex: -1
  },

  attached: function() {
    this.applyLanguage();
  },

  pageLifetimes: {
    show: function() {
      this.applyLanguage();
    }
  },

  methods: {
    applyLanguage: function() {
      var lang = i18n.getCurrentLang()
      var tabBarText = i18n.getTabBarText()
      var list = this.data.list
      var keys = ['home', 'seat', 'study', 'rank', 'mine']
      for (var i = 0; i < list.length; i++) {
        if (tabBarText[keys[i]]) {
          list[i].text = tabBarText[keys[i]]
        }
      }
      this.setData({ list: list, currentLang: lang })
    },

    switchTab: function(e) {
      var index = e.currentTarget.dataset.index;
      var item = this.data.list[index];
      var url = item.pagePath;

      if (index === this.data.selected) return;

      this.setData({ animatingIndex: index });

      wx.switchTab({ url: url });
    }
  }
});
