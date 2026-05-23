var i18n = require('../../i18n/i18n.js')
Page({
  data: {
    i18n: {},
    currentLang: 'zh-CN',
    coupons: [],
    filteredCoupons: [],
    isLoading: true,
    summary: { total: 0, available: 0, used: 0 },
    currentTab: 'available',
    couponCount: 0,
    usedCount: 0,
    expiredCount: 0,
    poolCoupons: [],
    isLoadingPool: false
  },

  applyLanguage: function() {
    var lang = i18n.getCurrentLang()
    this.setData({ i18n: i18n.getPageText('coupons'), currentLang: lang })
  },

  onLoad: function() {
    this.applyLanguage();
    this.getCoupons();
    this.getPoolCoupons();
  },

  onShow: function() {
    this.applyLanguage();
    this.getCoupons();
    this.getPoolCoupons();
  },

  getCoupons: function() {
    this.setData({ isLoading: true });

    var that = this;
    wx.cloud.callFunction({
      name: 'couponManager',
      data: { action: 'getUserCoupons' },
      success: function(res) {
        if (res.result && res.result.success) {
          var rawData = res.result.data || [];
          var coupons = [];
          for (var i = 0; i < rawData.length; i++) {
            var item = rawData[i];
            coupons.push({
              _id: item._id,
              name: item.name,
              type: item.type,
              discountAmount: item.discountAmount,
              minAmount: item.minAmount,
              status: item.status,
              expireAt: item.expireAt,
              usedAt: item.usedAt,
              createdAt: item.createdAt,
              userId: item.userId,
              source: item.source,
              formattedExpireDate: item.expireAt ? that.formatDate(item.expireAt) : that.data.i18n.longTermValid,
              formattedUsedAt: item.usedAt ? that.formatDate(item.usedAt) : '',
              isExpired: item.expireAt ? new Date(item.expireAt) <= new Date() : false
            });
          }

          var now = new Date();
          var available = [];
          var used = [];
          var expired = [];
          for (var j = 0; j < coupons.length; j++) {
            var c = coupons[j];
            if (c.status === 'available' && (!c.expireAt || new Date(c.expireAt) > now)) {
              available.push(c);
            } else if (c.status === 'used') {
              used.push(c);
            } else if (c.status === 'expired' || (c.expireAt && new Date(c.expireAt) <= now)) {
              expired.push(c);
            }
          }

          that.setData({
            coupons: coupons,
            summary: res.result.summary || { total: 0, available: 0, used: 0 },
            couponCount: available.length,
            usedCount: used.length,
            expiredCount: expired.length,
            isLoading: false
          });
          that.updateFilteredCoupons();
        } else {
          that.setData({ coupons: [], isLoading: false });
        }
      },
      fail: function() {
        that.setData({ coupons: [], isLoading: false });
      }
    });
  },

  getPoolCoupons: function() {
    var that = this;
    this.setData({ isLoadingPool: true });
    wx.cloud.callFunction({
      name: 'couponManager',
      data: { action: 'getPoolCoupons' },
      success: function(res) {
        if (res.result && res.result.success) {
          var poolList = res.result.data || [];
          for (var i = 0; i < poolList.length; i++) {
            poolList[i].formattedExpireDate = poolList[i].expireAt ? that.formatDate(poolList[i].expireAt) : that.data.i18n.longTermValid;
          }
          that.setData({ poolCoupons: poolList, isLoadingPool: false });
        } else {
          that.setData({ poolCoupons: [], isLoadingPool: false });
        }
      },
      fail: function() {
        that.setData({ poolCoupons: [], isLoadingPool: false });
      }
    });
  },

  claimCoupon: function(e) {
    var couponType = e.currentTarget.dataset.type;
    if (!couponType) return;

    var that = this;
    wx.showLoading({ title: that.data.i18n.claiming });
    wx.cloud.callFunction({
      name: 'couponManager',
      data: { action: 'claimPoolCoupon', couponType: couponType },
      success: function(res) {
        wx.hideLoading();
        if (res.result && res.result.success) {
          wx.showToast({ title: that.data.i18n.claimSuccess, icon: 'success' });
          that.getCoupons();
          that.getPoolCoupons();
        } else {
          wx.showToast({ title: res.result.error || that.data.i18n.claimFailed, icon: 'none' });
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({ title: that.data.i18n.networkError, icon: 'none' });
      }
    });
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    if (!tab) return;
    this.setData({ currentTab: tab });
    this.updateFilteredCoupons();
  },

  updateFilteredCoupons: function() {
    var d = this.data;
    var coupons = d.coupons;
    var currentTab = d.currentTab;
    var now = new Date();
    var filtered = [];

    if (currentTab === 'available') {
      for (var i = 0; i < coupons.length; i++) {
        var c = coupons[i];
        if (c.status === 'available' && (!c.expireAt || new Date(c.expireAt) > now)) {
          filtered.push(c);
        }
      }
    } else if (currentTab === 'used') {
      for (var j = 0; j < coupons.length; j++) {
        if (coupons[j].status === 'used') filtered.push(coupons[j]);
      }
    } else if (currentTab === 'expired') {
      for (var k = 0; k < coupons.length; k++) {
        var m = coupons[k];
        if (m.status === 'expired' || (m.expireAt && new Date(m.expireAt) <= now)) {
          filtered.push(m);
        }
      }
    }

    this.setData({ filteredCoupons: filtered });
  },

  getEmptyText: function() {
    var ct = this.data.currentTab;
    if (ct === 'available') return this.data.i18n.noAvailableCoupon;
    if (ct === 'used') return this.data.i18n.noUsedRecord;
    return this.data.i18n.noCouponsExpired;
  },

  formatDate: function(date) {
    if (!date) return '';
    var d = new Date(date);
    var year = d.getFullYear();
    var month = (d.getMonth() + 1).toString();
    var day = d.getDate().toString();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return year + '-' + month + '-' + day;
  },

  refreshData: function() {
    var that = this;
    wx.showLoading({ title: that.data.i18n.refreshing });
    this.getCoupons();
    this.getPoolCoupons();
    setTimeout(function() {
      wx.hideLoading();
      wx.showToast({ title: that.data.i18n.refreshSuccess, icon: 'success' });
    }, 500);
  }
});
