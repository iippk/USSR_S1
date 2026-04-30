// mine.js - 个人中心页面
Page({
  data: {
    userInfo: null,
    studyRecords: [],
    pagedRecords: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 5,
    orders: [],
    isLoading: true,
    totalStudyTime: 0,
    todayStudyTime: 0,
    weekStudyTime: 0,
    monthStudyTime: 0,
    studyCount: 0,
    couponCount: 0,
    showNicknameDialog: false,
    newNickname: '',
    showAvatarDialog: false,
    defaultAvatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
  },

  onLoad: function() {
    this.initData();
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    this.updateUserInfo();
    this.getUserStats();
    this.getStudyRecords();
    this.getOrders();
    this.getCouponCount();
  },

  initData: function() {
    this.updateUserInfo();
    this.getUserStats();
    this.getStudyRecords();
    this.getOrders();
  },

  updateUserInfo: function() {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (userInfo) {
      if (!userInfo.avatarUrl || userInfo.avatarUrl === '') {
        userInfo.avatarUrl = this.data.defaultAvatar;
      }
      this.setData({ userInfo: userInfo });
      that.refreshUserFromDB(userInfo);
    } else {
      this.setData({ userInfo: null });
    }
  },

  refreshUserFromDB: function(currentUser) {
    if (!currentUser || !currentUser._openid) return;
    var that = this;
    var app = getApp();
    var db = wx.cloud.database();
    db.collection('users').where({ _openid: currentUser._openid }).limit(1).get({
      success: function(res) {
        if (res.data && res.data.length > 0) {
          var dbUser = res.data[0];
          var needUpdate = false;
          if (dbUser.avatarUrl && dbUser.avatarUrl !== currentUser.avatarUrl) {
            currentUser.avatarUrl = dbUser.avatarUrl;
            needUpdate = true;
          }
          if (dbUser.nickName && dbUser.nickName !== currentUser.nickName) {
            currentUser.nickName = dbUser.nickName;
            needUpdate = true;
          }
          if (needUpdate) {
            app.saveUserInfo(currentUser);
            that.setData({ userInfo: currentUser });
          }
        }
      },
      fail: function() {}
    });
  },

  getUserStats: function() {
    var that = this;
    var app = getApp();
    if (!app.globalData.userInfo) {
      that.setData({ isLoading: false, totalStudyTime: 0, todayStudyTime: 0, weekStudyTime: 0, monthStudyTime: 0, studyCount: 0 });
      return;
    }
    that.setData({ isLoading: true });
    wx.cloud.callFunction({
      name: 'getUserStats',
      success: function(res) {
        if (res.result.success) {
          var d = res.result.data || {};
          that.setData({
            totalStudyTime: d.totalStudyTime || 0,
            todayStudyTime: d.todayStudyTime || 0,
            weekStudyTime: d.weekStudyTime || 0,
            monthStudyTime: d.monthStudyTime || 0,
            studyCount: d.studyCount || 0,
            isLoading: false
          });
        }
      },
      fail: function(err) { console.error('获取用户统计失败:', err); that.setData({ isLoading: false }); }
    });
  },

  getStudyRecords: function() {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (!userInfo) {
      that.setData({ studyRecords: [], pagedRecords: [], totalPages: 1, currentPage: 1 });
      return;
    }
    var db = wx.cloud.database();
    db.collection('study_records').where({ userId: userInfo._openid }).orderBy('endTime', 'desc').limit(100).get({
      success: function(res) {
        var studyRecords = res.data || [];
        var pageSize = that.data.pageSize;
        var totalPages = Math.max(1, Math.ceil(studyRecords.length / pageSize));
        var currentPage = Math.min(that.data.currentPage, totalPages);
        var pagedRecords = studyRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        that.setData({ studyRecords: studyRecords, pagedRecords: pagedRecords, currentPage: currentPage, totalPages: totalPages });
      },
      fail: function(err) { console.error('获取自习记录失败:', err); }
    });
  },

  prevPage: function() {
    if (this.data.currentPage <= 1) return;
    this.setData({ currentPage: this.data.currentPage - 1 });
    this.updatePaged();
  },

  nextPage: function() {
    if (this.data.currentPage >= this.data.totalPages) return;
    this.setData({ currentPage: this.data.currentPage + 1 });
    this.updatePaged();
  },

  updatePaged: function() {
    var d = this.data;
    var records = d.studyRecords;
    var page = d.currentPage;
    var size = d.pageSize;
    var start = (page - 1) * size;
    var end = page * size;
    var paged = records.slice(start, end);
    this.setData({ pagedRecords: paged });
  },

  getOrders: function() {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (!userInfo) {
      that.setData({ orders: [] });
      return;
    }
    var db = wx.cloud.database();
    var oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    db.collection('orders').where({ userId: userInfo._openid, createdAt: db.command.gte(oneYearAgo) }).orderBy('createdAt', 'desc').get({
      success: function(res) {
        var rawData = res.data || [];
        var orders = [];
        for (var i = 0; i < rawData.length; i++) {
          var item = rawData[i];
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
            duration: item.duration || 0,
            couponUsed: item.couponUsed,
            couponDiscount: item.couponDiscount,
            userId: item.userId,
            orderId: item.orderId,
            formattedDate: that.formatDate(item.createdAt)
          });
        }
        that.setData({ orders: orders });
      },
      fail: function(err) { console.error('获取订单列表失败:', err); that.setData({ orders: [] }); }
    });
  },

  goToOrders: function() { wx.navigateTo({ url: '/pages/orders/orders' }); },
  goToCoupons: function() { wx.navigateTo({ url: '/pages/coupons/coupons' }); },

  getCouponCount: function() {
    var that = this;
    var app = getApp();
    if (!app.globalData.userInfo) { that.setData({ couponCount: 0 }); return; }
    wx.cloud.callFunction({
      name: 'couponManager',
      data: { action: 'getUserCoupons' },
      success: function(res) {
        if (res.result && res.result.success && res.result.summary) {
          that.setData({ couponCount: res.result.summary.available });
        } else {
          that.setData({ couponCount: 0 });
        }
      },
      fail: function() { that.setData({ couponCount: 0 }); }
    });
  },

  handleLogin: function() {
    var that = this;
    wx.getUserProfile({
      desc: "用于登录自习室系统",
      success: function(userRes) {
        wx.showLoading({ title: "登录中" });
        wx.cloud.callFunction({
          name: "login",
          data: { userInfo: userRes.userInfo },
          success: function(cloudRes) {
            if (cloudRes.result.success) {
              var app = getApp();
              var userData = cloudRes.result.data;
              app.saveUserInfo(userData);
              that.setData({ userInfo: userData });
              that.migrateAvatarIfNeeded(userData);
              that.getUserStats();
              that.getStudyRecords();
              that.getOrders();
              wx.hideLoading();
              wx.showToast({ title: "登录成功", icon: "success" });
            } else {
              wx.hideLoading();
              wx.showToast({ title: "登录失败", icon: "none" });
            }
          },
          fail: function(err) {
            wx.hideLoading();
            wx.showToast({ title: "请部署云函数", icon: "none" });
          }
        });
      },
      fail: function(err) {
        if (err.errMsg && err.errMsg.indexOf('user deny') !== -1) {
          wx.showModal({
            title: '授权提示',
            content: '您已拒绝授权，请在微信设置中重新授权小程序获取用户信息',
            success: function(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting({});
              }
            }
          });
        } else {
          wx.showToast({ title: "授权失败", icon: "none" });
        }
      }
    });
  },

  migrateAvatarIfNeeded: function(userData) {
    if (!userData.avatarUrl || userData.avatarUrl.indexOf('cloud://') === 0) return;
    if (userData.avatarUrl.indexOf('mmbiz.qpic.cn') > -1) return;

    var that = this;
    var app = getApp();
    wx.downloadFile({
      url: userData.avatarUrl,
      success: function(downloadRes) {
        if (downloadRes.statusCode === 200) {
          var openid = userData._openid || 'unknown';
          var cloudPath = 'avatars/' + openid + '_' + Date.now() + '.png';
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: downloadRes.tempFilePath,
            success: function(uploadRes) {
              var fileID = uploadRes.fileID;
              userData.avatarUrl = fileID;
              wx.cloud.callFunction({
                name: 'updateAvatar',
                data: { avatarUrl: fileID },
                success: function() {
                  app.saveUserInfo(userData);
                  that.setData({ userInfo: userData });
                }
              });
            }
          });
        }
      }
    });
  },

  formatTime: function(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
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
    var hr = d.getHours(); var min = d.getMinutes();
    var mos = mo.toString(); var ds = day.toString(); var hrs = hr.toString(); var mins = min.toString();
    if (mos.length < 2) mos = '0' + mos;
    if (ds.length < 2) ds = '0' + ds;
    if (hrs.length < 2) hrs = '0' + hrs;
    if (mins.length < 2) mins = '0' + mins;
    return y + '-' + mos + '-' + ds + ' ' + hrs + ':' + mins;
  },

  handleLogout: function() {
    var that = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: function(res) {
        if (res.confirm) {
          var app = getApp();
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          if (app.globalData.studyTimer) {
            clearInterval(app.globalData.studyTimer);
            app.globalData.studyTimer = null;
            app.globalData.currentSeat = null;
            app.globalData.studyDuration = 0;
          }
          that.setData({
            userInfo: null,
            totalStudyTime: 0,
            todayStudyTime: 0,
            weekStudyTime: 0,
            monthStudyTime: 0,
            studyCount: 0,
            studyRecords: [],
            orders: []
          });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  showNicknameDialog: function() {
    if (this.data.userInfo) {
      this.setData({ showNicknameDialog: true, newNickname: this.data.userInfo.nickName });
    }
  },

  closeNicknameDialog: function() {
    this.setData({ showNicknameDialog: false, newNickname: '' });
  },

  onNicknameOverlayTap: function(e) {
    if (e.target === e.currentTarget) { this.closeNicknameDialog(); }
  },

  preventBubble: function() {},

  onNicknameInput: function(e) {
    this.setData({ newNickname: e.detail.value });
  },

  updateNickname: function() {
    var that = this;
    var newNickname = this.data.newNickname.trim();
    if (!newNickname || newNickname.length < 2) {
      wx.showToast({ title: '昵称长度至少2个字符', icon: 'none' });
      return;
    }
    if (newNickname.length > 20) {
      wx.showToast({ title: '昵称长度不能超过20个字符', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '修改中...' });
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: { nickName: newNickname },
      success: function(res) {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({ title: '昵称更新成功', icon: 'success' });
          var app = getApp();
          var newUserInfo = Object.assign({}, res.result.data);
          app.saveUserInfo(newUserInfo);
          that.setData({ userInfo: newUserInfo, showNicknameDialog: false, newNickname: '' });
        } else {
          wx.showToast({ title: res.result.error || '更新失败', icon: 'none' });
        }
      },
      fail: function(err) {
        wx.hideLoading();
        wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      }
    });
  },

  chooseAvatar: function() {
    this.setData({ showAvatarDialog: true });
  },

  closeAvatarDialog: function() {
    this.setData({ showAvatarDialog: false });
  },

  onAvatarOverlayTap: function(e) {
    if (e.target === e.currentTarget) { this.closeAvatarDialog(); }
  },

  chooseAvatarFromAlbum: function() {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: function(imgRes) {
        var tempFilePaths = imgRes.tempFilePaths;
        that.uploadAvatarToCloud(tempFilePaths[0]);
      },
      fail: function(err) {
        wx.showToast({ title: '选择头像失败', icon: 'none' });
      }
    });
  },

  useDefaultAvatar: function() {
    this.updateAvatar(this.data.defaultAvatar);
  },

  uploadAvatarToCloud: function(tempFilePath) {
    var that = this;
    wx.showLoading({ title: '上传中...' });
    var app = getApp();
    var openid = app.globalData.userInfo ? app.globalData.userInfo._openid : 'unknown';
    var cloudPath = 'avatars/' + openid + '_' + Date.now() + '.jpg';
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath,
      success: function(uploadRes) {
        var fileID = uploadRes.fileID;
        that.updateAvatar(fileID);
      },
      fail: function(err) {
        wx.hideLoading();
        wx.showToast({ title: '上传头像失败', icon: 'none' });
      }
    });
  },

  updateAvatar: function(avatarUrl) {
    var that = this;
    wx.showLoading({ title: '更新中...' });
    wx.cloud.callFunction({
      name: 'updateAvatar',
      data: { avatarUrl: avatarUrl },
      success: function(res) {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({ title: '头像更新成功', icon: 'success' });
          var app = getApp();
          var newUserInfo = Object.assign({}, res.result.data);
          app.saveUserInfo(newUserInfo);
          that.setData({ userInfo: newUserInfo, showAvatarDialog: false });
        } else {
          wx.showToast({ title: res.result.error || '更新失败', icon: 'none' });
        }
      },
      fail: function(err) {
        wx.hideLoading();
        wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      }
    });
  },

  onAvatarError: function(e) {
    var userInfo = this.data.userInfo;
    if (userInfo) {
      userInfo.avatarUrl = this.data.defaultAvatar;
      this.setData({ userInfo: userInfo });
    }
  }
});
