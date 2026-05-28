// seat.js - 座位管理页面
var i18n = require('../../i18n/i18n.js')
var zoneConfig = {
  immersive: {
    key: 'immersive',
    name: '沉浸区',
    fullName: '沉浸区独立包间',
    tagline: '深度专注，静音无干扰',
    pricePerHour: 3,
    pricePerDay: 21,
    pricePerWeek: 126,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    gradientClass: 'zone-immersive',
    icon: '🤫',
    features: [
      { icon: '🔇', title: '全封闭强隔音', desc: '无外窗设计，极致静音' },
      { icon: '📱', title: '小程序智控', desc: '灯光、空调、门锁一键开关' },
      { icon: '💡', title: '高性价比', desc: '基础实用配置，专注学习空间' }
    ]
  },
  sunshine: {
    key: 'sunshine',
    name: '阳光区',
    fullName: '阳光区独立包间',
    tagline: '采光舒适，兼顾私密与解压',
    pricePerHour: 4,
    pricePerDay: 28,
    pricePerWeek: 168,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    gradientClass: 'zone-sunshine',
    icon: '☀️',
    features: [
      { icon: '🪟', title: '全景落地窗', desc: '可调遮光帘，自然采光' },
      { icon: '📱', title: '小程序智控', desc: '灯光、空调、门锁一键开关' },
      { icon: '🪑', title: '舒适配置', desc: '加宽桌面+舒适座椅' }
    ]
  },
  vip: {
    key: 'vip',
    name: 'VIP区',
    fullName: 'VIP区独立包间',
    tagline: '顶配私密，高端尊享',
    pricePerHour: 6,
    pricePerDay: 42,
    pricePerWeek: 252,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#C4B5FD',
    gradientClass: 'zone-vip',
    icon: '👑',
    features: [
      { icon: '🪟', title: '全景落地窗', desc: '可调遮光帘，自然采光' },
      { icon: '🏗️', title: '超大空间', desc: '双层隔音，极致私密' },
      { icon: '📱', title: '小程序智控', desc: '灯光、空调、门锁一键开关' },
      { icon: '🪑', title: '顶配硬件', desc: '人体工学椅+无线充电+带锁收纳' }
    ]
  }
};

function applyCloudPrices(zonePrices) {
  if (!zonePrices) return;
  var zones = ['immersive', 'sunshine', 'vip'];
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
    if (zonePrices[z] && zoneConfig[z]) {
      zoneConfig[z].pricePerHour = zonePrices[z].hour || zoneConfig[z].pricePerHour;
      zoneConfig[z].pricePerDay = zonePrices[z].day || zoneConfig[z].pricePerDay;
      zoneConfig[z].pricePerWeek = zonePrices[z].week || zoneConfig[z].pricePerWeek;
    }
  }
}

function getZoneByRow(row) {
  if (row >= 1 && row <= 3) return zoneConfig.immersive;
  if (row >= 4 && row <= 5) return zoneConfig.sunshine;
  if (row === 6) return zoneConfig.vip;
  return zoneConfig.immersive;
}

function getZoneBySeatNumber(seatNumber) {
  if (!seatNumber) return zoneConfig.immersive;
  var row = parseInt(seatNumber.split('-')[0], 10);
  return getZoneByRow(row);
}

Page({
  data: {
    i18n: {},
    currentLang: 'zh-CN',
    seats: [],
    seatsByRow: {},
    rowNumbers: [],
    maxCol: 8,
    colNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    isLoading: true,
    userInfo: null,
    showReserveModal: false,
    selectedSeat: null,
    planType: 'hour',
    quantityIndex: 0,
    quantityOptions: [],
    planUnitText: '小时',
    unitPrice: 3,
    totalPrice: 3,
    expireDate: '',
    autoReleaseDate: '',
    hasActiveOrder: false,
    activeOrderInfo: null,
    availableCoupons: [],
    selectedCouponId: '',
    selectedCoupon: null,
    finalPrice: 3,
    showCouponList: false,
    showCouponPicker: false,
    zoneRooms: [
      { key: 'immersive', name: '沉浸区', fullName: '沉浸区独立包间', tagline: '深度专注，静音无干扰', pricePerHour: 3, icon: '🤫', color: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', seatRange: '1-1 ~ 3-8', seatCount: 24 },
      { key: 'sunshine', name: '阳光区', fullName: '阳光区独立包间', tagline: '采光舒适，兼顾私密与解压', pricePerHour: 4, icon: '☀️', color: '#F59E0B', bgColor: '#FFFBEB', borderColor: '#FDE68A', seatRange: '4-1 ~ 5-8', seatCount: 16 },
      { key: 'vip', name: 'VIP区', fullName: 'VIP区独立包间', tagline: '顶配私密，高端尊享', pricePerHour: 6, icon: '👑', color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#C4B5FD', seatRange: '6-1 ~ 6-8', seatCount: 8 }
    ],
    showRoomDetail: false,
    roomDetail: null,
    zoneHeaders: [],
    currentZone: null
  },

  onLoad: function () { this.applyLanguage(); this.initData(); },

  onShow: function () {
    this.applyLanguage();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().applyLanguage();
      this.getTabBar().switchTo(1);
    }
    this.checkLoginStatus();
    this.checkActiveOrder();
  },

  onHide: function () { this.stopSeatsWatch(); },

  onUnload: function () { this.stopSeatsWatch(); },

  applyLanguage: function() {
    var lang = i18n.getCurrentLang()
    var text = i18n.getPageText('seat')
    this.setData({ i18n: text, currentLang: lang })
    this.updateZoneRoomsI18n()
    if (text.immersiveZone) {
      zoneConfig.immersive.name = text.immersiveZone
      zoneConfig.immersive.fullName = text.immersiveFull
      zoneConfig.immersive.tagline = text.immersiveTagline
      zoneConfig.sunshine.name = text.sunshineZone
      zoneConfig.sunshine.fullName = text.sunshineFull
      zoneConfig.sunshine.tagline = text.sunshineTagline
      zoneConfig.vip.name = text.vipZone
      zoneConfig.vip.fullName = text.vipFull
      zoneConfig.vip.tagline = text.vipTagline
      if (text.feature1Title) {
        zoneConfig.immersive.features[0].title = text.feature1Title
        zoneConfig.immersive.features[0].desc = text.feature1Desc
        zoneConfig.immersive.features[1].title = text.feature2Title
        zoneConfig.immersive.features[1].desc = text.feature2Desc
        zoneConfig.immersive.features[2].title = text.feature3Title
        zoneConfig.immersive.features[2].desc = text.feature3Desc
        zoneConfig.sunshine.features[0].title = text.feature4Title
        zoneConfig.sunshine.features[0].desc = text.feature4Desc
        zoneConfig.sunshine.features[1].title = text.feature2Title
        zoneConfig.sunshine.features[1].desc = text.feature2Desc
        zoneConfig.sunshine.features[2].title = text.feature5Title
        zoneConfig.sunshine.features[2].desc = text.feature5Desc
        zoneConfig.vip.features[0].title = text.feature4Title
        zoneConfig.vip.features[0].desc = text.feature4Desc
        zoneConfig.vip.features[1].title = text.feature6Title
        zoneConfig.vip.features[1].desc = text.feature6Desc
        zoneConfig.vip.features[2].title = text.feature2Title
        zoneConfig.vip.features[2].desc = text.feature2Desc
        zoneConfig.vip.features[3].title = text.feature7Title
        zoneConfig.vip.features[3].desc = text.feature7Desc
      }
    }
  },

  updateZoneRoomsI18n: function() {
    var text = this.data.i18n
    if (!text || !text.immersiveZone) return
    var zoneRooms = this.data.zoneRooms
    zoneRooms[0].name = text.immersiveZone
    zoneRooms[0].fullName = text.immersiveFull
    zoneRooms[0].tagline = text.immersiveTagline
    zoneRooms[1].name = text.sunshineZone
    zoneRooms[1].fullName = text.sunshineFull
    zoneRooms[1].tagline = text.sunshineTagline
    zoneRooms[2].name = text.vipZone
    zoneRooms[2].fullName = text.vipFull
    zoneRooms[2].tagline = text.vipTagline
    this.setData({ zoneRooms: zoneRooms })
  },

  initData: function () {
    this.checkLoginStatus();
    this.syncZonePrices();
    this.getSeats();
    this.checkActiveOrder();
  },

  syncZonePrices: function () {
    var app = getApp();
    var prices = app.globalData.zonePrices;
    if (prices) {
      applyCloudPrices(prices);
      this.updateZoneRoomsData();
    }
  },

  updateZoneRoomsData: function () {
    this.setData({
      zoneRooms: [
        { key: 'immersive', name: '沉浸区', fullName: '沉浸区独立包间', tagline: '深度专注，静音无干扰', pricePerHour: zoneConfig.immersive.pricePerHour, icon: '🤫', color: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', seatRange: '1-1 ~ 3-8', seatCount: 24 },
        { key: 'sunshine', name: '阳光区', fullName: '阳光区独立包间', tagline: '采光舒适，兼顾私密与解压', pricePerHour: zoneConfig.sunshine.pricePerHour, icon: '☀️', color: '#F59E0B', bgColor: '#FFFBEB', borderColor: '#FDE68A', seatRange: '4-1 ~ 5-8', seatCount: 16 },
        { key: 'vip', name: 'VIP区', fullName: 'VIP区独立包间', tagline: '顶配私密，高端尊享', pricePerHour: zoneConfig.vip.pricePerHour, icon: '👑', color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#C4B5FD', seatRange: '6-1 ~ 6-8', seatCount: 8 }
      ]
    });
    this.updateZoneRoomsI18n();
  },

  manualRefresh: function () {
    var that = this;
    that.setData({ isLoading: true });
    that.getSeats();
    that.checkActiveOrder();
    wx.showToast({ title: that.data.i18n.refreshed || '已刷新', icon: 'success', duration: 1000 });
  },

  showRoomDetailModal: function (e) {
    var key = e.currentTarget.dataset.key;
    var zone = zoneConfig[key];
    if (!zone) return;
    this.setData({ showRoomDetail: true, roomDetail: zone });
  },

  closeRoomDetail: function () {
    this.setData({ showRoomDetail: false, roomDetail: null });
  },

  onRoomDetailOverlayTap: function (e) {
    if (e.target === e.currentTarget) { this.closeRoomDetail(); }
  },

  checkActiveOrder: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (!userInfo) {
      that.setData({ hasActiveOrder: false, activeOrderInfo: null });
      return;
    }
    var db = wx.cloud.database();
    var now = new Date();
    db.collection('seats').where({ userId: userInfo._openid, status: db.command.in(['已订', '使用中']) }).limit(1).get({
      success: function (seatRes) {
        if (!seatRes.data || seatRes.data.length === 0) {
          that.setData({ hasActiveOrder: false, activeOrderInfo: null });
          return;
        }
        var seat = seatRes.data[0];
        if (!seat.orderId) {
          that.setData({ hasActiveOrder: false, activeOrderInfo: null });
          return;
        }
        db.collection('orders').doc(seat.orderId).get({
          success: function (orderRes) {
            if (!orderRes.data) {
              that.setData({ hasActiveOrder: false, activeOrderInfo: null });
              return;
            }
            var order = orderRes.data;
            if (order.status !== 'paid') {
              that.setData({ hasActiveOrder: false, activeOrderInfo: null });
              return;
            }
            var expireTime = new Date(order.expireAt);
            if (expireTime <= now) {
              that.setData({ hasActiveOrder: false, activeOrderInfo: null });
              return;
            }
            that.setData({
              hasActiveOrder: true,
              activeOrderInfo: {
                orderId: order._id,
                seatNumber: order.seatNumber || seat.seatNumber,
                expireAt: order.expireAt,
                formattedExpireAt: that.formatDate(order.expireAt),
                planType: order.planType,
                totalPrice: order.totalPrice
              }
            });
          },
          fail: function () { that.setData({ hasActiveOrder: false, activeOrderInfo: null }); }
        });
      },
      fail: function () { that.setData({ hasActiveOrder: false, activeOrderInfo: null }); }
    });
  },

  formatDate: function (date) {
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

  goToStudy: function () { wx.switchTab({ url: '/pages/study/study' }); },

  checkLoginStatus: function () {
    var app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
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

  buildZoneHeaders: function (rowNumbers) {
    var headers = [];
    var zoneRanges = [
      { zone: zoneConfig.immersive, startRow: 1, endRow: 3 },
      { zone: zoneConfig.sunshine, startRow: 4, endRow: 5 },
      { zone: zoneConfig.vip, startRow: 6, endRow: 6 }
    ];
    for (var zi = 0; zi < zoneRanges.length; zi++) {
      var zr = zoneRanges[zi];
      var hasRow = false;
      for (var ri = 0; ri < rowNumbers.length; ri++) {
        if (rowNumbers[ri] >= zr.startRow && rowNumbers[ri] <= zr.endRow) {
          hasRow = true;
          break;
        }
      }
      if (hasRow) {
        headers.push({ row: zr.startRow, zone: zr.zone });
      }
    }
    return headers;
  },

  getSeats: function () {
    var that = this;
    that.setData({ isLoading: true });

    var applySeats = function (seatArray) {
      var seats = Array.isArray(seatArray) ? seatArray : [];
      var seatsByRow = {};
      var rowNumbers = [];
      var maxCol = 8;

      for (var si = 0; si < seats.length; si++) {
        var seat = seats[si];
        var row = Number(seat.row) || 0;
        var col = Number(seat.col) || 0;
        if (row < 1 || row > 6 || col < 1 || col > 8) continue;
        if (!seatsByRow[row]) {
          seatsByRow[row] = {};
          rowNumbers.push(row);
        }
        seatsByRow[row][col] = seat;
      }

      rowNumbers.sort(function (a, b) { return a - b; });

      var zoneHeaders = that.buildZoneHeaders(rowNumbers);

      that.setData({
        seats: seats,
        seatsByRow: seatsByRow,
        rowNumbers: rowNumbers,
        maxCol: maxCol,
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
        isLoading: false,
        zoneHeaders: zoneHeaders
      });
    };

    wx.cloud.callFunction({
      name: 'initSeats3',
      data: { action: 'getSeats' },
      success: function (res) {
        var rawData = res.result && res.result.data ? res.result.data : [];
        applySeats(rawData);
      },
      fail: function (err) {
        console.error('获取座位失败:', err);
        that.setData({ isLoading: false });
        wx.showToast({ title: that.data.i18n.loadSeatsFailed || '加载座位失败', icon: 'none' });
      }
    });
  },

  startSeatsWatch: function () {
    var that = this;
    that.stopSeatsWatch();

    console.log('[seat] 🔄 尝试启动座位数据实时监听...');

    var db = wx.cloud.database();
    try {
      that.seatsWatcher = db.collection('seats').watch({
        onChange: function (snapshot) {
          console.log('[seat] ✅ 实时监听收到数据更新');

          if (that.seatsPollingTimer) {
            clearInterval(that.seatsPollingTimer);
            that.seatsPollingTimer = null;
            console.log('[seat] ✓ 停止备用轮询（实时监听已恢复）');
          }

          if (snapshot && Array.isArray(snapshot.docs)) {
            var seatArray = snapshot.docs;
            var seatsByRow = {};
            var rowNumbers = [];
            var maxCol = 8;

            for (var wi = 0; wi < seatArray.length; wi++) {
              var wSeat = seatArray[wi];
              var wRow = Number(wSeat.row) || 0;
              var wCol = Number(wSeat.col) || 0;
              if (wRow < 1 || wRow > 6 || wCol < 1 || wCol > 8) continue;
              if (!seatsByRow[wRow]) {
                seatsByRow[wRow] = {};
                rowNumbers.push(wRow);
              }
              seatsByRow[wRow][wCol] = wSeat;
            }

            rowNumbers.sort(function (a, b) { return a - b; });

            var zoneHeaders = that.buildZoneHeaders(rowNumbers);

            that.setData({
              seats: seatArray,
              seatsByRow: seatsByRow,
              rowNumbers: rowNumbers,
              maxCol: maxCol,
              colNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
              isLoading: false,
              zoneHeaders: zoneHeaders
            });
          } else {
            that.getSeats();
          }
        },
        onError: function (err) {
          console.error('[seat] ❌ 实时监听失败:', err.errCode || err.message || err);
          console.error('[seat]   错误详情:', JSON.stringify(err));

          if (that.seatsWatcher) {
            try { that.seatsWatcher.close(); } catch (e) { }
            that.seatsWatcher = null;
          }

          console.log('[seat] 🔄 启动备用轮询机制（每10秒刷新一次）');
          that.startSeatsPolling();
        }
      });
    } catch (e) {
      console.error('[seat] ❌ 创建监听异常:', e.message || e);
      console.log('[seat] 🔄 启动备用轮询机制');
      that.startSeatsPolling();
    }
  },

  startSeatsPolling: function () {
    var that = this;

    if (that.seatsPollingTimer) {
      clearInterval(that.seatsPollingTimer);
    }

    that.getSeats();

    that.seatsPollingTimer = setInterval(function () {
      console.log('[seat] ⏱️ 备用轮询执行 - 刷新座位数据');
      that.getSeats();
      that.checkActiveOrder();
    }, 10000);

    console.log('[seat] ✓ 备用轮询已启动（间隔: 10秒）');
  },

  stopSeatsWatch: function () {
    if (this.seatsWatcher) {
      try { this.seatsWatcher.close(); } catch (e) { }
      this.seatsWatcher = null;
    }
    if (this.seatsPollingTimer) {
      clearInterval(this.seatsPollingTimer);
      this.seatsPollingTimer = null;
      console.log('[seat] ✓ 备用轮询已停止');
    }
  },

  selectSeat: function (e) {
    var that = this;
    var seatId = e.currentTarget.dataset.seatId;
    var seat = null;
    for (var fi = 0; fi < this.data.seats.length; fi++) {
      if (this.data.seats[fi]._id === seatId) {
        seat = this.data.seats[fi];
        break;
      }
    }
    if (!seat) return;

    var app = getApp();
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: that.data.i18n.tip || '提示',
        content: that.data.i18n.pleaseLoginFirst || '请先登录后预订座位',
        success: function (res) {
          if (res.confirm) { wx.switchTab({ url: '/pages/mine/mine' }); }
        }
      });
      return;
    }

    if (that.data.hasActiveOrder) {
      var info = that.data.activeOrderInfo;
      wx.showModal({
        title: that.data.i18n.hasActiveOrder || '您已有进行中的订单',
        content: (that.data.i18n.activeOrderContent || '座位 {seat}，到期时间 {expire}\n\n如需延长学习时间，请前往"学时"页面进行续费操作').replace('{seat}', info.seatNumber).replace('{expire}', info.formattedExpireAt),
        confirmText: that.data.i18n.goRenew || '去续费',
        cancelText: that.data.i18n.know || '知道了',
        success: function (res) {
          if (res.confirm) { wx.switchTab({ url: '/pages/study/study' }); }
        }
      });
      return;
    }

    if (seat.status !== '空闲') {
      wx.showToast({ title: seat.status === '已订' ? (that.data.i18n.reservedSeatTip || '已订座位请到学时界面操作') : (that.data.i18n.seatNotAvailable || '该座位不可预订'), icon: 'none' });
      return;
    }

    var zone = getZoneBySeatNumber(seat.seatNumber);
    var defaultPrice = zone.pricePerHour;

    that.setPlanType({ currentTarget: { dataset: { type: 'hour' } } });
    that.setData({
      selectedSeat: seat,
      showReserveModal: true,
      showCouponPicker: false,
      selectedCouponId: '',
      selectedCoupon: null,
      finalPrice: defaultPrice,
      currentZone: zone
    });
    that.fetchAvailableCoupons();
  },

  onOverlayTap: function (e) {
    if (e.target === e.currentTarget) { this.closeReserveModal(); }
  },

  preventBubble: function () { },

  closeReserveModal: function () {
    this.setData({
      showReserveModal: false,
      showCouponPicker: false,
      selectedSeat: null,
      planType: 'hour',
      quantityIndex: 0,
      quantityOptions: [],
      planUnitText: this.data.i18n.hour || '小时',
      unitPrice: 3,
      totalPrice: 3,
      expireDate: '',
      autoReleaseDate: '',
      availableCoupons: [],
      selectedCouponId: '',
      selectedCoupon: null,
      finalPrice: 3,
      showCouponList: false,
      currentZone: null
    });
  },

  calculateExpireDate: function (quantity, planType) {
    var now = new Date();
    var expireDate = new Date(now.getTime());
    switch (planType) {
      case 'hour': expireDate.setHours(now.getHours() + quantity); break;
      case 'day': expireDate.setDate(now.getDate() + quantity); break;
      case 'week': expireDate.setDate(now.getDate() + (quantity * 7)); break;
    }
    var y = expireDate.getFullYear();
    var mo = expireDate.getMonth() + 1; var day = expireDate.getDate();
    var hr = expireDate.getHours(); var min = expireDate.getMinutes();
    var mos = mo.toString(); var ds = day.toString(); var hrs = hr.toString(); var mins = min.toString();
    if (mos.length < 2) mos = '0' + mos;
    if (ds.length < 2) ds = '0' + ds;
    if (hrs.length < 2) hrs = '0' + hrs;
    if (mins.length < 2) mins = '0' + mins;
    return y + '-' + mos + '-' + ds + ' ' + hrs + ':' + mins;
  },

  calculateAutoReleaseDate: function (quantity, planType) {
    var now = new Date();
    var autoReleaseDate = new Date(now.getTime());
    switch (planType) {
      case 'hour': autoReleaseDate = new Date(now.getTime() + quantity * 60 * 60 * 1000); break;
      case 'day': autoReleaseDate = new Date(now.getTime() + quantity * 24 * 60 * 60 * 1000); break;
      case 'week': autoReleaseDate = new Date(now.getTime() + quantity * 7 * 24 * 60 * 60 * 1000); break;
    }
    var y = autoReleaseDate.getFullYear();
    var mo = autoReleaseDate.getMonth() + 1; var day = autoReleaseDate.getDate();
    var hr = autoReleaseDate.getHours(); var min = autoReleaseDate.getMinutes();
    var mos = mo.toString(); var ds = day.toString(); var hrs = hr.toString(); var mins = min.toString();
    if (mos.length < 2) mos = '0' + mos;
    if (ds.length < 2) ds = '0' + ds;
    if (hrs.length < 2) hrs = '0' + hrs;
    if (mins.length < 2) mins = '0' + mins;
    return {
      date: y + '-' + mos + '-' + ds + ' ' + hrs + ':' + mins,
      timestamp: autoReleaseDate
    };
  },

  setPlanType: function (e) {
    var type = e.currentTarget.dataset.type;
    var zone = this.data.currentZone || zoneConfig.immersive;
    var map = {
      hour: { unitPrice: zone.pricePerHour, max: 24, unitText: this.data.i18n.hour || '小时' },
      day: { unitPrice: zone.pricePerDay, max: 30, unitText: this.data.i18n.day || '天' },
      week: { unitPrice: zone.pricePerWeek, max: 4, unitText: this.data.i18n.week || '周' }
    };
    var cfg = map[type] || map.hour;
    var options = [];
    for (var pi = 1; pi <= cfg.max; pi++) options.push(pi);

    var expireDate = this.calculateExpireDate(1, type);
    var autoReleaseResult = this.calculateAutoReleaseDate(1, type);

    this.setData({
      planType: type,
      quantityIndex: 0,
      quantityOptions: options,
      planUnitText: cfg.unitText,
      unitPrice: cfg.unitPrice,
      totalPrice: cfg.unitPrice * 1,
      expireDate: expireDate,
      autoReleaseDate: autoReleaseResult.date
    });
    this.recalculateFinalPrice();
  },

  bindQuantityChange: function (e) {
    var index = Number(e.detail.value) || 0;
    var quantity = (this.data.quantityOptions[index] || 1);
    var totalPrice = quantity * (Number(this.data.unitPrice) || 0);

    var expireDate = this.calculateExpireDate(quantity, this.data.planType);
    var autoReleaseResult = this.calculateAutoReleaseDate(quantity, this.data.planType);

    this.setData({ quantityIndex: index, totalPrice: totalPrice, expireDate: expireDate, autoReleaseDate: autoReleaseResult.date });
    this.recalculateFinalPrice();
  },

  confirmReserve: function () {
    var that = this;
    if (!this.data.selectedSeat) return;

    var app = getApp();
    if (!app.globalData.userInfo) return;

    var settings = app.globalData.systemSettings;
    if (settings && settings.maintenanceMode) {
      wx.showModal({
        title: that.data.i18n.systemMaintenance || '🔧 系统维护中',
        content: settings.maintenanceMessage || that.data.i18n.systemMaintenanceMsg || '系统维护中，请稍后再试',
        showCancel: false,
        confirmText: that.data.i18n.iKnow || '我知道了'
      });
      return;
    }

    var config = require('../../config');
    var tmplId = (config && config.subscribeTemplateIdExpireReminder) || '';
    if (tmplId) {
      wx.requestSubscribeMessage({
        tmplIds: [tmplId],
        complete: function (subRes) {
          var accepted = subRes && subRes[tmplId] === 'accept';
          wx.cloud.callFunction({
            name: 'reserveSeat',
            data: { action: 'saveSubscribe', accepted: !!accepted }
          });
        }
      });
    }

    var quantity = this.data.quantityOptions[this.data.quantityIndex] || 1;
    var planType = this.data.planType;
    var selectedCoupon = this.data.selectedCoupon;
    var finalPrice = this.data.finalPrice;

    if (selectedCoupon && selectedCoupon._id) {
      wx.cloud.callFunction({
        name: 'couponManager',
        data: { action: 'applyCoupon', couponId: selectedCoupon._id, orderAmount: this.data.totalPrice },
        success: function (couponRes) {
          if (!couponRes.result || !couponRes.result.success) {
            wx.showToast({ title: (couponRes.result && couponRes.result.error) || that.data.i18n.couponApplyFailed || '优惠券使用失败', icon: 'none' });
            return;
          }
          that.doCreateOrder(quantity, planType, finalPrice);
        },
        fail: function () { wx.showToast({ title: that.data.i18n.couponProcessFailed || '优惠券处理失败', icon: 'none' }); }
      });
      return;
    }

    this.doCreateOrder(quantity, planType, finalPrice);
  },

  doCreateOrder: function (quantity, planType, displayPrice) {
    var that = this;
    var config = require('../../config');

    var totalSeconds = 0;
    var autoReleaseAt = new Date();
    switch (planType) {
      case 'hour':
        totalSeconds = quantity * 3600;
        autoReleaseAt = new Date(autoReleaseAt.getTime() + quantity * 60 * 60 * 1000);
        break;
      case 'day':
        totalSeconds = quantity * 86400;
        autoReleaseAt = new Date(autoReleaseAt.getTime() + quantity * 24 * 60 * 60 * 1000);
        break;
      case 'week':
        totalSeconds = quantity * 604800;
        autoReleaseAt = new Date(autoReleaseAt.getTime() + quantity * 7 * 24 * 60 * 60 * 1000);
        break;
    }

    var zone = this.data.currentZone || zoneConfig.immersive;

    wx.showLoading({ title: that.data.i18n.orderCreating || '下单中...' });
    wx.cloud.callFunction({
      name: 'reserveSeat',
      data: {
        action: 'createOrder',
        seatId: this.data.selectedSeat._id,
        planType: planType,
        quantity: quantity,
        totalSeconds: totalSeconds,
        autoReleaseAt: autoReleaseAt,
        zoneKey: zone.key
      },
      success: function (res) {
        wx.hideLoading();
        if (!res.result || !res.result.success) {
          wx.showToast({ title: (res.result && res.result.error) || that.data.i18n.orderFailed || '下单失败', icon: 'none' });
          return;
        }

        var orderId = res.result.data && res.result.data.orderId;
        if (!orderId) {
          wx.showToast({ title: that.data.i18n.orderFailed || '下单失败', icon: 'none' });
          return;
        }

        if (config && config.enableMockPay) {
          wx.showModal({
            title: that.data.i18n.confirmPay || '确认支付',
            content: (that.data.i18n.amountDueLabel || '应付金额') + ' ¥' + displayPrice,
            confirmText: that.data.i18n.payNow || '立即支付',
            cancelText: that.data.i18n.cancel || '取消',
            success: function (r) {
              if (r.confirm) {
                that.confirmPayment(orderId);
              } else {
                wx.cloud.callFunction({
                  name: 'reserveSeat',
                  data: { action: 'cancelOrder', orderId: orderId }
                });
              }
            }
          });
          return;
        }

        var payment = res.result.data && res.result.data.payment;
        if (!payment) {
          wx.showToast({ title: that.data.i18n.missingPayParams || '缺少支付参数', icon: 'none' });
          return;
        }

        wx.requestPayment({
          timeStamp: payment.timeStamp,
          nonceStr: payment.nonceStr,
          package: payment.package,
          signType: payment.signType || 'MD5',
          paySign: payment.paySign,
          success: function () { that.confirmPayment(orderId); },
          fail: function () {
            wx.cloud.callFunction({
              name: 'reserveSeat',
              data: { action: 'cancelOrder', orderId: orderId }
            });
          }
        });
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('下单失败:', err);
        wx.showToast({ title: that.data.i18n.orderFailedRetry || '下单失败，请重试', icon: 'none' });
      }
    });
  },

  confirmPayment: function (orderId) {
    var that = this;
    wx.showLoading({ title: that.data.i18n.confirming || '确认中...' });
    wx.cloud.callFunction({
      name: 'reserveSeat',
      data: { action: 'confirmPayment', orderId: orderId },
      success: function (res) {
        wx.hideLoading();
        if (res.result && res.result.success) {
          wx.showToast({ title: that.data.i18n.paySuccess || '支付成功', icon: 'success' });
          that.closeReserveModal();
          that.getSeats();
        } else {
          wx.showToast({ title: (res.result && res.result.error) || that.data.i18n.confirmFailed || '确认失败', icon: 'none' });
        }
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('确认失败:', err);
        wx.showToast({ title: that.data.i18n.confirmFailed || '确认失败', icon: 'none' });
      }
    });
  },

  fetchAvailableCoupons: function () {
    var that = this;
    var app = getApp();
    if (!app.globalData.userInfo) {
      that.setData({ availableCoupons: [] });
      return;
    }
    wx.cloud.callFunction({
      name: 'couponManager',
      data: { action: 'getUserCoupons' },
      success: function (res) {
        if (res.result && res.result.success) {
          var all = res.result.data || [];
          var now = new Date();
          var available = [];
          for (var ci = 0; ci < all.length; ci++) {
            var c = all[ci];
            if (c.status === 'available' && (!c.expireAt || new Date(c.expireAt) > now)) {
              available.push(c);
            }
          }
          that.setData({ availableCoupons: available });
        } else {
          that.setData({ availableCoupons: [] });
        }
      },
      fail: function () { that.setData({ availableCoupons: [] }); }
    });
  },

  openCouponPicker: function () {
    if (this.data.availableCoupons.length === 0) {
      wx.showToast({ title: this.data.i18n.noAvailableCoupon || '暂无可用优惠券', icon: 'none' });
      return;
    }
    this.setData({ showCouponPicker: true });
  },

  closeCouponPicker: function () {
    this.setData({ showCouponPicker: false });
  },

  selectCouponInPicker: function (e) {
    var couponId = e.currentTarget.dataset.id;
    var coupons = this.data.availableCoupons;
    var coupon = null;
    for (var sci = 0; sci < coupons.length; sci++) {
      if (coupons[sci]._id === couponId) {
        coupon = coupons[sci];
        break;
      }
    }
    if (!coupon) return;
    if (this.data.totalPrice < (coupon.minAmount || 0)) {
      wx.showToast({ title: (this.data.i18n.minAmountRequired || '需满') + (coupon.minAmount || 0) + (this.data.i18n.yuanAvailable || '元可用'), icon: 'none' });
      return;
    }
    this.setData({ selectedCouponId: couponId, selectedCoupon: coupon });
  },

  deselectCouponInPicker: function () {
    this.setData({ selectedCouponId: '', selectedCoupon: null });
  },

  confirmCouponPick: function () {
    this.setData({ showCouponPicker: false });
    this.recalculateFinalPrice();
  },

  selectCoupon: function (e) {
    var couponId = e.currentTarget.dataset.id;
    var coupons = this.data.availableCoupons;
    var coupon = null;
    for (var scj = 0; scj < coupons.length; scj++) {
      if (coupons[scj]._id === couponId) {
        coupon = coupons[scj];
        break;
      }
    }
    if (!coupon) return;
    if (this.data.totalPrice < (coupon.minAmount || 0)) {
      wx.showToast({ title: (this.data.i18n.minAmountRequired || '需满') + coupon.minAmount + (this.data.i18n.yuanAvailable || '元可用'), icon: 'none' });
      return;
    }
    this.setData({ selectedCouponId: couponId, selectedCoupon: coupon, showCouponList: false });
    this.recalculateFinalPrice();
  },

  deselectCoupon: function () {
    this.setData({ selectedCouponId: '', selectedCoupon: null, showCouponList: false });
    this.recalculateFinalPrice();
  },

  recalculateFinalPrice: function () {
    var finalPrice = this.data.totalPrice;
    if (this.data.selectedCoupon && finalPrice >= (this.data.selectedCoupon.minAmount || 0)) {
      finalPrice = Math.max(0, finalPrice - (this.data.selectedCoupon.discountAmount || 0));
    }
    this.setData({ finalPrice: finalPrice });
  }
});
