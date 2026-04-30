const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    var seatsRes = await db.collection('seats').get()
    var seats = seatsRes.data || []
    var totalSeats = seats.length
    var availableSeats = 0
    var usingSeats = 0
    var fixSeats = 0
    var immersiveUsing = 0
    var sunshineUsing = 0
    var vipUsing = 0
    for (var i = 0; i < seats.length; i++) {
      if (seats[i].status === '空闲') availableSeats++
      else if (seats[i].status === '使用中') {
        usingSeats++
        var row = parseInt((seats[i].seatNumber || '').split('-')[0], 10)
        if (row >= 1 && row <= 3) immersiveUsing++
        else if (row >= 4 && row <= 5) sunshineUsing++
        else if (row === 6) vipUsing++
      }
      else fixSeats++
    }

    var now = new Date()
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    var todayOrdersRes = await db.collection('orders').where({ createdAt: _.gte(todayStart) }).get()
    var todayOrders = todayOrdersRes.data || []
    var todayOrderCount = todayOrders.length
    var todayRevenue = 0
    for (var j = 0; j < todayOrders.length; j++) {
      if (todayOrders[j].status === 'paid') todayRevenue += (todayOrders[j].totalPrice || 0)
    }

    var totalOrdersRes = await db.collection('orders').where({ status: 'paid' }).count()
    var totalOrderCount = totalOrdersRes.total

    var totalRevenueRes = await db.collection('orders').where({ status: 'paid' }).get()
    var totalRevenue = 0
    for (var k = 0; k < totalRevenueRes.data.length; k++) {
      totalRevenue += (totalRevenueRes.data[k].totalPrice || 0)
    }

    var usersRes = await db.collection('users').count()
    var totalUsers = usersRes.total

    var todayUsersRes = await db.collection('users').where({ createdAt: _.gte(todayStart) }).count()
    var todayNewUsers = todayUsersRes.total

    var trendRange = event.trendRange || 'week'
    var trendLabels = []
    var trendRevenueData = []
    var trendOrderData = []

    if (trendRange === 'year') {
      for (var mo = 11; mo >= 0; mo--) {
        var monthDate = new Date(now.getFullYear(), now.getMonth() - mo, 1)
        var monthEnd = new Date(now.getFullYear(), now.getMonth() - mo + 1, 1)
        var monthLabel = (monthDate.getMonth() + 1) + '月'
        trendLabels.push(monthLabel)
        var monthOrdersRes = await db.collection('orders').where({
          createdAt: _.gte(monthDate).and(_.lt(monthEnd)),
          status: 'paid'
        }).get()
        var monthOrders = monthOrdersRes.data || []
        var monthRevenue = 0
        for (var mr = 0; mr < monthOrders.length; mr++) monthRevenue += (monthOrders[mr].totalPrice || 0)
        trendRevenueData.push(monthRevenue)
        trendOrderData.push(monthOrders.length)
      }
    } else if (trendRange === 'month') {
      for (var w = 3; w >= 0; w--) {
        var weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7)
        var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w + 1) * 7)
        var wsMonth = weekStart.getMonth() + 1
        var wsDay = weekStart.getDate()
        var weMonth = weekEnd.getMonth() + 1
        var weDay = weekEnd.getDate()
        var weekLabel = wsMonth + '/' + wsDay + '-' + weMonth + '/' + weDay
        trendLabels.push(weekLabel)
        var weekOrdersRes = await db.collection('orders').where({
          createdAt: _.gte(weekStart).and(_.lt(weekEnd)),
          status: 'paid'
        }).get()
        var weekOrders = weekOrdersRes.data || []
        var weekRevenue = 0
        for (var wr = 0; wr < weekOrders.length; wr++) weekRevenue += (weekOrders[wr].totalPrice || 0)
        trendRevenueData.push(weekRevenue)
        trendOrderData.push(weekOrders.length)
      }
    } else {
      for (var d = 6; d >= 0; d--) {
        var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)
        var dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d + 1)
        var label = (dayStart.getMonth() + 1) + '/' + dayStart.getDate()
        trendLabels.push(label)
        var dayOrdersRes = await db.collection('orders').where({
          createdAt: _.gte(dayStart).and(_.lt(dayEnd)),
          status: 'paid'
        }).get()
        var dayOrders = dayOrdersRes.data || []
        var dayRevenue = 0
        for (var m = 0; m < dayOrders.length; m++) dayRevenue += (dayOrders[m].totalPrice || 0)
        trendRevenueData.push(dayRevenue)
        trendOrderData.push(dayOrders.length)
      }
    }

    var weekRevenueData = trendRange === 'week' ? trendRevenueData : []
    var weekOrderData = trendRange === 'week' ? trendOrderData : []

    var planTypeRes = await db.collection('orders').where({ status: 'paid' }).get()
    var planTypeCount = { hour: 0, day: 0, week: 0 }
    for (var n = 0; n < planTypeRes.data.length; n++) {
      var pt = planTypeRes.data[n].planType || 'hour'
      if (planTypeCount[pt] !== undefined) planTypeCount[pt]++
    }

    var couponRes = await db.collection('coupon').count()
    var totalCoupons = couponRes.total
    var usedCouponsRes = await db.collection('coupon').where({ status: 'used' }).count()
    var usedCoupons = usedCouponsRes.total

    return {
      success: true,
      data: {
        totalSeats: totalSeats,
        availableSeats: availableSeats,
        usingSeats: usingSeats,
        fixSeats: fixSeats,
        usageRate: totalSeats > 0 ? Math.round(usingSeats / totalSeats * 100) : 0,
        zoneUsing: { immersive: immersiveUsing, sunshine: sunshineUsing, vip: vipUsing },
        todayOrderCount: todayOrderCount,
        todayRevenue: todayRevenue,
        totalOrderCount: totalOrderCount,
        totalRevenue: totalRevenue,
        totalUsers: totalUsers,
        todayNewUsers: todayNewUsers,
        weekRevenueData: weekRevenueData,
        weekOrderData: weekOrderData,
        trendLabels: trendLabels,
        trendRevenueData: trendRevenueData,
        trendOrderData: trendOrderData,
        planTypeCount: planTypeCount,
        totalCoupons: totalCoupons,
        usedCoupons: usedCoupons,
        couponUsageRate: totalCoupons > 0 ? Math.round(usedCoupons / totalCoupons * 100) : 0
      }
    }
  } catch (error) {
    console.error('getDashboardData error:', error)
    return { success: false, error: error.message }
  }
}
