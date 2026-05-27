// study.js - 学时统计页面 · Session模型 v2.1 (修复版)
var i18n = require('../../i18n/i18n.js')
Page({
  data: {
    i18n: {},
    currentLang: 'zh-CN',
    currentStudyTime: '00:00:00',
    isStudying: false,
    sessionActive: false,
    currentSeat: null,
    studyRecords: [],
    pagedRecords: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 5,
    isLoading: true,
    totalStudyTime: 0,
    todayStudyTime: 0,
    weekStudyTime: 0,
    monthStudyTime: 0,
    studyCount: 0,
    formattedTotalStudyTime: '00:00:00',
    formattedTodayStudyTime: '00:00:00',
    formattedWeekStudyTime: '00:00:00',
    formattedMonthStudyTime: '00:00:00',
    remainingStudyTime: '00:00:00',
    autoReleaseTime: '',
    updateTimer: null,
    expireCheckTimer: null,
    showExtendModal: false,
    extendPlanType: 'hour',
    extendQuantityIndex: 0,
    extendQuantityOptions: [],
    extendUnitText: '小时',
    extendUnitPrice: 3,
    extendTotalPrice: 3,
    extendDayPrice: 21,
    extendWeekPrice: 126,
    currentOrderInfo: null,
    extendAvailableCoupons: [],
    extendSelectedCouponId: '',
    extendSelectedCoupon: null,
    extendFinalPrice: 3,
    showExtendCouponList: false,
    extendExpireDate: '',
    hwDoorOn: false,
    hwLightOn: false,
    hwACOn: false,
    zonePrices: {
      immersive: { hour: 3, day: 21, week: 126 },
      sunshine: { hour: 4, day: 28, week: 168 },
      vip: { hour: 6, day: 42, week: 252 }
    }
  },

  applyLanguage: function() {
    var lang = i18n.getCurrentLang()
    var text = i18n.getPageText('study')
    this.setData({ i18n: text, currentLang: lang })
  },

  onLoad: function() {
    this.applyLanguage();
    this.checkLoginStatus();
    this.syncZonePrices();
  },

  syncZonePrices: function() {
    var app = getApp();
    var prices = app.globalData.zonePrices;
    if (prices) {
      this.setData({ zonePrices: prices });
    }
  },

  onShow: function() {
    this.applyLanguage();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().applyLanguage();
      this.getTabBar().switchTo(2);
    }
    this.getCurrentSeat();
    this.getStudyRecords();
    this.getUserStats();
  },

  onHide: function() {
    this.stopUpdateTimer();
    this.stopExpireCheckTimer();
    this.stopCurrentSeatWatch();
  },

  onUnload: function() {
    this.stopUpdateTimer();
    this.stopExpireCheckTimer();
    this.stopCurrentSeatWatch();
  },

  checkLoginStatus: function() {
    var app = getApp();
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: this.data.i18n.tip,
        content: this.data.i18n.loginRequired,
        success: function(res) {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/mine/mine' });
          }
        }
      });
    }
  },

  getCurrentSeat: function() {
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (!userInfo) {
      this.setData({
        isStudying: false, sessionActive: false, currentSeat: null,
        currentStudyTime: '00:00:00', remainingStudyTime: '00:00:00', autoReleaseTime: '',
        hwDoorOn: false, hwLightOn: false, hwACOn: false
      });
      return;
    }
    var that = this;
    var db = wx.cloud.database();
    db.collection('seats').where({ userId: userInfo._openid, status: '使用中' }).get({
      success: function(res) {
        if (res.data.length > 0) {
          var seat = res.data[0];
          app.globalData.currentSeat = seat;
          // sessionActive 基于 startedAt 是否存在（不依赖座位状态）
          var isActive = !!(seat.startedAt);
          that.getOrderInfo(seat.orderId, function(order) {
            var remainingTime = 0;
            var autoReleaseTime = '';
            if (order && order.expireAt) {
              var expireTime = new Date(order.expireAt).getTime();
              var now = new Date().getTime();
              remainingTime = Math.max(0, Math.floor((expireTime - now) / 1000));
              autoReleaseTime = that.formatDate(order.expireAt);
            }
            if (isActive && seat.startedAt) {
              var st = new Date(seat.startedAt).getTime();
              var dur = Math.floor((now - st) / 1000);
              app.startStudyTimer(dur);
              that.startUpdateTimer();
            } else {
              app.globalData.studyDuration = 0;
              that.stopUpdateTimer();
            }
            that.setData({
              isStudying: true, sessionActive: isActive, currentSeat: seat,
              currentStudyTime: app.formatTime(app.globalData.studyDuration),
              remainingStudyTime: app.formatTime(remainingTime), autoReleaseTime: autoReleaseTime,
              hwDoorOn: !!(seat.hardwareStatus && seat.hardwareStatus.door),
              hwLightOn: !!(seat.hardwareStatus && seat.hardwareStatus.light),
              hwACOn: !!(seat.hardwareStatus && seat.hardwareStatus.airConditioner)
            });
            that.startExpireCheckTimer(remainingTime);
            that.startCurrentSeatWatch(seat._id);
          });
        } else {
          app.globalData.currentSeat = null;
          app.globalData.studyDuration = 0;
          that.setData({ isStudying: false, sessionActive: false, currentSeat: null, currentStudyTime: '00:00:00', remainingStudyTime: '00:00:00', autoReleaseTime: '', hwDoorOn: false, hwLightOn: false, hwACOn: false });
          that.stopUpdateTimer(); that.stopExpireCheckTimer(); that.stopCurrentSeatWatch();
        }
      },
      fail: function(err) {
        console.error('获取当前座位失败:', err);
        that.setData({ isStudying: false, sessionActive: false, currentSeat: null, remainingStudyTime: '00:00:00', autoReleaseTime: '', hwDoorOn: false, hwLightOn: false, hwACOn: false });
      }
    });
  },

  getOrderInfo: function(orderId, callback) {
    if (!orderId) { callback(null); return; }
    var db = wx.cloud.database();
    db.collection('orders').doc(orderId).get({
      success: function(res) { callback(res.data || null); },
      fail: function(err) { console.error('获取订单信息失败:', err); callback(null); }
    });
  },

  startCurrentSeatWatch: function(seatId) {
    if (!seatId) return;
    if (this.currentSeatWatcher && this.currentSeatWatcherSeatId === seatId) return;
    if (this.watchFailedForSeat === seatId) {
      console.log('[study] ⏭️ 跳过watch（此座位之前已失败），使用轮询');
      return;
    }
    this.stopCurrentSeatWatch();
    var that = this;
    var app = getApp();
    console.log('[study] 🔄 尝试启动当前座位实时监听...');

    var db = wx.cloud.database();
    try {
      this.currentSeatWatcherSeatId = seatId;
      this.currentSeatWatcher = db.collection('seats').doc(seatId).watch({
        onChange: function(snapshot) {
          console.log('[study] ✅ 实时监听收到座位更新');

          that.watchFailedForSeat = null;

          if (that.seatPollingTimer) {
            clearInterval(that.seatPollingTimer);
            that.seatPollingTimer = null;
            console.log('[study] ✓ 停止备用轮询（实时监听已恢复）');
          }

          if (!snapshot || !snapshot.docs || snapshot.docs.length === 0) return;
          var seat = snapshot.docs[0];
          var prevSeat = app.globalData.currentSeat;
          app.globalData.currentSeat = seat;
          var isActive = !!(seat.startedAt);
          that.setData({ currentSeat: seat, sessionActive: isActive });

          that.getOrderInfo(seat.orderId, function(order) {
            var remainingTime = 0;
            var autoReleaseTime = '';
            if (order && order.expireAt) {
              var expireTime = new Date(order.expireAt).getTime();
              var now2 = new Date().getTime();
              remainingTime = Math.max(0, Math.floor((expireTime - now2) / 1000));
              autoReleaseTime = that.formatDate(order.expireAt);

              app.globalData.currentOrderExpireTime = expireTime;
            }
            that.setData({ remainingStudyTime: app.formatTime(remainingTime), autoReleaseTime: autoReleaseTime });
            if (isActive && seat.startedAt) {
              var st3 = new Date(seat.startedAt).getTime();
              var dur2 = Math.floor((new Date().getTime() - st3) / 1000);
              if (!prevSeat || prevSeat.status !== '使用中') {
                app.startStudyTimer(dur2); that.startUpdateTimer(); that.startExpireCheckTimer(remainingTime);
              }
            } else {
              if (prevSeat && prevSeat.status === '使用中') {
                app.stopStudyTimer(); app.globalData.studyDuration = 0;
                that.stopUpdateTimer(); that.startExpireCheckTimer(remainingTime);
                that.getStudyRecords(); that.getUserStats();
                that.setData({ });
              } else { that.startExpireCheckTimer(remainingTime); }
            }
          });
        },
        onError: function(err) {
          console.error('[study] ❌ 实时监听失败:', err.errCode || err.message || err);

          that.watchFailedForSeat = seatId;
          that.stopCurrentSeatWatch();
          console.log('[study] 🔄 启动备用轮询机制（每5秒检查一次）');
          that.startSeatPolling(seatId);
        }
      });
    } catch (e) {
      console.error('[study] ❌ 创建监听异常:', e.message || e);
      console.log('[study] 🔄 启动备用轮询机制');
      that.startSeatPolling(seatId);
    }
  },

  startSeatPolling: function(seatId) {
    var that = this;

    if (that.seatPollingTimer) {
      clearInterval(that.seatPollingTimer);
    }

    that.getCurrentSeat();

    that.seatPollingTimer = setInterval(function() {
      console.log('[study] ⏱️ 备用轮询执行 - 检查座位状态');
      that.getCurrentSeat();
    }, 5000);

    console.log('[study] ✓ 备用轮询已启动（间隔: 5秒）');
  },

  stopCurrentSeatWatch: function() {
    if (this.currentSeatWatcher) {
      this.currentSeatWatcher.close();
      this.currentSeatWatcher = null;
      this.currentSeatWatcherSeatId = null;
    }
    if (this.seatPollingTimer) {
      clearInterval(this.seatPollingTimer);
      this.seatPollingTimer = null;
      console.log('[study] ✓ 备用轮询已停止');
    }
    this.watchFailedForSeat = null;
  },

  startUpdateTimer: function() {
    var that = this;
    if (this.updateTimer) clearInterval(this.updateTimer);
    this.updateTimer = setInterval(function() {
      var app = getApp();
      that.setData({ currentStudyTime: app.formatTime(app.globalData.studyDuration) });
    }, 1000);
  },

  stopUpdateTimer: function() {
    if (this.updateTimer) { clearInterval(this.updateTimer); this.updateTimer = null; }
  },

  startExpireCheckTimer: function(initialRemainingTime) {
    var that = this;
    if (this.expireCheckTimer) clearInterval(this.expireCheckTimer);
    if (initialRemainingTime <= 0) { this.checkSeatExpiration(); return; }
    this.expireCheckTimer = setInterval(function() { that.checkSeatExpiration(); }, 1000);
  },

  stopExpireCheckTimer: function() {
    if (this.expireCheckTimer) { clearInterval(this.expireCheckTimer); this.expireCheckTimer = null; }
  },

  checkSeatExpiration: function() {
    var that = this;
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat) { this.stopExpireCheckTimer(); return; }

    this.getOrderInfo(currentSeat.orderId, function(order) {
      if (!order || !order.expireAt) { that.stopExpireCheckTimer(); return; }
      var expireTime = new Date(order.expireAt).getTime();
      var now = new Date().getTime();
      var remainingTime = Math.max(0, Math.floor((expireTime - now) / 1000));
      that.setData({ remainingStudyTime: app.formatTime(remainingTime) });
      if (remainingTime <= 0) { that.handleSeatExpired(); }
    });
  },

  handleSeatExpired: function() {
    var that = this;
    var app = getApp();

    that.stopExpireCheckTimer();

    wx.showToast({ title: that.data.i18n.studyTimeExpired, icon: 'none', duration: 2000 });

    setTimeout(function() {
      that.refreshData();
    }, 2000);
  },

  refreshData: function() {
    this.getCurrentSeat(); this.getStudyRecords(); this.getUserStats();
  },

  getUserStats: function() {
    var that = this;
    var app = getApp();
    if (!app.globalData.userInfo) {
      that.setData({ isLoading: false, totalStudyTime: 0, todayStudyTime: 0, weekStudyTime: 0, monthStudyTime: 0, studyCount: 0, formattedTotalStudyTime: '00:00:00', formattedTodayStudyTime: '00:00:00', formattedWeekStudyTime: '00:00:00', formattedMonthStudyTime: '00:00:00' });
      return;
    }
    wx.cloud.callFunction({ name: 'getUserStats',
      success: function(res) {
        if (res.result.success) {
          var d = res.result.data || {};
          that.setData({
            totalStudyTime: d.totalStudyTime || 0, todayStudyTime: d.todayStudyTime || 0,
            weekStudyTime: d.weekStudyTime || 0, monthStudyTime: d.monthStudyTime || 0,
            studyCount: d.studyCount || 0,
            formattedTotalStudyTime: that.formatTime(d.totalStudyTime || 0),
            formattedTodayStudyTime: that.formatTime(d.todayStudyTime || 0),
            formattedWeekStudyTime: that.formatTime(d.weekStudyTime || 0),
            formattedMonthStudyTime: that.formatTime(d.monthStudyTime || 0), isLoading: false
          });
        }
      },
      fail: function(err) { console.error('获取用户统计失败:', err); that.setData({ isLoading: false }); }
    });
  },

  getStudyRecords: function() {
    this.setData({ isLoading: true });
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (!userInfo) { this.setData({ isLoading: false }); return; }
    var db = wx.cloud.database();
    db.collection('study_records').where({ userId: userInfo._openid }).orderBy('endTime', 'desc').limit(100).get({
      success: function(res) {
        var rawRecords = res.data || [];
        var studyRecords = [];
        for (var i = 0; i < rawRecords.length; i++) {
          var item = rawRecords[i];
          studyRecords.push({
            _id: item._id, userId: item.userId, seatNumber: item.seatNumber,
            startTime: item.startTime, endTime: item.endTime, duration: item.duration,
            createdAt: item.createdAt,
            formattedTime: that.formatTime(item.duration || 0), formattedDate: that.formatDate(item.startTime)
          });
        }
        var pageSize = that.data.pageSize;
        var totalPages = Math.max(1, Math.ceil(studyRecords.length / pageSize));
        var currentPage = Math.min(that.data.currentPage, totalPages);
        var pagedRecords = studyRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        that.setData({ studyRecords: studyRecords, pagedRecords: pagedRecords, currentPage: currentPage, totalPages: totalPages, isLoading: false });
      },
      fail: function(err) { console.error('获取自习记录失败:', err); that.setData({ isLoading: false }); }
    });
  },

  prevPage: function() { if (this.data.currentPage <= 1) return; this.setData({ currentPage: this.data.currentPage - 1 }); this.updatePagedRecords(); },
  nextPage: function() { if (this.data.currentPage >= this.data.totalPages) return; this.setData({ currentPage: this.data.currentPage + 1 }); this.updatePagedRecords(); },
  updatePagedRecords: function() {
    var d = this.data; this.setData({ pagedRecords: d.studyRecords.slice((d.currentPage - 1) * d.pageSize, d.currentPage * d.pageSize) });
  },

  // ====== Session 模型：开始本次学习（使用云函数 action:'start'）======
  startSession: function() {
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat) { wx.showToast({ title: this.data.i18n.pleaseReserveSeat, icon: 'none' }); return; }
    if (currentSeat.status !== '使用中') { wx.showToast({ title: this.data.i18n.seatStatusError, icon: 'none' }); return; }
    var that = this;
    wx.showModal({
      title: that.data.i18n.startStudy,
      content: that.data.i18n.confirmStartPrefix + currentSeat.seatNumber + that.data.i18n.confirmStartSuffix,
      confirmText: that.data.i18n.confirmStart,
      success: function(res) {
        if (!res.confirm) return;
        wx.showLoading({ title: that.data.i18n.processing });
        wx.cloud.callFunction({
          name: 'reserveSeat',
          data: { seatId: currentSeat._id, action: 'start' },
          success: function(res) {
            wx.hideLoading();
            if (res.result.success) {
              var updatedSeat = res.result.data;
              app.globalData.currentSeat = updatedSeat;
              app.startStudyTimer(0);
              that.startUpdateTimer();
              that.startExpireCheckTimer(0);
              that.setData({
                sessionActive: true, isStudying: true, currentSeat: updatedSeat,
                currentStudyTime: '00:00:01'
              });
              wx.showToast({ title: that.data.i18n.studyStarted, icon: 'success' });
            } else { wx.showToast({ title: res.result.error || that.data.i18n.operationFailed, icon: 'none' }); }
          },
          fail: function(err) { wx.hideLoading(); wx.showToast({ title: that.data.i18n.operationFailed, icon: 'none' }); }
        });
      }
    });
  },

  // ====== Session 模型：结束本次学习（使用独立action，不影响门锁）======
  endSession: function() {
    var that = this;
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat) { wx.showToast({ title: this.data.i18n.noReservedSeat, icon: 'none' }); return; }
    if (!that.data.sessionActive) { wx.showToast({ title: this.data.i18n.noActiveStudy, icon: 'none' }); return; }
    wx.showModal({
      title: that.data.i18n.endStudy,
      content: that.data.i18n.confirmEndContent,
      confirmText: that.data.i18n.confirmEnd,
      success: function(res) {
        if (!res.confirm) return;
        wx.showLoading({ title: that.data.i18n.processing });
        wx.cloud.callFunction({
          name: 'reserveSeat',
          data: { seatId: currentSeat._id, action: 'endSession' },
          success: function(res) {
            wx.hideLoading();
            if (res.result.success) {
              wx.showToast({ title: that.data.i18n.studyEnded, icon: 'success' });
              app.stopStudyTimer(); app.globalData.studyDuration = 0;
              that.stopUpdateTimer();
              that.setData({ sessionActive: false, currentStudyTime: '00:00:00' });
              that.getStudyRecords(); that.getUserStats();
              that.refreshData();
            } else { wx.showToast({ title: res.result.error || that.data.i18n.operationFailed, icon: 'none' }); }
          },
          fail: function(err) {
            wx.hideLoading(); console.error('操作失败:', err); wx.showToast({ title: that.data.i18n.operationFailed, icon: 'none' });
          }
        });
      }
    });
  },

  // ====== 提前退订座位 ======
  confirmCancelOrder: function() {
    var that = this;
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat) { wx.showToast({ title: this.data.i18n.noReservedSeat, icon: 'none' }); return; }
    wx.showModal({
      title: that.data.i18n.earlyCancel,
      content: that.data.i18n.confirmCancelPrefix + currentSeat.seatNumber + that.data.i18n.confirmCancelSuffix,
      confirmText: that.data.i18n.confirmCancel,
      confirmColor: '#EF4444',
      success: function(res) {
        if (!res.confirm) return;
        wx.showLoading({ title: that.data.i18n.cancelling });
        wx.cloud.callFunction({
          name: 'reserveSeat', data: { seatId: currentSeat._id, action: 'unlock' },
          success: function(res) {
            wx.hideLoading();
            if (res.result.success) {
              wx.showToast({ title: that.data.i18n.cancelledContactRefund, icon: 'success', duration: 2500 });
              if (that.data.sessionActive) { app.stopStudyTimer(); }
              app.globalData.currentSeat = null; app.globalData.studyDuration = 0;
              that.setData({ sessionActive: false, isStudying: false, currentSeat: null, currentStudyTime: '00:00:00', remainingStudyTime: '00:00:00', autoReleaseTime: '', hwDoorOn: false, hwLightOn: false, hwACOn: false });
              that.stopUpdateTimer(); that.stopExpireCheckTimer(); that.stopCurrentSeatWatch();
              that.getStudyRecords(); that.getUserStats();
            } else { wx.showToast({ title: res.result.error || that.data.i18n.cancelFailed, icon: 'none' }); }
          },
          fail: function(err) {
            wx.hideLoading(); console.error('退订失败:', err);
            wx.showToast({ title: that.data.i18n.cancelFailedRetry, icon: 'none' });
          }
        });
      }
    });
  },

  goToSeat: function() { wx.switchTab({ url: '/pages/seat/seat' }); },

  formatTime: function(seconds) {
    var s = Number(seconds) || 0;
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var hh = h.toString(); var mm = m.toString(); var ss = sec.toString();
    if (hh.length < 2) hh = '0' + hh;
    if (mm.length < 2) mm = '0' + mm;
    if (ss.length < 2) ss = '0' + ss;
    return hh + ':' + mm + ':' + ss;
  },

  formatDate: function(date) {
    if (!date) return '';
    var d = new Date(date);
    var y = d.getFullYear();
    var mo = d.getMonth() + 1; var day = d.getDate();
    var hr = d.getHours(); var min = d.getMinutes();
    var mos = mo.toString(); var ds = day.toString(); var hrs = hr.toString(); var mins = min.toString();
    if (mos.length < 2) mos = '0' + mos;
    if (ds.length < 2) ds = '0' + ds;
    if (hrs.length < 2) hrs = '0' + hrs;
    if (mins.length < 2) mins = '0' + mins;
    return y + '-' + mos + '-' + ds + ' ' + hrs + ':' + mins;
  },

  // ====== 独立硬件开关：门锁（纯硬件控制，不影响学习状态）======
  onDoorSwitch: function(e) {
    var checked = e.detail.value;
    var that = this;
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat) { wx.showToast({ title: that.data.i18n.noSeatInUse, icon: 'none' }); return; }
    this.setData({ hwDoorOn: checked });
    wx.cloud.callFunction({
      name: 'reserveSeat', data: { seatId: currentSeat._id, action: 'hardware', device: 'door', status: checked },
      success: function(res) {
        if (!res.result.success) {
          that.setData({ hwDoorOn: !checked });
          wx.showToast({ title: res.result.error || that.data.i18n.operationFailed, icon: 'none' });
        } else {
          var updatedSeat = res.result.data;
          if (updatedSeat) { app.globalData.currentSeat = updatedSeat; that.setData({ currentSeat: updatedSeat }); }
        }
      },
      fail: function(err) {
        console.error('门锁操作失败:', err);
        that.setData({ hwDoorOn: !checked });
        wx.showToast({ title: that.data.i18n.operationFailed, icon: 'none' });
      }
    });
  },

  // ====== 独立硬件开关：灯光（纯硬件控制，不依赖学习状态）======
  onLightSwitch: function(e) {
    var checked = e.detail.value;
    var that = this;
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat) { wx.showToast({ title: that.data.i18n.noSeatInUse, icon: 'none' }); return; }
    this.setData({ hwLightOn: checked });
    wx.cloud.callFunction({
      name: 'reserveSeat', data: { seatId: currentSeat._id, action: 'hardware', device: 'light', status: checked },
      success: function(res) {
        if (!res.result.success) {
          that.setData({ hwLightOn: !checked });
          wx.showToast({ title: res.result.error || that.data.i18n.operationFailed, icon: 'none' });
        } else {
          var updatedSeat = res.result.data;
          if (updatedSeat) { app.globalData.currentSeat = updatedSeat; that.setData({ currentSeat: updatedSeat }); }
        }
      },
      fail: function(err) {
        console.error('灯光操作失败:', err);
        that.setData({ hwLightOn: !checked });
        wx.showToast({ title: that.data.i18n.operationFailed, icon: 'none' });
      }
    });
  },

  // ====== 独立硬件开关：空调（纯硬件控制，不依赖学习状态）======
  onACSwitch: function(e) {
    var checked = e.detail.value;
    var that = this;
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat) { wx.showToast({ title: that.data.i18n.noSeatInUse, icon: 'none' }); return; }
    this.setData({ hwACOn: checked });
    wx.cloud.callFunction({
      name: 'reserveSeat', data: { seatId: currentSeat._id, action: 'hardware', device: 'airConditioner', status: checked },
      success: function(res) {
        if (!res.result.success) {
          that.setData({ hwACOn: !checked });
          wx.showToast({ title: res.result.error || that.data.i18n.operationFailed, icon: 'none' });
        } else {
          var updatedSeat = res.result.data;
          if (updatedSeat) { app.globalData.currentSeat = updatedSeat; that.setData({ currentSeat: updatedSeat }); }
        }
      },
      fail: function(err) {
        console.error('空调操作失败:', err);
        that.setData({ hwACOn: !checked });
        wx.showToast({ title: that.data.i18n.operationFailed, icon: 'none' });
      }
    });
  },

  openExtendModal: function() {
    var that = this;
    var app = getApp();
    var currentSeat = app.globalData.currentSeat;
    if (!currentSeat || !currentSeat.orderId) { wx.showToast({ title: this.data.i18n.noOrderToExtend, icon: 'none' }); return; }
    this.getOrderInfo(currentSeat.orderId, function(order) {
      if (!order) { wx.showToast({ title: that.data.i18n.orderInfoFailed, icon: 'none' }); return; }
      that.setData({ currentOrderInfo: order, showExtendModal: true, extendSelectedCouponId: '', extendSelectedCoupon: null, extendFinalPrice: 3 });
      that.setExtPlanType({ currentTarget: { dataset: { type: 'hour' } } });
      that.fetchExtendCoupons();
    });
  },

  onExtendOverlayTap: function(e) { if (e.target === e.currentTarget) { this.closeExtendModal(); } },
  preventBubble: function() {},
  closeExtendModal: function() {
    this.setData({ showExtendModal: false, extendPlanType: 'hour', extendQuantityIndex: 0, extendQuantityOptions: [], extendUnitText: '小时', extendUnitPrice: 3, extendTotalPrice: 3, currentOrderInfo: null, extendAvailableCoupons: [], extendSelectedCouponId: '', extendSelectedCoupon: null, extendFinalPrice: 3, showExtendCouponList: false, extendExpireDate: '' });
  },

  setExtPlanType: function(e) {
    var type = e.currentTarget.dataset.type;
    var seat = this.data.currentSeat;
    var zonePrices = this.getZonePrices(seat);
    var map = { hour: { unitPrice: zonePrices.pricePerHour, max: 24, unitText: '小时' }, day: { unitPrice: zonePrices.pricePerDay, max: 30, unitText: '天' }, week: { unitPrice: zonePrices.pricePerWeek, max: 4, unitText: '周' } };
    var cfg = map[type] || map.hour;
    var options = [];
    for (var i = 1; i <= cfg.max; i++) options.push(i);
    var expireDate = this.calculateExpireDate(1, type);
    this.setData({ extendPlanType: type, extendQuantityIndex: 0, extendQuantityOptions: options, extendUnitText: cfg.unitText, extendUnitPrice: cfg.unitPrice, extendTotalPrice: cfg.unitPrice * 1, extendDayPrice: zonePrices.pricePerDay, extendWeekPrice: zonePrices.pricePerWeek, extendExpireDate: expireDate });
    this.recalculateExtendFinalPrice();
  },

  getZonePrices: function(seat) {
    var zp = this.data.zonePrices;
    if (!seat || !seat.seatNumber) return { pricePerHour: zp.immersive.hour, pricePerDay: zp.immersive.day, pricePerWeek: zp.immersive.week };
    var row = parseInt(seat.seatNumber.split('-')[0], 10);
    if (row >= 4 && row <= 5) return { pricePerHour: zp.sunshine.hour, pricePerDay: zp.sunshine.day, pricePerWeek: zp.sunshine.week };
    if (row === 6) return { pricePerHour: zp.vip.hour, pricePerDay: zp.vip.day, pricePerWeek: zp.vip.week };
    return { pricePerHour: zp.immersive.hour, pricePerDay: zp.immersive.day, pricePerWeek: zp.immersive.week };
  },

  calculateExpireDate: function(quantity, planType) {
    var now = new Date();
    var exp = new Date(now.getTime());
    switch (planType) {
      case 'hour': exp.setHours(now.getHours() + quantity); break;
      case 'day': exp.setDate(now.getDate() + quantity); break;
      case 'week': exp.setDate(now.getDate() + (quantity * 7)); break;
    }
    var y = exp.getFullYear();
    var mo = exp.getMonth() + 1; var day = exp.getDate();
    var hr = exp.getHours(); var min = exp.getMinutes();
    var mos = mo.toString(); var ds = day.toString(); var hrs = hr.toString(); var mins = min.toString();
    if (mos.length < 2) mos = '0' + mos;
    if (ds.length < 2) ds = '0' + ds;
    if (hrs.length < 2) hrs = '0' + hrs;
    if (mins.length < 2) mins = '0' + mins;
    return y + '-' + mos + '-' + ds + ' ' + hrs + ':' + mins;
  },

  bindExtendQuantityChange: function(e) {
    var index = Number(e.detail.value) || 0;
    var quantity = this.data.extendQuantityOptions[index] || 1;
    var totalPrice = quantity * this.data.extendUnitPrice;
    var expireDate = this.calculateExpireDate(quantity, this.data.extendPlanType);
    this.setData({ extendQuantityIndex: index, extendTotalPrice: totalPrice, extendExpireDate: expireDate });
    this.recalculateExtendFinalPrice();
  },

  confirmExtend: function() {
    if (!this.data.currentOrderInfo) return;
    var orderId = this.data.currentOrderInfo._id;
    var planType = this.data.extendPlanType;
    var quantity = this.data.extendQuantityOptions[this.data.extendQuantityIndex] || 1;
    var config = require('../../config');
    if (config && config.enableMockPay) {
      wx.showModal({ title: this.data.i18n.confirmExtendTitle, content: this.data.i18n.extendContentPrefix + quantity + ' ' + this.data.extendUnitText + this.data.i18n.extendContentSuffix + this.data.extendFinalPrice, confirmText: this.data.i18n.payNow, cancelText: this.data.i18n.cancel,
        success: function(r) { if (r.confirm) { this.doExtendPayment(orderId, planType, quantity); } }.bind(this)
      });
      return;
    }
    this.doExtendPayment(orderId, planType, quantity);
  },

  doExtendPayment: function(orderId, planType, quantity) {
    var that = this;
    var selectedCoupon = this.data.extendSelectedCoupon;
    if (selectedCoupon && selectedCoupon._id) {
      wx.cloud.callFunction({ name: 'couponManager', data: { action: 'applyCoupon', couponId: selectedCoupon._id, orderAmount: this.data.extendTotalPrice },
        success: function(couponRes) {
          if (!couponRes.result || !couponRes.result.success) { wx.showToast({ title: (couponRes.result && couponRes.result.error) || that.data.i18n.couponApplyFailed, icon: 'none' }); return; }
          that.doExtendOrder(orderId, planType, quantity);
        },
        fail: function() { wx.showToast({ title: that.data.i18n.couponProcessFailed, icon: 'none' }); }
      });
      return;
    }
    this.doExtendOrder(orderId, planType, quantity);
  },

  doExtendOrder: function(orderId, planType, quantity) {
    var that = this;
    wx.showLoading({ title: that.data.i18n.extending });
    wx.cloud.callFunction({ name: 'reserveSeat', data: { action: 'extendOrder', orderId: orderId, planType: planType, quantity: quantity },
      success: function(res) {
        wx.hideLoading();
        if (res.result && res.result.success) { wx.showToast({ title: that.data.i18n.extendSuccess, icon: 'success' }); that.closeExtendModal(); that.refreshData(); }
        else { wx.showToast({ title: (res.result && res.result.error) || that.data.i18n.extendFailed, icon: 'none' }); }
      },
      fail: function(err) { wx.hideLoading(); console.error('续费失败:', err); wx.showToast({ title: that.data.i18n.extendFailedRetry, icon: 'none' }); }
    });
  },

  fetchExtendCoupons: function() {
    var that = this;
    var app = getApp();
    if (!app.globalData.userInfo) { this.setData({ extendAvailableCoupons: [] }); return; }
    wx.cloud.callFunction({ name: 'couponManager', data: { action: 'getUserCoupons' },
      success: function(res) {
        if (res.result && res.result.success) {
          var all = res.result.data || []; var now = new Date();
          var available = [];
          for (var j = 0; j < all.length; j++) { if (all[j].status === 'available' && (!all[j].expireAt || new Date(all[j].expireAt) > now)) available.push(all[j]); }
          that.setData({ extendAvailableCoupons: available });
        } else { that.setData({ extendAvailableCoupons: [] }); }
      },
      fail: function() { that.setData({ extendAvailableCoupons: [] }); }
    });
  },

  toggleExtendCouponList: function() {
    if (this.data.extendAvailableCoupons.length === 0) { wx.showToast({ title: this.data.i18n.noAvailableCoupon, icon: 'none' }); return; }
    this.setData({ showExtendCouponList: !this.data.showExtendCouponList });
  },

  selectExtendCoupon: function(e) {
    var couponId = e.currentTarget.dataset.id;
    var coupons = this.data.extendAvailableCoupons;
    var coupon = null;
    for (var i = 0; i < coupons.length; i++) { if (coupons[i]._id === couponId) { coupon = coupons[i]; break; } }
    if (!coupon) return;
    if (this.data.extendTotalPrice < (coupon.minAmount || 0)) { wx.showToast({ title: this.data.i18n.minAmountPrefix + coupon.minAmount + this.data.i18n.minAmountSuffix, icon: 'none' }); return; }
    this.setData({ extendSelectedCouponId: couponId, extendSelectedCoupon: coupon });
    this.recalculateExtendFinalPrice();
  },

  deselectExtendCoupon: function() {
    this.setData({ extendSelectedCouponId: '', extendSelectedCoupon: null, showExtendCouponList: false });
    this.recalculateExtendFinalPrice();
  },

  recalculateExtendFinalPrice: function() {
    var finalPrice = this.data.extendTotalPrice;
    if (this.data.extendSelectedCoupon && finalPrice >= (this.data.extendSelectedCoupon.minAmount || 0)) {
      finalPrice = Math.max(0, finalPrice - (this.data.extendSelectedCoupon.discountAmount || 0));
    }
    this.setData({ extendFinalPrice: finalPrice });
  }
});
