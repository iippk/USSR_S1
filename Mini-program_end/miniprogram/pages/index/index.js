// index.js - 首页控制台
var i18n = require('../../i18n/i18n.js')
Page({
  data: {
    i18n: {},
    currentLang: 'zh-CN',
    showLangModal: false,
    seatCount: 0,
    availableSeatCount: 0,
    usingSeatCount: 0,
    reservedSeatCount: 0,
    fixSeatCount: 0,
    onlineUserCount: 0,
    isLoggedIn: false,
    userInfo: null,
    todayStudyTime: 0,
    formattedTodayStudyTime: '00:00:00',
    dailyGoalHours: 2,
    showGoalModal: false,
    tempGoalHours: 2,
    announcements: [],
    maintenanceMode: false,
    maintenanceMessage: ''
  },

  seatsWatcher: null,

  onLoad: function () {
    this.applyLanguage();
    this.checkLoginStatus();
    this.getSeatInfo();
    this.loadAnnouncements();
    this.checkMaintenanceMode();
    var savedGoal = wx.getStorageSync('dailyGoalHours');
    if (savedGoal) { this.setData({ dailyGoalHours: Number(savedGoal), tempGoalHours: Number(savedGoal) }); }
  },

  onShow: function () {
    this.applyLanguage();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().applyLanguage();
      this.getTabBar().switchTo(0);
    }
    this.checkLoginStatus();
    this.getSeatInfo();
    this.getUserStats();
    this.loadAnnouncements();
    this.checkMaintenanceMode();
    this.startSeatsWatch();
  },

  onHide: function () { this.stopSeatsWatch(); },

  onUnload: function () { this.stopSeatsWatch(); },

  checkMaintenanceMode: function () {
    var app = getApp();
    var settings = app.globalData.systemSettings;
    if (settings && settings.maintenanceMode) {
      this.setData({ maintenanceMode: true, maintenanceMessage: settings.maintenanceMessage || this.data.i18n.systemMaintenance });
    } else {
      this.setData({ maintenanceMode: false, maintenanceMessage: '' });
    }
  },

  checkLoginStatus: function () {
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    this.setData({ isLoggedIn: !!userInfo, userInfo: userInfo });
  },

  getSeatInfo: function () {
    var that = this;
    wx.cloud.callFunction({
      name: 'initSeats3',
      data: { action: 'getSeats' },
      success: function (res) {
        var seats = res.result && res.result.data ? res.result.data : [];
        that.updateSeatStats(seats);
      },
      fail: function (err) { console.error('获取座位信息失败:', err); }
    });
  },

  updateSeatStats: function (seats) {
    var totalCount = seats.length || 0;
    var availableCount = 0; var usingCount = 0; var fixCount = 0;
    for (var si = 0; si < seats.length; si++) {
      if (seats[si].status === '空闲') availableCount++;
      else if (seats[si].status === '使用中') usingCount++;
      else fixCount++;
    }
    this.setData({
      seatCount: totalCount,
      availableSeatCount: availableCount,
      usingSeatCount: usingCount,
      fixSeatCount: fixCount,
      onlineUserCount: usingCount
    });
  },

  startSeatsWatch: function () {
    var that = this;
    if (this.seatsWatcher) {
      try { this.seatsWatcher.close(); } catch (e) { }
      this.seatsWatcher = null;
    }
    var db = wx.cloud.database();
    try {
      this.seatsWatcher = db.collection('seats').watch({
        onChange: function (snapshot) {
          if (snapshot && Array.isArray(snapshot.docs)) {
            that.updateSeatStats(snapshot.docs);
          }
        },
        onError: function () {
          if (that.seatsWatcher) {
            try { that.seatsWatcher.close(); } catch (e) { }
            that.seatsWatcher = null;
          }
        }
      });
    } catch (e) { }
  },

  stopSeatsWatch: function () {
    if (this.seatsWatcher) {
      try { this.seatsWatcher.close(); } catch (e) { }
      this.seatsWatcher = null;
    }
  },

  getUserStats: function () {
    var that = this;
    var app = getApp();
    if (!app.globalData.userInfo) {
      that.setData({ todayStudyTime: 0, formattedTodayStudyTime: '00:00:00' });
      return;
    }
    wx.cloud.callFunction({
      name: 'getUserStats',
      success: function (res) {
        if (res.result.success) {
          var todayStudyTime = res.result.data.todayStudyTime || 0;
          that.setData({ todayStudyTime: todayStudyTime, formattedTodayStudyTime: that.formatTime(todayStudyTime) });
        }
      },
      fail: function (err) { console.error('获取用户统计失败:', err); }
    });
  },

  loadAnnouncements: function () {
    var that = this;
    var config = require('../../config');
    config.loadAnnouncements(function (data) {
      var now = new Date();
      var active = [];
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
        active.push(a);
      }
      active.sort(function (x, y) {
        if (x.isPinned && !y.isPinned) return -1;
        if (!x.isPinned && y.isPinned) return 1;
        return 0;
      });
      that.setData({ announcements: active });
    });
  },

  formatDateStr: function(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    var h = date.getHours();
    var mi = date.getMinutes();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d) + ' ' + (h < 10 ? '0' + h : h) + ':' + (mi < 10 ? '0' + mi : mi);
  },

  goToAnnouncementList: function () {
    wx.navigateTo({ url: '/pages/announcements/announcements' });
  },

  handleLogin: function () { wx.switchTab({ url: '/pages/mine/mine' }); },

  handleLogout: function () {
    var that = this;
    wx.showModal({
      title: this.data.i18n.logoutConfirm, content: this.data.i18n.logoutContent,
      success: function (res) {
        if (res.confirm) {
          var app = getApp();
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          that.setData({ isLoggedIn: false, userInfo: null, todayStudyTime: 0, formattedTodayStudyTime: '00:00:00' });
          wx.showToast({ title: that.data.i18n.loggedOut, icon: 'success' });
        }
      }
    });
  },

  refreshData: function () {
    var that = this;
    wx.showLoading({ title: this.data.i18n.refreshing });
    that.getSeatInfo();
    that.getUserStats();
    setTimeout(function () {
      wx.hideLoading();
      wx.showToast({ title: that.data.i18n.refreshSuccess, icon: 'success' });
    }, 500);
  },

  formatTime: function (seconds) {
    var s = Number(seconds) || 0;
    var hours = Math.floor(s / 3600);
    var minutes = Math.floor((s % 3600) / 60);
    var secs = s % 60;
    var hh = hours.toString(); var mm = minutes.toString(); var ss = secs.toString();
    if (hh.length < 2) hh = '0' + hh;
    if (mm.length < 2) mm = '0' + mm;
    if (ss.length < 2) ss = '0' + ss;
    return hh + ':' + mm + ':' + ss;
  },

  openGoalModal: function () { this.setData({ showGoalModal: true, tempGoalHours: this.data.dailyGoalHours }); },
  closeGoalModal: function () { this.setData({ showGoalModal: false }); },
  onGoalOverlayTap: function (e) { if (e.target === e.currentTarget) { this.closeGoalModal(); } },
  preventBubble: function () { },
  selectGoal: function (e) {
    var h = Number(e.currentTarget.dataset.hours);
    if (!isNaN(h)) { this.setData({ tempGoalHours: h }); }
  },
  saveGoal: function () {
    var goal = this.data.tempGoalHours;
    wx.setStorageSync('dailyGoalHours', goal);
    this.setData({ dailyGoalHours: goal, showGoalModal: false });
    wx.showToast({ title: this.data.i18n.goalSet + goal + this.data.i18n.hoursPerDay, icon: 'success' });
  },

  applyLanguage: function() {
    var lang = i18n.getCurrentLang()
    var text = i18n.getPageText('index')
    this.setData({ i18n: text, currentLang: lang })
  },

  openLangModal: function() { this.setData({ showLangModal: true }) },
  closeLangModal: function() { this.setData({ showLangModal: false }) },
  onLangOverlayTap: function(e) { if (e.target === e.currentTarget) this.closeLangModal() },
  switchLang: function(e) {
    var lang = e.currentTarget.dataset.lang
    i18n.setLang(lang)
    this.applyLanguage()
    i18n.refreshAllPages()
    this.closeLangModal()
    wx.showToast({ title: i18n.getLangLabel(lang), icon: 'success' })
  }
});
