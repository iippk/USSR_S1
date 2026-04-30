// 云函数入口文件 - 获取排行榜 · v5.0 (彻底修复今日榜 + 增强数据验证)
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const $ = db.command.aggregate
const _ = db.command
const usersCollection = db.collection('users')
const studyRecordsCollection = db.collection('study_records')

function getTodayStartUTC8() {
  var now = new Date()
  var utc8Offset = 8 * 60 * 60 * 1000
  
  var utc8Now = new Date(now.getTime() + utc8Offset)
  var year = utc8Now.getFullYear()
  var month = utc8Now.getMonth()
  var day = utc8Now.getDate()
  
  var todayUTC8Start = new Date(year, month, day, 0, 0, 0, 0)
  var todayUTC8StartUTC = new Date(todayUTC8Start.getTime() - utc8Offset)

  console.log('[Rank] ====== 今日榜时区计算 ======')
  console.log('[Rank] 服务器当前时间 (UTC):', now.toISOString())
  console.log('[Rank] 北京时间:', utc8Now.toISOString())
  console.log('[Rank] 今日北京零点 (UTC+8):', todayUTC8Start.toISOString())
  console.log('[Rank] 今日北京零点 (UTC):', todayUTC8StartUTC.toISOString())
  console.log('[Rank] ===============================')

  return todayUTC8StartUTC
}

function getWeekStartUTC8() {
  var now = new Date()
  var utc8Offset = 8 * 60 * 60 * 1000
  
  var utc8Now = new Date(now.getTime() + utc8Offset)
  var dayOfWeek = utc8Now.getDay()
  var diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  var mondayUTC8 = new Date(utc8Now.getFullYear(), utc8Now.getMonth(), utc8Now.getDate() - diffToMonday, 0, 0, 0, 0)
  var mondayUTC = new Date(mondayUTC8.getTime() - utc8Offset)

  console.log('[Rank] ====== 周榜时区计算 ======')
  console.log('[Rank] 北京时间星期几:', dayOfWeek, '(0=日)')
  console.log('[Rank] 距离周一:', diffToMonday, '天')
  console.log('[Rank] 本周一北京零点 (UTC):', mondayUTC.toISOString())
  console.log('[Rank] ===========================')

  return mondayUTC
}

async function buildTotalRanking() {
  console.log('\n[Rank] >>> 构建【总榜】<<< (直接读 users.totalStudyTime)')

  try {
    var usersResult = await usersCollection
      .orderBy('totalStudyTime', 'desc')
      .limit(50)
      .get()

    var udata = usersResult.data || []
    console.log('[Rank] 总榜 - users表查询到:', udata.length, '条记录')

    var ranking = []
    for (var ti = 0; ti < udata.length; ti++) {
      var studyTime = Number(udata[ti].totalStudyTime) || 0
      if (studyTime > 0 && udata[ti]._openid) {
        ranking.push({
          _openid: udata[ti]._openid,
          nickName: udata[ti].nickName || '未知用户',
          avatarUrl: udata[ti].avatarUrl || '',
          rank: ranking.length + 1,
          studyTime: studyTime,
          dataSource: 'users.totalStudyTime'
        })
      }
    }

    console.log('[Rank] 总榜 - 有效用户数:', ranking.length)
    if (ranking.length > 0) {
      console.log('[Rank] 总榜 TOP3:')
      for (var t = 0; t < Math.min(3, ranking.length); t++) {
        console.log('  #' + (t + 1), ranking[t].nickName, '-', ranking[t].studyTime, '秒')
      }
    }
    return ranking
  } catch (e) {
    console.error('[Rank] 总榜构建失败:', e.message)
    return []
  }
}

async function buildDayRanking(timeRangeStart, label) {
  console.log('\n[Rank] >>> 构建【' + label + '】<<< (聚合 study_records)')
  console.log('[Rank] 查询起始时间 (UTC):', timeRangeStart.toISOString())
  console.log('[Rank] 当前服务器时间 (UTC):', new Date().toISOString())

  try {
    var aggregateResult = await studyRecordsCollection
      .aggregate()
      .match({
        startTime: _.gte(timeRangeStart),
        duration: _.gt(0)
      })
      .group({
        _id: '$userId',
        totalDuration: $.sum('$duration'),
        recordCount: $.sum(1),
        firstRecord: $.first('$startTime'),
        lastRecord: $.last('$startTime')
      })
      .sort({ totalDuration: -1 })
      .limit(50)
      .end()

    var list = aggregateResult.list || []
    console.log('[Rank] ' + label + ' - 聚合结果原始条数:', list.length)

    if (list.length === 0) {
      console.log('[Rank] ' + label + ' - ⚠️ 无学习记录，返回空数组')
      return []
    }

    console.log('[Rank] ' + label + ' - 聚合原始数据(前3条):')
    for (var logIdx = 0; logIdx < Math.min(3, list.length); logIdx++) {
      console.log('  用户:', list[logIdx]._id, '- 时长:', list[logIdx].totalDuration, '秒 - 首条记录时间:', list[logIdx].firstRecord)
    }

    var validList = []
    var filteredCount = 0
    
    for (var i = 0; i < list.length; i++) {
      var item = list[i]
      
      if (!item._id || !item.totalDuration || item.totalDuration <= 0) {
        console.log('[Rank] ' + label + ' - ❌ 过滤无效项(无ID或时长<=0):', JSON.stringify(item))
        continue
      }
      
      var firstRecordTime = null
      if (item.firstRecord) {
        try {
          firstRecordTime = new Date(item.firstRecord)
          if (isNaN(firstRecordTime.getTime())) {
            console.log('[Rank] ' + label + ' - ❌ 过滤无效项(首条记录时间解析失败):', item._id)
            continue
          }
          
          var timeDiff = firstRecordTime.getTime() - timeRangeStart.getTime()
          if (timeDiff < -86400000) { 
            console.log('[Rank] ' + label + ' - ❌ 过滤无效项(记录时间早于查询范围超过24小时):', item._id, '- 时间差:', Math.round(timeDiff / 3600000), '小时')
            filteredCount++
            continue
          }
        } catch (parseErr) {
          console.warn('[Rank] ' + label + ' - ⚠️ 无法解析首条记录时间，但保留该项:', parseErr.message)
        }
      }
      
      validList.push(item)
    }

    if (filteredCount > 0) {
      console.log('[Rank] ' + label + ' - ⚠️ 过滤了', filteredCount, '条不在时间范围内的记录')
    }

    console.log('[Rank] ' + label + ' - 有效条数:', validList.length)

    if (validList.length === 0) {
      console.log('[Rank] ' + label + ' - ⚠️ 无有效数据，返回空数组')
      return []
    }

    var userIds = []
    for (var j = 0; j < validList.length; j++) {
      if (validList[j]._id) userIds.push(validList[j]._id)
    }

    var userMap = {}
    if (userIds.length > 0) {
      try {
        var usersResult = await usersCollection.where({ _openid: _.in(userIds) }).get()
        var ulist = usersResult.data || []
        for (var k = 0; k < ulist.length; k++) {
          userMap[ulist[k]._openid] = ulist[k]
        }
        console.log('[Rank] ' + label + ' - 查询到', ulist.length, '个用户信息')
      } catch (userQueryError) {
        console.error('[Rank] ' + label + ' - 查询用户信息失败:', userQueryError.message)
      }
    }

    var ranking = []
    for (var m = 0; m < validList.length; m++) {
      var user = userMap[validList[m]._id] || {}
      ranking.push({
        _openid: validList[m]._id,
        nickName: user.nickName || '未知用户',
        avatarUrl: user.avatarUrl || '',
        rank: ranking.length + 1,
        studyTime: validList[m].totalDuration || 0,
        dataSource: 'study_records聚合-' + label,
        recordCount: validList[m].recordCount || 0,
        verifiedTimeRange: true
      })
    }

    console.log('[Rank] ' + label + ' - ✅ 最终返回:', ranking.length, '条有效记录')
    if (ranking.length > 0) {
      console.log('[Rank] ' + label + ' TOP3:')
      for (var t = 0; t < Math.min(3, ranking.length); t++) {
        console.log('  #' + (t + 1), ranking[t].nickName, '-', ranking[t].studyTime, '秒 (来源:', ranking[t].dataSource, ')')
      }
    }
    return ranking
  } catch (error) {
    console.error('[Rank] ' + label + ' 构建异常:', error.message)
    console.error('[Rank] 堆栈信息:', error.stack)
    return []
  }
}

exports.main = async function(event, context) {
  console.log('\n\n##################################################')
  console.log('#### [Rank] 排行榜 v5.0 开始执行 ####')
  console.log('##################################################')
  console.log('[Rank] 接收参数:', JSON.stringify(event))
  console.log('[Rank] 执行时间 (UTC):', new Date().toISOString())

  try {
    var type = event.type || 'total'
    console.log('[Rank] 排行榜类型:', type)
    
    var ranking = []

    if (type === 'total') {
      ranking = await buildTotalRanking()

    } else if (type === 'today') {
      var todayStart = getTodayStartUTC8()
      console.log('[Rank] 📅 今日榜查询范围: >=', todayStart.toISOString())
      ranking = await buildDayRanking(todayStart, '今日榜')
      
      if (ranking.length === 0) {
        console.log('[Rank] ✅ 今日榜确认: 今天确实没有学习记录')
      } else {
        console.log('[Rank] ✅ 今日榜确认: 今天有', ranking.length, '个用户的学习记录')
      }

    } else if (type === 'week') {
      var weekStart = getWeekStartUTC8()
      console.log('[Rank] 📅 周榜查询范围: >=', weekStart.toISOString())
      ranking = await buildDayRanking(weekStart, '周榜')

    } else if (type === 'month') {
      var now = new Date()
      var monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      console.log('[Rank] 📅 月榜查询范围: >=', monthStart.toISOString())
      ranking = await buildDayRanking(monthStart, '月榜')

    } else {
      console.log('[Rank] ❌ 未知类型:', type)
      ranking = []
    }

    var avatarFileIDs = []
    for (var ai = 0; ai < ranking.length; ai++) {
      if (ranking[ai].avatarUrl && ranking[ai].avatarUrl.indexOf('cloud://') === 0) {
        avatarFileIDs.push(ranking[ai].avatarUrl)
      }
    }

    var avatarUrlMap = {}
    if (avatarFileIDs.length > 0) {
      try {
        var uniqueIDs = []
        var seen = {}
        for (var ui = 0; ui < avatarFileIDs.length; ui++) {
          if (!seen[avatarFileIDs[ui]]) {
            seen[avatarFileIDs[ui]] = true
            uniqueIDs.push(avatarFileIDs[ui])
          }
        }
        var tempUrlRes = await cloud.getTempFileURL({ fileList: uniqueIDs })
        var fileList = tempUrlRes.fileList || []
        for (var fi = 0; fi < fileList.length; fi++) {
          if (fileList[fi].tempFileURL) {
            avatarUrlMap[fileList[fi].fileID] = fileList[fi].tempFileURL
          }
        }
      } catch (e) {
        console.error('[Rank] 头像URL转换失败:', e.message)
      }
    }

    for (var ri = 0; ri < ranking.length; ri++) {
      if (ranking[ri].avatarUrl && avatarUrlMap[ranking[ri].avatarUrl]) {
        ranking[ri].avatarUrl = avatarUrlMap[ranking[ri].avatarUrl]
      }
    }

    console.log('\n##################################################')
    console.log('#### [Rank] 执行完成 ####')
    console.log('[Rank] 类型:', type)
    console.log('[Rank] 返回数据量:', ranking.length)
    console.log('##################################################\n\n')

    return { 
      success: true, 
      data: ranking, 
      type: type,
      timestamp: new Date().toISOString(),
      serverTimezone: 'UTC',
      queryTimeRange: type !== 'total' ? { start: type === 'today' ? getTodayStartUTC8().toISOString() : type === 'week' ? getWeekStartUTC8().toISOString() : null } : null
    }

  } catch (error) {
    console.error('[Rank] 💥 致命错误:', error.message)
    console.error('[Rank] 完整堆栈:', error.stack)
    return { 
      success: false, 
      error: error.message,
      type: event.type || 'unknown'
    }
  }
}
