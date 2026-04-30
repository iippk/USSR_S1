// 云函数入口文件 - 获取用户统计数据
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取数据库引用
const db = cloud.database()
const usersCollection = db.collection('users')
const studyRecordsCollection = db.collection('study_records')

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取用户的openid
    const { OPENID } = cloud.getWXContext()
    
    // 获取用户信息
    const userResult = await usersCollection.where({
      _openid: OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const user = userResult.data[0]
    
    // 获取今日开始时间
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // 查询今日自习时长
    const todayRecords = await studyRecordsCollection.where({
      userId: OPENID,
      startTime: db.command.gte(todayStart)
    }).get()
    
    const todayStudyTime = todayRecords.data.reduce((sum, record) => {
      return sum + (record.duration || 0)
    }, 0)
    
    // 查询本周自习时长
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    
    const weekRecords = await studyRecordsCollection.where({
      userId: OPENID,
      startTime: db.command.gte(weekStart)
    }).get()
    
    const weekStudyTime = weekRecords.data.reduce((sum, record) => {
      return sum + (record.duration || 0)
    }, 0)
    
    // 查询本月自习时长
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const monthRecords = await studyRecordsCollection.where({
      userId: OPENID,
      startTime: db.command.gte(monthStart)
    }).get()
    
    const monthStudyTime = monthRecords.data.reduce((sum, record) => {
      return sum + (record.duration || 0)
    }, 0)
    
    // 查询自习次数
    const totalRecords = await studyRecordsCollection.where({
      userId: OPENID
    }).count()
    
    // 返回统计数据
    return {
      success: true,
      data: {
        totalStudyTime: user.totalStudyTime || 0,
        todayStudyTime: todayStudyTime,
        weekStudyTime: weekStudyTime,
        monthStudyTime: monthStudyTime,
        studyCount: totalRecords.total,
        userInfo: user
      }
    }
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
