// 云函数入口文件 - 更新用户信息
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
    const { nickName } = event
    
    if (!nickName || typeof nickName !== 'string' || nickName.trim() === '') {
      return {
        success: false,
        error: '昵称不能为空'
      }
    }
    
    // 检查昵称长度
    if (nickName.length > 20) {
      return {
        success: false,
        error: '昵称长度不能超过20个字符'
      }
    }
    
    // 更新用户信息
    const updateResult = await usersCollection
      .where({ _openid: OPENID })
      .update({
        data: {
          nickName: nickName.trim(),
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
      message: '昵称更新成功'
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
