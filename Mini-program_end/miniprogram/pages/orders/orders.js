// orders.js - 订单列表页面
var i18n = require('../../i18n/i18n.js')
Page({
  data: {
    i18n: {},
    currentLang: 'zh-CN',
    orders: [],
    isLoading: true
  },

  applyLanguage: function() {
    var lang = i18n.getCurrentLang()
    this.setData({ i18n: i18n.getPageText('orders'), currentLang: lang })
  },

  onLoad: function() {
    this.applyLanguage();
    this.getOrders();
  },

  onShow: function() {
    this.applyLanguage();
    this.getOrders();
  },

  getOrders: function() {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo) {
      that.setData({ orders: [], isLoading: false });
      return;
    }

    var db = wx.cloud.database();
    var oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    db.collection('orders')
      .where({
        userId: userInfo._openid,
        createdAt: db.command.gte(oneYearAgo)
      })
      .orderBy('createdAt', 'desc')
      .get({
        success: function(res) {
          var rawData = res.data || [];
          var orders = [];
          for (var i = 0; i < rawData.length; i++) {
            var item = rawData[i];
            var created = new Date(item.createdAt);
            var expire = item.expireAt ? new Date(item.expireAt) : null;
            var durationSec = expire ? Math.max(0, Math.floor((expire - created) / 1000)) : (item.duration || 0);
            var finalPriceVal = (item.couponUsed && item.couponDiscount > 0)
              ? Math.max(0, (item.totalPrice || 0) - (item.couponDiscount || 0))
              : (item.totalPrice || 0);
            var unitTextVal = item.planType === 'hour' ? that.data.i18n.hour : item.planType === 'day' ? that.data.i18n.day : that.data.i18n.week;

            orders.push({
              _id: item._id,
              seatNumber: item.seatNumber,
              seatId: item.seatId,
              planType: item.planType,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
              status: item.status,
              createdAt: item.createdAt,
              expireAt: item.expireAt,
              duration: item.duration,
              couponUsed: item.couponUsed,
              couponDiscount: item.couponDiscount,
              userId: item.userId,
              orderId: item.orderId,
              createdAtText: that.formatDateTime(item.createdAt),
              expireAtText: item.expireAt ? that.formatDateTime(item.expireAt) : '',
              formattedDate: that.formatDate(item.createdAt),
              formattedExpireAt: item.expireAt ? that.formatDate(item.expireAt) : '',
              formattedDuration: that.formatTime(durationSec),
              finalPrice: finalPriceVal,
              unitText: unitTextVal
            });
          }

          that.setData({ orders: orders, isLoading: false });
        },
        fail: function() {
          that.setData({ orders: [], isLoading: false });
        }
      });
  },

  getStatusClass: function(status) {
    if (status === '进行中') return 'ongoing';
    if (status === '已完成') return 'finished';
    return 'cancelled';
  },

  formatTime: function(seconds) {
    if (seconds === undefined || seconds === null) return '';
    var s = Number(seconds) || 0;
    var hours = Math.floor(s / 3600);
    var minutes = Math.floor((s % 3600) / 60);
    var secs = Math.floor(s % 60);
    var hh = hours.toString(); var mm = minutes.toString(); var ss = secs.toString();
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
    var mos = mo.toString(); var ds = day.toString();
    if (mos.length < 2) mos = '0' + mos;
    if (ds.length < 2) ds = '0' + ds;
    return y + '-' + mos + '-' + ds;
  },

  formatDateTime: function(date) {
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

  loadOrders: function() { this.getOrders(); },

  cancelOrder: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: that.data.i18n.cancelOrderConfirmTitle,
      content: that.data.i18n.cancelOrderConfirm,
      confirmColor: '#EF4444',
      success: function(res) {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'orderManager', data: { action: 'cancelOrder', orderId: id },
            success: function(cRes) {
              if (cRes.result.success) {
                wx.showToast({ title: that.data.i18n.cancelOrderSuccess, icon: 'success' });
                that.getOrders();
              } else { wx.showToast({ title: cRes.result.message || that.data.i18n.cancelFailed, icon: 'none' }); }
            }
          });
        }
      }
    });
  },

  goToStudyForExtend: function(e) {
    var seatId = e.currentTarget.dataset.seatId;
    wx.navigateTo({ url: '/pages/study/study?seatId=' + seatId + '&from=order' });
  },

  goToSeat: function() {
    wx.switchTab({ url: '/pages/seat/seat' });
  }
});
