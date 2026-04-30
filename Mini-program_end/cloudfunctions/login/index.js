const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCollection = db.collection('users')

function downloadImage(url) {
  return new Promise(function(resolve, reject) {
    if (!url || url.indexOf('cloud://') === 0) {
      resolve(null)
      return
    }
    var client = url.indexOf('https') === 0 ? https : http
    client.get(url, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode))
        return
      }
      var chunks = []
      res.on('data', function(chunk) { chunks.push(chunk) })
      res.on('end', function() { resolve(Buffer.concat(chunks)) })
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function uploadAvatarToCloud(avatarUrl, openid) {
  try {
    if (!avatarUrl || avatarUrl.indexOf('cloud://') === 0) return avatarUrl

    var buffer = await downloadImage(avatarUrl)
    if (!buffer || buffer.length === 0) return avatarUrl

    var uploadRes = await cloud.uploadFile({
      cloudPath: 'avatars/' + openid + '_' + Date.now() + '.png',
      fileContent: buffer
    })

    if (uploadRes && uploadRes.fileID) {
      console.log('头像已上传到云存储:', uploadRes.fileID)
      return uploadRes.fileID
    }
  } catch (e) {
    console.error('头像上传云存储失败，使用原始URL:', e.message)
  }
  return avatarUrl
}

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()

    const { userInfo } = event

    const userResult = await usersCollection.where({ _openid: OPENID }).get()

    if (userResult.data.length === 0) {
      var avatarUrl = userInfo.avatarUrl || ''
      avatarUrl = await uploadAvatarToCloud(avatarUrl, OPENID)

      const newUser = {
        _openid: OPENID,
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: avatarUrl,
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

      var isWxDefaultNickname = !userInfo || !userInfo.nickName || userInfo.nickName === '微信用户'
      if (!isWxDefaultNickname && existingUser.nickName === '微信用户') {
        updateData.nickName = userInfo.nickName
        existingUser.nickName = userInfo.nickName
      }

      var isWxDefaultAvatar = !userInfo || !userInfo.avatarUrl || userInfo.avatarUrl.indexOf('mmbiz.qpic.cn') > -1 || userInfo.avatarUrl.indexOf('thirdwx.qlogo.cn') > -1
      if (!isWxDefaultAvatar && existingUser.avatarUrl !== userInfo.avatarUrl) {
        var newAvatarUrl = await uploadAvatarToCloud(userInfo.avatarUrl, OPENID)
        if (newAvatarUrl !== existingUser.avatarUrl) {
          updateData.avatarUrl = newAvatarUrl
          existingUser.avatarUrl = newAvatarUrl
        }
      }

      if (existingUser.avatarUrl && existingUser.avatarUrl.indexOf('cloud://') !== 0 && existingUser.avatarUrl.indexOf('mmbiz.qpic.cn') === -1) {
        var migratedUrl = await uploadAvatarToCloud(existingUser.avatarUrl, OPENID)
        if (migratedUrl !== existingUser.avatarUrl) {
          updateData.avatarUrl = migratedUrl
          existingUser.avatarUrl = migratedUrl
        }
      }

      await usersCollection.where({ _openid: OPENID }).update({ data: updateData })

      return { success: true, data: existingUser, message: '登录成功' }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return { success: false, error: error.message }
  }
}
