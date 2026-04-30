Component({
  data: {
    selected: 0,
    color: '#64748B',
    selectedColor: '#2563EB',
    list: [
      { pagePath: '/pages/index/index', text: '首页', iconPath: '🏠', activeIcon: '🏠' },
      { pagePath: '/pages/seat/seat', text: '座位', iconPath: '🪑', activeIcon: '🪑' },
      { pagePath: '/pages/study/study', text: '学时', iconPath: '⏱', activeIcon: '⏱' },
      { pagePath: '/pages/rank/rank', text: '排行', iconPath: '🏆', activeIcon: '🏆' },
      { pagePath: '/pages/mine/mine', text: '我的', iconPath: '👤', activeIcon: '👤' }
    ],
    animatingIndex: -1
  },

  methods: {
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
