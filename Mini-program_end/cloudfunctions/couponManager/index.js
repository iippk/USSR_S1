const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const couponCollection = db.collection('coupon')

const NEW_USER_COUPONS = [
  { type: '满10减3', minAmount: 10, discountAmount: 3, count: 2 },
  { type: '满50减15', minAmount: 50, discountAmount: 15, count: 2 },
  { type: '满300减100', minAmount: 300, discountAmount: 100, count: 2 }
]

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()
    const { action, couponId, orderAmount, couponType } = event
    const now = new Date()

    if (!action) {
      return { success: false, error: '无效的操作' }
    }

    if (action === 'initCoupons') {
      const existing = await couponCollection.where({ _openid: OPENID }).count()
      if (existing.total > 0) {
        return { success: true, message: '优惠券已初始化', data: [] }
      }

      var claimed = 0
      var newUserPool = await couponCollection.where({
        _openid: 'NEW_USER',
        status: 'pending'
      }).limit(6).get()

      if (newUserPool.data && newUserPool.data.length > 0) {
        for (var i = 0; i < newUserPool.data.length; i++) {
          try {
            await couponCollection.doc(newUserPool.data[i]._id).update({
              data: {
                _openid: OPENID,
                status: 'available',
                claimedAt: now,
                updatedAt: now
              }
            })
            claimed++
          } catch (e) { }
        }
      }

      if (claimed < 6) {
        var expireAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        var couponsToAdd = []
        for (var t = 0; t < NEW_USER_COUPONS.length; t++) {
          var template = NEW_USER_COUPONS[t]
          for (var j = 0; j < template.count; j++) {
            couponsToAdd.push({
              _openid: OPENID,
              type: template.type,
              minAmount: template.minAmount,
              discountAmount: template.discountAmount,
              status: 'available',
              usedAt: null,
              usedOrderId: null,
              expireAt: expireAt,
              source: 'newuser',
              createdAt: now
            })
          }
        }
        if (couponsToAdd.length > 0) {
          await couponCollection.add({ data: couponsToAdd })
        }
      }

      var result = await couponCollection.where({ _openid: OPENID }).get()
      return { success: true, message: '新人优惠券发放成功', data: result.data, total: result.data.length }
    }

    if (action === 'getUserCoupons') {
      var res = await couponCollection
        .where({ _openid: OPENID })
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      var coupons = res.data || []
      var available = coupons.filter(function(c) { return c.status === 'available' && (!c.expireAt || new Date(c.expireAt) > now) })
      var used = coupons.filter(function(c) { return c.status === 'used' })

      return {
        success: true,
        data: coupons,
        summary: {
          total: coupons.length,
          available: available.length,
          used: used.length
        }
      }
    }

    if (action === 'getPoolCoupons') {
      var poolRes = await couponCollection.where({
        _openid: 'POOL',
        status: 'available'
      }).get()

      var poolCoupons = poolRes.data || []
      var now2 = new Date()
      var active = []
      for (var p = 0; p < poolCoupons.length; p++) {
        if (poolCoupons[p].expireAt && new Date(poolCoupons[p].expireAt) <= now2) continue
        active.push(poolCoupons[p])
      }

      var grouped = {}
      for (var g = 0; g < active.length; g++) {
        var c = active[g]
        var key = c.type + '_' + c.minAmount + '_' + c.discountAmount
        if (!grouped[key]) {
          grouped[key] = {
            type: c.type,
            minAmount: c.minAmount,
            discountAmount: c.discountAmount,
            count: 0,
            expireAt: c.expireAt,
            sampleId: c._id
          }
        }
        grouped[key].count++
      }

      var poolList = []
      var keys = Object.keys(grouped)
      for (var k = 0; k < keys.length; k++) {
        poolList.push(grouped[keys[k]])
      }

      var claimedRes = await couponCollection.where({
        _openid: OPENID,
        source: 'pool',
        status: 'available'
      }).count()

      return {
        success: true,
        data: poolList,
        claimedCount: claimedRes.total
      }
    }

    if (action === 'claimPoolCoupon') {
      if (!couponType) return { success: false, error: '请指定优惠券类型' }

      var alreadyClaimed = await couponCollection.where({
        _openid: OPENID,
        type: couponType,
        source: 'pool',
        status: 'available'
      }).count()

      if (alreadyClaimed.total >= 2) {
        return { success: false, error: '该类型优惠券每人最多领取2张' }
      }

      var target = await couponCollection.where({
        _openid: 'POOL',
        status: 'available',
        type: couponType
      }).limit(1).get()

      if (!target.data || target.data.length === 0) {
        return { success: false, error: '该优惠券已被领完' }
      }

      var coupon = target.data[0]
      if (coupon.expireAt && new Date(coupon.expireAt) <= new Date()) {
        await couponCollection.doc(coupon._id).update({ data: { status: 'expired' } })
        return { success: false, error: '该优惠券已过期' }
      }

      await couponCollection.doc(coupon._id).update({
        data: {
          _openid: OPENID,
          source: 'pool',
          claimedAt: now,
          updatedAt: now
        }
      })

      return {
        success: true,
        message: '领取成功',
        data: {
          type: coupon.type,
          discountAmount: coupon.discountAmount,
          minAmount: coupon.minAmount,
          expireAt: coupon.expireAt
        }
      }
    }

    if (action === 'applyCoupon') {
      if (!couponId) return { success: false, error: '优惠券ID不能为空' }
      if (orderAmount === undefined || orderAmount === null) return { success: false, error: '订单金额不能为空' }

      var couponRes = await couponCollection.doc(couponId).get()
      if (!couponRes.data) return { success: false, error: '优惠券不存在' }

      var coupon = couponRes.data

      if (coupon._openid !== OPENID) return { success: false, error: '无权使用此优惠券' }
      if (coupon.status !== 'available') return { success: false, error: '优惠券不可用' }
      if (new Date(coupon.expireAt) <= now) return { success: false, error: '优惠券已过期' }
      if (orderAmount < coupon.minAmount) {
        return { success: false, error: '订单金额需满' + coupon.minAmount + '元才能使用此优惠券' }
      }

      await couponCollection.doc(couponId).update({
        data: {
          status: 'used',
          usedAt: now,
          updatedAt: now
        }
      })

      return {
        success: true,
        data: {
          couponId: couponId,
          discountAmount: coupon.discountAmount,
          finalAmount: Math.max(0, orderAmount - coupon.discountAmount),
          couponType: coupon.type
        },
        message: '优惠券使用成功'
      }
    }

    return { success: false, error: '未知操作' }

  } catch (error) {
    console.error('优惠券操作失败:', error)
    return { success: false, error: error.message }
  }
}
