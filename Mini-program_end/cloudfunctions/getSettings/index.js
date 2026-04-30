const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_ZONE_PRICES = {
  immersive: { hour: 3, day: 21, week: 126 },
  sunshine: { hour: 4, day: 28, week: 168 },
  vip: { hour: 6, day: 42, week: 252 }
}

const DEFAULT_SETTINGS = {
  zonePrices: DEFAULT_ZONE_PRICES,
  reminderMinutes: 30,
  gracePeriodSeconds: 60,
  checkIntervalMs: 5000,
  newUserCouponType: 'standard',
  couponExpireDays: 365,
  openTime: '06:00',
  closeTime: '23:00',
  maintenanceMode: false,
  maintenanceMessage: '系统维护中，请稍后再试'
}

function mergeZonePrices(cloudPrices) {
  if (!cloudPrices) return DEFAULT_ZONE_PRICES
  var merged = {}
  var zones = ['immersive', 'sunshine', 'vip']
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i]
    merged[z] = {
      hour: (cloudPrices[z] && cloudPrices[z].hour) || DEFAULT_ZONE_PRICES[z].hour,
      day: (cloudPrices[z] && cloudPrices[z].day) || DEFAULT_ZONE_PRICES[z].day,
      week: (cloudPrices[z] && cloudPrices[z].week) || DEFAULT_ZONE_PRICES[z].week
    }
  }
  return merged
}

exports.main = async (event, context) => {
  const { action } = event

  if (action === 'getSettings') {
    try {
      const res = await db.collection('system_settings').doc('global').get()
      var settings = { ...DEFAULT_SETTINGS, ...res.data }
      settings.zonePrices = mergeZonePrices(settings.zonePrices)
      delete settings._id
      delete settings._openid
      return { success: true, data: settings }
    } catch (error) {
      return { success: true, data: DEFAULT_SETTINGS }
    }
  }

  if (action === 'saveSettings') {
    try {
      const { settingsData } = event
      if (!settingsData) return { success: false, error: '缺少设置数据' }

      const data = { ...settingsData, updatedAt: db.serverDate() }

      let docExists = false
      try {
        const checkRes = await db.collection('system_settings').doc('global').get()
        if (checkRes.data && checkRes.data._id) docExists = true
      } catch (e) {
        docExists = false
      }

      if (docExists) {
        delete data._id
        delete data._openid
        await db.collection('system_settings').doc('global').update({ data })
      } else {
        data.createdAt = db.serverDate()
        await db.collection('system_settings').doc('global').set({ data })
      }

      return { success: true }
    } catch (error) {
      console.error('saveSettings error:', error)
      return { success: false, error: error.message || '保存失败' }
    }
  }

  if (action === 'getZonePrices') {
    try {
      const res = await db.collection('system_settings').doc('global').get()
      var zonePrices = mergeZonePrices((res.data && res.data.zonePrices) || null)
      return { success: true, data: zonePrices }
    } catch (error) {
      return { success: true, data: DEFAULT_ZONE_PRICES }
    }
  }

  if (action === 'getAnnouncements') {
    try {
      const now = new Date()
      const res = await db.collection('announcements')
        .where({ status: 'active' })
        .orderBy('isPinned', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

      const announcements = (res.data || []).filter(a => {
        if (a.startTime && new Date(a.startTime) > now) return false
        if (a.endTime && new Date(a.endTime) < now) return false
        return true
      })

      return { success: true, data: announcements }
    } catch (error) {
      return { success: true, data: [] }
    }
  }

  if (action === 'getAllAnnouncements') {
    try {
      const res = await db.collection('announcements')
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get()
      return { success: true, data: res.data || [] }
    } catch (error) {
      return { success: true, data: [] }
    }
  }

  if (action === 'saveAnnouncement') {
    try {
      const { announcementData, editId } = event
      if (!announcementData) return { success: false, error: '缺少公告数据' }

      const data = { ...announcementData, updatedAt: db.serverDate() }
      delete data._id
      delete data._openid

      if (editId) {
        await db.collection('announcements').doc(editId).update({ data })
      } else {
        data.createdAt = db.serverDate()
        await db.collection('announcements').add({ data })
      }

      return { success: true }
    } catch (error) {
      console.error('saveAnnouncement error:', error)
      return { success: false, error: error.message || '保存失败' }
    }
  }

  if (action === 'updateAnnouncement') {
    try {
      const { announcementId, updateData } = event
      if (!announcementId || !updateData) return { success: false, error: '参数不完整' }

      const data = { ...updateData, updatedAt: db.serverDate() }
      delete data._id
      delete data._openid

      await db.collection('announcements').doc(announcementId).update({ data })
      return { success: true }
    } catch (error) {
      console.error('updateAnnouncement error:', error)
      return { success: false, error: error.message || '更新失败' }
    }
  }

  if (action === 'deleteAnnouncement') {
    try {
      const { announcementId } = event
      if (!announcementId) return { success: false, error: '缺少公告ID' }

      await db.collection('announcements').doc(announcementId).remove()
      return { success: true }
    } catch (error) {
      console.error('deleteAnnouncement error:', error)
      return { success: false, error: error.message || '删除失败' }
    }
  }

  if (action === 'getAllCoupons') {
    try {
      const res = await db.collection('coupon')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get()
      return { success: true, data: res.data || [] }
    } catch (error) {
      return { success: true, data: [] }
    }
  }

  if (action === 'createCoupons') {
    try {
      const { couponData } = event
      if (!couponData) return { success: false, error: '缺少优惠券数据' }

      var type = couponData.type || '满10减3'
      var minAmount = couponData.minAmount || 10
      var discountAmount = couponData.discountAmount || 3
      var count = couponData.count || 1
      var expireDays = couponData.expireDays || 365
      var method = couponData.method || 'pool'

      var now = new Date()
      var expireAt = new Date(now.getTime() + expireDays * 24 * 60 * 60 * 1000)
      var openid = method === 'pool' ? 'POOL' : 'NEW_USER'
      var status = method === 'pool' ? 'available' : 'pending'

      var couponsToAdd = []
      for (var i = 0; i < count; i++) {
        couponsToAdd.push({
          _openid: openid,
          type: type,
          minAmount: minAmount,
          discountAmount: discountAmount,
          status: status,
          usedAt: null,
          usedOrderId: null,
          expireAt: expireAt,
          source: method,
          createdAt: now,
          updatedAt: now
        })
      }

      if (couponsToAdd.length > 0) {
        await db.collection('coupon').add({ data: couponsToAdd })
      }

      return { success: true, count: couponsToAdd.length }
    } catch (error) {
      console.error('createCoupons error:', error)
      return { success: false, error: error.message || '创建失败' }
    }
  }

  if (action === 'batchCreateNewUserCoupons') {
    try {
      var now = new Date()
      var expireAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      var templates = [
        { type: '满10减3', minAmount: 10, discountAmount: 3, count: 10 },
        { type: '满50减15', minAmount: 50, discountAmount: 15, count: 10 },
        { type: '满300减100', minAmount: 300, discountAmount: 100, count: 10 }
      ]
      var couponsToAdd = []
      for (var t = 0; t < templates.length; t++) {
        var tp = templates[t]
        for (var j = 0; j < tp.count; j++) {
          couponsToAdd.push({
            _openid: 'NEW_USER',
            type: tp.type,
            minAmount: tp.minAmount,
            discountAmount: tp.discountAmount,
            status: 'pending',
            usedAt: null,
            usedOrderId: null,
            expireAt: expireAt,
            source: 'newuser',
            createdAt: now,
            updatedAt: now
          })
        }
      }
      if (couponsToAdd.length > 0) {
        await db.collection('coupon').add({ data: couponsToAdd })
      }
      return { success: true, count: couponsToAdd.length }
    } catch (error) {
      console.error('batchCreateNewUserCoupons error:', error)
      return { success: false, error: error.message || '批量创建失败' }
    }
  }

  if (action === 'deleteCoupon') {
    try {
      const { couponId } = event
      if (!couponId) return { success: false, error: '缺少优惠券ID' }

      await db.collection('coupon').doc(couponId).remove()
      return { success: true }
    } catch (error) {
      console.error('deleteCoupon error:', error)
      return { success: false, error: error.message || '删除失败' }
    }
  }

  return { success: false, error: '未知操作' }
}
