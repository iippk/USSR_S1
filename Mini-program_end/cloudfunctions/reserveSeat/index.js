// 云函数入口文件 - 座位管理 · v3.0 (取消已订状态)
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const seatsCollection = db.collection('seats')
const studyRecordsCollection = db.collection('study_records')
const usersCollection = db.collection('users')
const ordersCollection = db.collection('orders')
const messagesCollection = db.collection('messages')

const DEFAULT_ZONE_PRICES = {
  immersive: { hour: 3, day: 21, week: 126 },
  sunshine: { hour: 4, day: 28, week: 168 },
  vip: { hour: 6, day: 42, week: 252 }
}

var _cachedZonePrices = null

async function getZonePricesFromDB() {
  if (_cachedZonePrices) return _cachedZonePrices
  try {
    const settingsCollection = db.collection('system_settings')
    const res = await settingsCollection.doc('global').get()
    if (res.data && res.data.zonePrices) {
      var zp = res.data.zonePrices
      _cachedZonePrices = {
        immersive: { hour: (zp.immersive && zp.immersive.hour) || DEFAULT_ZONE_PRICES.immersive.hour, day: (zp.immersive && zp.immersive.day) || DEFAULT_ZONE_PRICES.immersive.day, week: (zp.immersive && zp.immersive.week) || DEFAULT_ZONE_PRICES.immersive.week },
        sunshine: { hour: (zp.sunshine && zp.sunshine.hour) || DEFAULT_ZONE_PRICES.sunshine.hour, day: (zp.sunshine && zp.sunshine.day) || DEFAULT_ZONE_PRICES.sunshine.day, week: (zp.sunshine && zp.sunshine.week) || DEFAULT_ZONE_PRICES.sunshine.week },
        vip: { hour: (zp.vip && zp.vip.hour) || DEFAULT_ZONE_PRICES.vip.hour, day: (zp.vip && zp.vip.day) || DEFAULT_ZONE_PRICES.vip.day, week: (zp.vip && zp.vip.week) || DEFAULT_ZONE_PRICES.vip.week }
      }
      return _cachedZonePrices
    }
  } catch (e) {
    console.error('读取分区价格失败，使用默认值:', e)
  }
  _cachedZonePrices = DEFAULT_ZONE_PRICES
  return _cachedZonePrices
}

function getZoneKeyBySeatNumber(seatNumber) {
  if (!seatNumber) return 'immersive'
  var row = parseInt(seatNumber.split('-')[0], 10)
  if (row >= 1 && row <= 3) return 'immersive'
  if (row >= 4 && row <= 5) return 'sunshine'
  if (row === 6) return 'vip'
  return 'immersive'
}

async function getZonePrices(seatNumber, zoneKey) {
  var prices = await getZonePricesFromDB()
  var key = zoneKey || getZoneKeyBySeatNumber(seatNumber)
  return prices[key] || prices.immersive
}

exports.main = async function(event, context) {
  try {
    const { OPENID } = cloud.getWXContext()
    const { seatId, action, hardwareStatus, device, status, days, planType, quantity, orderId, accepted, totalSeconds, autoReleaseAt, zoneKey } = event
    const now = new Date()

    if (!action) { return { success: false, error: '无效的操作' } }

    if (action === 'reserve' || action === 'reserveDay' || action === 'reserveWeek') {
      try {
        var settingsRes = await db.collection('system_settings').doc('global').get()
        var sysSettings = settingsRes.data || {}
        if (sysSettings.maintenanceMode) {
          return { success: false, error: sysSettings.maintenanceMessage || '系统维护中，暂无法预约' }
        }
      } catch (e) { }
    }

    if (action === 'saveSubscribe') {
      await usersCollection.where({ _openid: OPENID }).update({
        data: { expireReminderSubscribedAt: accepted ? now : null, updatedAt: now }
      })
      return { success: true, data: { accepted: !!accepted } }
    }

    if (action === 'addMessage') {
      const { content, userInfo } = event
      if (!content || !content.trim()) { return { success: false, error: '留言内容不能为空' } }
      if (content.trim().length > 200) { return { success: false, error: '留言内容不能超过200字' } }

      const addRes = await messagesCollection.add({
        data: {
          content: content.trim(),
          userId: userInfo.userId,
          nickName: userInfo.nickName || '匿名用户',
          avatarUrl: userInfo.avatarUrl || '',
          likeCount: 0,
          likedBy: [],
          createdAt: now,
          updatedAt: now
        }
      })
      return { success: true, data: { messageId: addRes._id }, message: '留言成功' }
    }

    if (action === 'likeMessage') {
      const { messageId, userId, unlike } = event
      if (!messageId) { return { success: false, error: '留言ID不能为空' } }

      const msgRes = await messagesCollection.doc(messageId).get()
      if (!msgRes.data) { return { success: false, error: '留言不存在' } }

      const message = msgRes.data
      let likedBy = message.likedBy || []
      let likeCount = message.likeCount || 0

      if (unlike) {
        if (likedBy.indexOf(userId) === -1) { return { success: false, error: '您未点赞过此留言' } }
        likedBy = likedBy.filter(id => id !== userId)
        likeCount = Math.max(0, likeCount - 1)
      } else {
        if (likedBy.indexOf(userId) !== -1) { return { success: false, error: '您已点赞过此留言' } }
        likedBy = likedBy.concat([userId])
        likeCount += 1
      }

      await messagesCollection.doc(messageId).update({
        data: { likeCount: likeCount, likedBy: likedBy, updatedAt: now }
      })
      return { success: true, data: { likeCount: likeCount, likedBy: likedBy }, message: unlike ? '取消点赞成功' : '点赞成功' }
    }

    if (action === 'deleteMessage') {
      const { messageId, userId } = event
      if (!messageId) { return { success: false, error: '留言ID不能为空' } }

      const msgRes = await messagesCollection.doc(messageId).get()
      if (!msgRes.data) { return { success: false, error: '留言不存在' } }

      const message = msgRes.data
      if (message.userId !== userId && userId !== OPENID) {
        return { success: false, error: '无权删除此留言' }
      }

      await messagesCollection.doc(messageId).remove()
      return { success: true, message: '删除成功' }
    }

    if (action === 'cancelOrder') {
      if (!orderId) return { success: false, error: '订单ID不能为空' }
      const r = await ordersCollection.doc(orderId).get()
      if (!r.data) return { success: false, error: '订单不存在' }
      if (r.data.userId !== OPENID) return { success: false, error: '无权取消此订单' }
      if (r.data.status !== 'created') return { success: false, error: '订单状态不可取消' }
      await ordersCollection.doc(orderId).update({ data: { status: 'cancelled', cancelledAt: now, updatedAt: now } })
      return { success: true }
    }

    if (action === 'confirmPayment') {
      if (!orderId) return { success: false, error: '订单ID不能为空' }
      const orderResult = await ordersCollection.doc(orderId).get()
      if (!orderResult.data) return { success: false, error: '订单不存在' }
      const order = orderResult.data
      if (order.userId !== OPENID) return { success: false, error: '无权确认此订单' }
      if (order.status !== 'created') return { success: false, error: '订单状态异常' }

      const userSeats = await seatsCollection.where({ userId: OPENID, status: '使用中' }).get()
      if (userSeats.data.length > 0) { return { success: false, error: '您已有使用中的座位，不能重复预订' } }

      const seatRes = await seatsCollection.doc(order.seatId).get()
      if (!seatRes.data) return { success: false, error: '座位不存在' }
      const seat = seatRes.data
      if (seat.status !== '空闲') return { success: false, error: '座位已被占用' }

      const updateSeatData = {
        status: '使用中',
        userId: OPENID,
        reservedAt: now,
        updatedAt: now,
        remainingTime: totalSeconds,
        autoReleaseAt: autoReleaseAt,
        expireAt: order.expireAt,
        orderId: orderId,
        plan: { planType: order.planType, quantity: order.quantity, unitPrice: order.unitPrice, totalPrice: order.totalPrice },
        hardwareStatus: { light: false, airConditioner: false, door: false }
      }

      await seatsCollection.doc(order.seatId).update({ data: updateSeatData })
      await ordersCollection.doc(orderId).update({ data: { status: 'paid', paidAt: now, updatedAt: now } })
      const updatedSeat = await seatsCollection.doc(order.seatId).get()
      return { success: true, data: updatedSeat.data }
    }

    if (action === 'extendOrder') {
      if (!orderId) return { success: false, error: '订单ID不能为空' }
      const orderResult = await ordersCollection.doc(orderId).get()
      if (!orderResult.data) return { success: false, error: '订单不存在' }
      const order = orderResult.data
      if (order.userId !== OPENID) return { success: false, error: '无权操作此订单' }
      if (order.status !== 'paid') return { success: false, error: '订单状态不可续费' }

      const orderZoneKey = order.zoneKey || getZoneKeyBySeatNumber(order.seatNumber)
      const zonePrices = await getZonePrices(order.seatNumber, orderZoneKey)
      const cfgMap = { hour: { unitPrice: zonePrices.hour, min: 1, max: 24, ms: 60 * 60 * 1000 }, day: { unitPrice: zonePrices.day, min: 1, max: 30, ms: 24 * 60 * 60 * 1000 }, week: { unitPrice: zonePrices.week, min: 1, max: 4, ms: 7 * 24 * 60 * 60 * 1000 } }
      const cfg = cfgMap[planType] || cfgMap.hour
      const q = Number(quantity) || 1
      if (q < cfg.min || q > cfg.max) return { success: false, error: '时长选择无效' }
      const extraPrice = cfg.unitPrice * q
      const extraMs = q * cfg.ms
      const originalExpire = new Date(order.expireAt)
      const newExpireAt = new Date(Math.max(originalExpire.getTime(), now.getTime()) + extraMs)

      await ordersCollection.doc(orderId).update({
        data: { expireAt: newExpireAt, totalPrice: db.command.inc(extraPrice), quantity: db.command.inc(q), extendedCount: db.command.inc(1), lastExtendedAt: now, updatedAt: now }
      })

      const seatRes = await seatsCollection.where({ orderId: orderId }).get()
      if (seatRes.data.length > 0) {
        const seatIdToUpdate = seatRes.data[0]._id
        const extraSeconds = Math.floor(extraMs / 1000)
        await seatsCollection.doc(seatIdToUpdate).update({
          data: { expireAt: newExpireAt, autoReleaseAt: newExpireAt, remainingTime: db.command.inc(extraSeconds), updatedAt: now }
        })
      }
      const updatedOrder = await ordersCollection.doc(orderId).get()
      return { success: true, data: updatedOrder.data, message: '续费成功' }
    }

    if (!seatId) { return { success: false, error: '座位ID不能为空' } }

    const seatResult = await seatsCollection.doc(seatId).get()
    if (!seatResult.data) { return { success: false, error: '座位不存在' } }
    const seat = seatResult.data
    let updateData = {}

    switch (action) {
      case 'createOrder': {
        if (seat.status !== '空闲') { return { success: false, error: '座位已被占用' } }
        const userSeats = await seatsCollection.where({ userId: OPENID, status: '使用中' }).get()
        if (userSeats.data.length > 0) { return { success: false, error: '您已有使用中的座位，不能重复预订' } }

        const zonePrices = await getZonePrices(seat.seatNumber, zoneKey)
        const cfgMap = { hour: { unitPrice: zonePrices.hour, min: 1, max: 24, ms: 60 * 60 * 1000 }, day: { unitPrice: zonePrices.day, min: 1, max: 30, ms: 24 * 60 * 60 * 1000 }, week: { unitPrice: zonePrices.week, min: 1, max: 4, ms: 7 * 24 * 60 * 60 * 1000 } }
        const cfg = cfgMap[planType] || cfgMap.hour
        const q = Number(quantity) || 1
        if (q < cfg.min || q > cfg.max) { return { success: false, error: '时长选择无效' } }
        const totalPrice = cfg.unitPrice * q
        const expireAt = new Date(now.getTime() + q * cfg.ms)
        const autoReleaseAtVal = new Date(now.getTime() + q * cfg.ms)

        const addRes = await ordersCollection.add({
          data: { userId: OPENID, seatId: seatId, seatNumber: seat.seatNumber, planType: planType || 'hour', quantity: q, unitPrice: cfg.unitPrice, totalPrice: totalPrice, expireAt: expireAt, status: 'created', zoneKey: zoneKey || getZoneKeyBySeatNumber(seat.seatNumber), createdAt: now, updatedAt: now }
        })
        return { success: true, data: { orderId: addRes._id, totalPrice: totalPrice, totalSeconds: q * cfg.ms / 1000, autoReleaseAt: autoReleaseAtVal } }
      }

      case 'reserve':
        if (seat.status !== '空闲') { return { success: false, error: '座位已被占用' } }
        const userSeatsR = await seatsCollection.where({ userId: OPENID, status: '使用中' }).get()
        if (userSeatsR.data.length > 0) { return { success: false, error: '您已有使用中的座位，不能重复预订' } }
        const reservationDays = days || 1
        const expireTime = new Date(now.getTime() + reservationDays * 24 * 60 * 60 * 1000)
        updateData = {
          status: '使用中',
          userId: OPENID,
          reservedAt: now,
          updatedAt: now,
          remainingTime: reservationDays * 24 * 60 * 60,
          autoReleaseAt: expireTime,
          expireAt: expireTime,
          hardwareStatus: { light: false, airConditioner: false, door: false }
        }
        break

      case 'unlock':
        if (seat.status === '空闲') { return { success: false, error: '座位未被占用' } }
        if (seat.userId !== OPENID) { return { success: false, error: '无权解锁此座位' } }

        // 如果有进行中的学习（startedAt存在），保存自习记录
        if (seat.startedAt) {
          const duration = Math.floor((now - new Date(seat.startedAt)) / 1000)
          if (duration > 0) {
            await studyRecordsCollection.add({
              data: { userId: OPENID, seatId: seatId, seatNumber: seat.seatNumber, duration: duration, startTime: seat.startedAt, endTime: now, createdAt: now }
            })
            await usersCollection.where({ _openid: OPENID }).update({ data: { totalStudyTime: db.command.inc(duration), updatedAt: now } })
          }
        }

        updateData = {
          status: '空闲',
          userId: null,
          reservedAt: null,
          startedAt: null,
          expireAt: null,
          remainingTime: 0,
          autoReleaseAt: null,
          updatedAt: now,
          hardwareStatus: { light: false, airConditioner: false, door: false }
        }
        break

      case 'start':
        // 开始本次学习（只设置startedAt开始计时，不改变座位状态）
        if (seat.status !== '使用中') { return { success: false, error: '座位未在使用中' } }
        if (seat.userId !== OPENID) { return { success: false, error: '无权操作此座位' } }
        if (seat.startedAt) { return { success: false, error: '学习已开始' } }

        updateData = { startedAt: now, updatedAt: now }
        break

      case 'endSession':
        // 结束本次学习（只保存记录+清除startedAt，不改变座位状态）
        if (seat.status !== '使用中') { return { success: false, error: '当前没有进行中的学习' } }
        if (seat.userId !== OPENID) { return { success: false, error: '无权操作此座位' } }
        if (!seat.startedAt) { return { success: false, error: '当前没有进行中的学习' } }

        const dur = Math.floor((now - new Date(seat.startedAt)) / 1000)
        if (dur > 0) {
          await studyRecordsCollection.add({
            data: { userId: OPENID, seatId: seatId, seatNumber: seat.seatNumber, duration: dur, startTime: seat.startedAt, endTime: now, createdAt: now }
          })
          await usersCollection.where({ _openid: OPENID }).update({ data: { totalStudyTime: db.command.inc(dur), updatedAt: now } })
        }

        updateData = { startedAt: null, updatedAt: now }
        break

      case 'hardware':
        // 控制硬件状态（所有硬件独立，只要不是空闲就能控制）
        if (seat.userId !== OPENID) { return { success: false, error: '无权控制此座位的硬件' } }
        if (seat.status === '空闲') { return { success: false, error: '座位未预订，无法控制硬件' } }

        const newHardwareStatus = { ...seat.hardwareStatus }
        if (device && status !== undefined) { newHardwareStatus[device] = status }
        else if (hardwareStatus) { Object.assign(newHardwareStatus, hardwareStatus) }
        updateData = { hardwareStatus: newHardwareStatus, updatedAt: now }
        break

      case 'checkExpired':
        if (seat.status === '使用中' && seat.autoReleaseAt) {
          const expireTime = new Date(seat.autoReleaseAt)
          if (now >= expireTime) {
            // 到期时如果有startedAt，也保存记录
            if (seat.startedAt) {
              const expDur = Math.floor((now - new Date(seat.startedAt)) / 1000)
              if (expDur > 0) {
                await studyRecordsCollection.add({ data: { userId: OPENID, seatId: seatId, seatNumber: seat.seatNumber, duration: expDur, startTime: seat.startedAt, endTime: now, createdAt: now } })
                await usersCollection.where({ _openid: OPENID }).update({ data: { totalStudyTime: db.command.inc(expDur), updatedAt: now } })
              }
            }
            updateData = {
              status: '空闲', userId: null, reservedAt: null, startedAt: null,
              expireAt: null, remainingTime: 0, autoReleaseAt: null,
              updatedAt: now, hardwareStatus: { light: false, airConditioner: false, door: false }
            }
          }
        }
        break

      default:
        return { success: false, error: '无效的操作' }
    }

    await seatsCollection.doc(seatId).update({ data: updateData })
    const updatedSeat = await seatsCollection.doc(seatId).get()
    return { success: true, data: updatedSeat.data, message: '操作成功' }
  } catch (error) {
    console.error('座位操作失败:', error)
    return { success: false, error: error.message }
  }
}
