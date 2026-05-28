const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()

    if (!OPENID) {
      return { success: false, error: '无法获取用户身份，请重新登录' }
    }

    const { code, nickName, avatarUrl } = event

    if (code) {
      console.log('收到登录code:', code.substring(0, 8) + '...')
    }

    const userResult = await usersCollection.where({ _openid: OPENID }).get()

    if (userResult.data.length === 0) {
      const newUser = {
        _openid: OPENID,
        nickName: nickName || '微信用户',
        avatarUrl: avatarUrl || '',
        totalStudyTime: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await usersCollection.add({ data: newUser })

      try {
        await cloud.callFunction({ name: 'couponManager', data: { action: 'initCoupons' } })
      } catch (e) { console.error('发放新人优惠券失败:', e) }

      return { success: true, data: newUser, message: '用户创建成功' }
    } else {
      const existingUser = userResult.data[0]

      var updateData = { updatedAt: new Date() }

      if (nickName && nickName !== '微信用户') {
        updateData.nickName = nickName
        existingUser.nickName = nickName
      }

      if (avatarUrl) {
        updateData.avatarUrl = avatarUrl
        existingUser.avatarUrl = avatarUrl
      }

      await usersCollection.where({ _openid: OPENID }).update({ data: updateData })

      return { success: true, data: existingUser, message: '登录成功' }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return { success: false, error: error.message }
  }
}
