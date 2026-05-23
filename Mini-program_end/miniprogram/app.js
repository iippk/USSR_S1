// app.js
var i18n = require('./i18n/i18n.js')
App({
  globalData: {
    env: "cloud1-6gwfun5cc8a627e8",
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
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用2.2.3以上基础库");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true
      });
    }
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    this.loadZonePrices();
    this.loadSystemSettings();
    this.refreshAvatarIfNeeded();
  },

  loadZonePrices: function () {
    var that = this;
    var config = require('./config');
    config.loadZonePrices(function (prices) {
      that.globalData.zonePrices = prices;
    });
  },

  loadSystemSettings: function () {
    var that = this;
    var config = require('./config');
    config.loadSystemSettings(function (settings) {
      that.globalData.systemSettings = settings;
    });
  },

  refreshAvatarIfNeeded: function () {
    var userInfo = this.globalData.userInfo;
    if (!userInfo || !userInfo.avatarUrl) return;
    if (userInfo.avatarUrl.indexOf('cloud://') === 0) return;
    if (userInfo.avatarUrl.indexOf('mmbiz.qpic.cn') > -1) return;

    var that = this;
    wx.downloadFile({
      url: userInfo.avatarUrl,
      success: function (res) {
        if (res.statusCode === 200) {
          var openid = userInfo._openid || 'unknown';
          var cloudPath = 'avatars/' + openid + '_' + Date.now() + '.png';
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: res.tempFilePath,
            success: function (uploadRes) {
              userInfo.avatarUrl = uploadRes.fileID;
              that.saveUserInfo(userInfo);
              wx.cloud.callFunction({
                name: 'updateAvatar',
                data: { avatarUrl: uploadRes.fileID }
              });
            }
          });
        }
      }
    });
  },

  onShow: function () {
    this.startGlobalSeatChecker();
  },

  onHide: function () {
    this.stopGlobalSeatChecker();
  },

  startGlobalSeatChecker: function () {
    var that = this;
    that.stopGlobalSeatChecker();
    that.globalData.isReleasing = false;
    console.log('[GlobalSeatChecker] ✅ 启动全局座位检查器');
    that.checkSeatStatusImmediately();
    that.adjustCheckInterval();
  },

  stopGlobalSeatChecker: function () {
    if (this.globalData.seatCheckTimer) {
      clearInterval(this.globalData.seatCheckTimer);
      this.globalData.seatCheckTimer = null;
      console.log('[GlobalSeatChecker] ⏹️ 停止全局座位检查器');
    }
  },

  adjustCheckInterval: function () {
    var that = this;
    if (that.globalData.seatCheckTimer) {
      clearInterval(that.globalData.seatCheckTimer);
      that.globalData.seatCheckTimer = null;
    }

    var expireTime = that.globalData.currentOrderExpireTime;
    var now = Date.now();
    var interval = 30000;

    if (expireTime > 0) {
      var remainingMs = expireTime - now;

      if (remainingMs <= 0) {
        interval = 500;
        console.log('[GlobalSeatChecker] ⚡ 座位已过期！使用500ms极速模式');
      } else if (remainingMs <= 10000) {
        interval = 1000;
        console.log('[GlobalSeatChecker] ⚡ 剩余', Math.floor(remainingMs / 1000), '秒（<10秒），使用1秒极速检查');
      } else if (remainingMs <= 30000) {
        interval = 2000;
        console.log('[GlobalSeatChecker] ⏰ 剩余', Math.floor(remainingMs / 1000), '秒（<30秒），使用2秒高频检查');
      } else if (remainingMs <= 60000) {
        interval = 5000;
        console.log('[GlobalSeatChecker] ⏰ 剩余', Math.floor(remainingMs / 1000), '秒（<1分钟），使用5秒检查');
      } else if (remainingMs <= 300000) {
        interval = 10000;
        console.log('[GlobalSeatChecker] ⏰ 剩余', Math.floor(remainingMs / 1000), '秒（<5分钟），使用10秒检查');
      } else {
        interval = 30000;
        console.log('[GlobalSeatChecker] ⏰ 剩余时间充足，使用30秒常规检查');
      }
    }

    that.globalData.seatCheckTimer = setInterval(function () {
      that.checkSeatStatusImmediately();
    }, interval);

    console.log('[GlobalSeatChecker] ✓ 检查间隔设置为:', interval, 'ms (', interval / 1000, '秒)');
  },

  checkSeatStatusImmediately: function () {
    var that = this;
    var now = Date.now();

    var expireTime = that.globalData.currentOrderExpireTime;
    var isExpired = (expireTime > 0 && expireTime <= now);

    var minInterval = isExpired ? 200 : 1000;
    if (now - that.globalData.lastSeatCheckTime < minInterval) {
      return;
    }

    that.globalData.lastSeatCheckTime = now;

    if (!that.globalData.userInfo || !that.globalData.userInfo._openid) {
      return;
    }

    if (that.globalData.isReleasing) {
      console.log('[GlobalSeatChecker] ⏸️ 正在执行释放，跳过本次检查');
      return;
    }

    var db = wx.cloud.database();
    db.collection('seats').where({
      userId: that.globalData.userInfo._openid,
      status: '使用中'
    }).limit(1).get({
      success: function (res) {
        if (!res.data || res.data.length === 0) {
          if (that.globalData.currentSeat && that.globalData.currentSeat.status === '使用中') {
            console.log('[GlobalSeatChecker] 🔄 座位已被外部释放，更新本地状态');
            that.handleSeatReleasedExternally();
          }
          that.globalData.currentOrderExpireTime = 0;
          that.adjustCheckInterval();
          return;
        }

        var seat = res.data[0];
        that.globalData.currentSeat = seat;

        if (!seat.orderId) {
          that.globalData.currentOrderExpireTime = 0;
          that.adjustCheckInterval();
          return;
        }

        db.collection('orders').doc(seat.orderId).get({
          success: function (orderRes) {
            var order = orderRes.data;
            if (!order || !order.expireAt) {
              that.globalData.currentOrderExpireTime = 0;
              that.adjustCheckInterval();
              return;
            }

            var expireTime = new Date(order.expireAt).getTime();
            that.globalData.currentOrderExpireTime = expireTime;

            var remainingMs = expireTime - now;
            console.log('[GlobalSeatChecker] ⏱️ 座位', seat.seatNumber, '- 剩余时间:', Math.floor(remainingMs / 1000), '秒');

            if (remainingMs <= 0) {
              console.log('[GlobalSeatChecker] 🚨 座位已过期！立即执行自动释放');
              that.executeAutoRelease(seat, order);
            } else if (remainingMs <= 30000 && !that.globalData.expiryWarningShown) {
              console.log('[GlobalSeatChecker] ⚠️ 座位即将到期（<30秒），显示预警');
              that.globalData.expiryWarningShown = true;
              that.showExpiryWarning(seat, remainingMs);
              that.adjustCheckInterval();
            } else {
              that.adjustCheckInterval();
            }
          },
          fail: function (err) {
            console.error('[GlobalSeatChecker] 查询订单失败:', err);
          }
        });
      },
      fail: function (err) {
        console.error('[GlobalSeatChecker] 查询座位失败:', err);
      }
    });
  },

  showExpiryWarning: function (seat, remainingMs) {
    var that = this;
    var remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
    var appText = i18n.t('app');

    wx.showModal({
      title: appText.seatExpiring,
      content: appText.seatExpiringContent + (seat.seatNumber || '') + appText.seatExpiringMid + remainingSec + appText.seatExpiringSuffix,
      showCancel: true,
      cancelText: appText.renewSeat,
      confirmText: appText.iKnow,
      success: function (res) {
        if (res.confirm) {
          console.log('[ExpiryWarning] 用户已确认即将到期');
        } else if (res.cancel) {
          console.log('[ExpiryWarning] 用户选择续费，跳转到学时页面');
          wx.switchTab({
            url: '/pages/study/study',
            success: function () {
              that.globalData.expiryWarningShown = false;
            }
          });
        }
      }
    });
  },

  executeAutoRelease: function (seat, order) {
    var that = this;

    if (that.globalData.isReleasing) {
      console.log('[AutoRelease] ⚠️ 正在执行释放操作，避免重复执行');
      return;
    }

    that.globalData.isReleasing = true;
    console.log('[AutoRelease] 🚀 开始执行自动释放流程 - 座位:', seat.seatNumber);
    var appText = i18n.t('app');

    wx.showModal({
      title: appText.seatExpired,
      content: appText.seatExpiredContent + (seat.seatNumber || '') + appText.seatExpiredMid,
      showCancel: false,
      confirmText: appText.iKnow,
      success: function () {
        wx.cloud.callFunction({
          name: 'autoreleaseseat',
          data: { forceReleaseSeatId: seat._id },
          success: function (res) {
            console.log('[AutoRelease] ✅ 自动释放成功:', res.result);

            if (that.globalData.studyTimer) {
              var finalDuration = that.stopStudyTimer();
              console.log('[AutoRelease] 📊 学习时长:', finalDuration, '秒');
            }

            that.globalData.currentSeat = null;
            that.globalData.studyDuration = 0;
            that.globalData.currentOrderExpireTime = 0;
            that.globalData.isReleasing = false;
            that.globalData.expiryWarningShown = false;

            that.adjustCheckInterval();

            if (typeof that.onSeatAutoReleased === 'function') {
              that.onSeatAutoReleased(seat, res.result);
            }

            wx.showToast({
              title: appText.seatReleased,
              icon: 'success',
              duration: 2000
            });
          },
          fail: function (err) {
            console.error('[AutoRelease] ❌ 自动释放失败:', err);

            wx.cloud.callFunction({
              name: 'reserveSeat',
              data: {
                seatId: seat._id,
                action: 'checkExpired'
              },
              success: function (backupRes) {
                console.log('[AutoRelease] 🔄 备用释放方案成功:', backupRes.result);
                that.globalData.currentSeat = null;
                that.globalData.studyDuration = 0;
                that.globalData.currentOrderExpireTime = 0;
                that.globalData.isReleasing = false;
                that.globalData.expiryWarningShown = false;

                if (that.globalData.studyTimer) {
                  that.stopStudyTimer();
                }

                that.adjustCheckInterval();
                wx.showToast({ title: appText.seatReleased, icon: 'success' });
              },
              fail: function (backupErr) {
                console.error('[AutoRelease] ❌ 备用方案也失败:', backupErr);
                that.globalData.isReleasing = false;
                wx.showToast({ title: appText.releaseError, icon: 'none' });
              }
            });
          }
        });
      }
    });
  },

  handleSeatReleasedExternally: function () {
    var that = this;
    console.log('[ExternalRelease] 处理外部释放事件');

    if (that.globalData.studyTimer) {
      var duration = that.stopStudyTimer();
      console.log('[ExternalRelease] 保存的学习时长:', duration, '秒');
    }

    that.globalData.currentSeat = null;
    that.globalData.studyDuration = 0;
  },

  saveUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
  },

  startStudyTimer: function (initialSeconds) {
    if (this.globalData.studyTimer) {
      clearInterval(this.globalData.studyTimer);
      this.globalData.studyTimer = null;
    }
    this.globalData.studyStartTime = new Date();
    this.globalData.studyDuration = Number(initialSeconds) || 0;
    var that = this;
    this.globalData.studyTimer = setInterval(function () {
      that.globalData.studyDuration++;
    }, 1000);
  },

  stopStudyTimer: function () {
    if (this.globalData.studyTimer) {
      clearInterval(this.globalData.studyTimer);
      this.globalData.studyTimer = null;
    }
    return this.globalData.studyDuration;
  },

  formatTime: function (seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
    var hh = hours.toString(); var mm = minutes.toString(); var ss = secs.toString();
    if (hh.length < 2) hh = '0' + hh;
    if (mm.length < 2) mm = '0' + mm;
    if (ss.length < 2) ss = '0' + ss;
    return hh + ':' + mm + ':' + ss;
  }
});
