const cloud = require('wx-server-sdk')

cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV,
  traceUser: true  // 启用用户追踪
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('🔧 云函数开始执行，事件:', JSON.stringify(event, null, 2))
  
  try {
    // 获取微信上下文（关键！）
    const wxContext = cloud.getWXContext()
    console.log('🔧 微信上下文:', JSON.stringify(wxContext, null, 2))
    
    const OPENID = wxContext.OPENID || 'no_openid'
    const APPID = wxContext.APPID || 'no_appid'
    
    // 基础响应结构
    const result = {
      success: true,
      timestamp: Date.now(),
      wxContext: {
        OPENID,
        APPID,
        ENV: wxContext.ENV,
        SOURCE: wxContext.SOURCE
      },
      parameters: event
    }

    // 处理获取openid请求
    if (event.testGetOpenid) {
      console.log('🔑 处理获取openid请求')
      
      if (OPENID === 'no_openid') {
        console.warn('⚠️ 未获取到真实openid，可能是调用方式问题')
        result.warning = '未获取到真实openid，请确保通过微信小程序调用'
      }
      
      return {
        ...result,
        testOpenid: OPENID,  // 前端需要的关键字段
        openid: OPENID,
        message: OPENID !== 'no_openid' 
          ? `✅ openid获取成功: ${OPENID.substring(0, 8)}...` 
          : '⚠️ 模拟openid（测试模式）'
      }
    }

    // 处理数据库查询
    if (event.testDatabase && event.userId) {
      console.log('📋 处理数据库查询，用户ID:', event.userId)
      
      try {
        // 查询用户数据
        const userResult = await db.collection('users').where({
          _openid: event.userId
        }).limit(1).get()
        
        console.log('👥 用户查询结果:', JSON.stringify(userResult, null, 2))
        
        if (userResult.data.length > 0) {
          result.userData = userResult.data[0]
          
          // 查询学习记录
          const recordsResult = await db.collection('study_records')
            .where({ _openid: event.userId })
            .limit(2)
            .get()
            
          console.log('📚 记录查询结果:', JSON.stringify(recordsResult, null, 2))
          result.records = recordsResult.data
          result.message = `✅ 找到用户数据和 ${recordsResult.data.length} 条记录`
        } else {
          result.userNotFound = true
          result.message = '❌ 用户不存在，请先创建测试数据'
          
          // 返回示例数据（方便测试）
          result.exampleData = {
            userData: {
              _openid: event.userId,
              nickName: '测试用户',
              avatarUrl: 'https://example.com/avatar.jpg'
            },
            records: [
              { date: '2026-04-09', duration: 30, type: '学习' },
              { date: '2026-04-08', duration: 45, type: '复习' }
            ]
          }
        }
      } catch (dbError) {
        console.error('❌ 数据库错误:', dbError)
        result.dbError = dbError.message
        result.message = '❌ 数据库查询失败'
        result.errorDetails = {
          code: dbError.errCode,
          message: dbError.errMsg
        }
      }
    }

    return result

  } catch (error) {
    console.error('🔥 云函数严重错误:', error)
    return {
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: Date.now(),
      message: '❌ 云函数执行失败'
    }
  }
}