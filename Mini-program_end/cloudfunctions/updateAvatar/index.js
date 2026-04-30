// 云函数入口文件 - 更新用户头像
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取数据库引用
const db = cloud.database()
const usersCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取用户的openid
    const { OPENID } = cloud.getWXContext()
    
    // 获取请求参数
    const { avatarUrl } = event
    
    if (!avatarUrl || typeof avatarUrl !== 'string' || avatarUrl.trim() === '') {
      return {
        success: false,
        error: '头像URL不能为空'
      }
    }
    
    // 验证头像URL格式
    // 允许微信官方头像、默认头像、云存储URL或fileID
    const validPrefixes = [
      'https://thirdwx.qlogo.cn/',
      'https://mmbiz.qpic.cn/',
      'https://tmp/',
      'cloud://'
    ];
    
    // 检查是否是有效的URL格式
    const isValidUrl = validPrefixes.some(prefix => avatarUrl.startsWith(prefix));
    
    // 如果不是有效的URL格式，返回错误
    if (!isValidUrl) {
      return {
        success: false,
        error: '头像URL格式不正确: ' + avatarUrl.substring(0, 50)
      }
    }
    
    // 更新用户信息
    const updateResult = await usersCollection
      .where({ _openid: OPENID })
      .update({
        data: {
          avatarUrl: avatarUrl.trim(),
          updatedAt: new Date()
        }
      })
    
    if (updateResult.stats.updated === 0) {
      return {
        success: false,
        error: '用户不存在或未更新'
      }
    }
    
    // 获取更新后的用户信息
    const userResult = await usersCollection
      .where({ _openid: OPENID })
      .get()
    
    const user = userResult.data[0]
    
    return {
      success: true,
      data: user,
      message: '头像更新成功'
    }
  } catch (error) {
    console.error('更新头像失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
