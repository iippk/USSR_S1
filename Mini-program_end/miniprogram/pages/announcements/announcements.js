var i18n = require('../../i18n/i18n.js')
Page({
  data: {
    i18n: {},
    currentLang: 'zh-CN',
    announcements: [],
    currentAnnouncement: null,
    otherAnnouncements: [],
    scrollTop: 0
  },

  applyLanguage: function() {
    var lang = i18n.getCurrentLang()
    this.setData({ i18n: i18n.getPageText('announcements'), currentLang: lang })
  },

  onLoad: function () {
    this.applyLanguage();
    this.loadAnnouncements();
  },

  onShow: function () {
    this.applyLanguage();
  },

  loadAnnouncements: function () {
    var that = this;
    var config = require('../../config');
    config.loadAnnouncements(function (data) {
      var now = new Date();
      var active = [];
      var typeNames = { notice: that.data.i18n.typeNotice, activity: that.data.i18n.typeActivity, maintenance: that.data.i18n.typeMaintenance, urgent: that.data.i18n.typeUrgent };
      for (var i = 0; i < data.length; i++) {
        var a = data[i];
        if (a.status !== 'active') continue;
        if (a.startTime && new Date(a.startTime) > now) continue;
        if (a.endTime && new Date(a.endTime) < now) continue;
        if (a.createdAt) {
          var ct = a.createdAt;
          if (typeof ct === 'object' && ct.$date) {
            a.createdAt = that.formatDateStr(new Date(ct.$date));
          } else if (ct instanceof Date || (typeof ct === 'string' && ct.indexOf('T') > -1)) {
            a.createdAt = that.formatDateStr(new Date(ct));
          }
        }
        a.typeName = typeNames[a.type] || that.data.i18n.typeNotice;
        active.push(a);
      }
      active.sort(function (x, y) {
        if (x.isPinned && !y.isPinned) return -1;
        if (!x.isPinned && y.isPinned) return 1;
        return 0;
      });

      var current = active.length > 0 ? active[0] : null;
      var others = [];
      for (var j = 1; j < active.length; j++) {
        others.push(active[j]);
      }

      that.setData({
        announcements: active,
        currentAnnouncement: current,
        otherAnnouncements: others
      });
    });
  },

  selectAnnouncement: function (e) {
    var id = e.currentTarget.dataset.id;
    var selected = null;
    var others = [];

    for (var i = 0; i < this.data.announcements.length; i++) {
      if (this.data.announcements[i]._id === id) {
        selected = this.data.announcements[i];
      } else {
        others.push(this.data.announcements[i]);
      }
    }

    if (selected) {
      this.setData({
        currentAnnouncement: selected,
        otherAnnouncements: others,
        scrollTop: 0
      });
    }
  },

  formatDateStr: function (date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    var h = date.getHours();
    var mi = date.getMinutes();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d) + ' ' + (h < 10 ? '0' + h : h) + ':' + (mi < 10 ? '0' + mi : mi);
  }
});
