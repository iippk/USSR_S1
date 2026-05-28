import { CLOUD_CONFIG } from '../config/cloud.js'

let app = null
let db = null
let isInitialized = false
let initPromise = null

export async function initCloudBase() {
  if (isInitialized && db) {
    return { app, db }
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = _doInit()

  try {
    const result = await initPromise
    return result
  } catch (error) {
    initPromise = null
    throw error
  }
}

async function _doInit() {
  try {
    if (typeof cloudbase === 'undefined') {
      throw new Error('CloudBase SDK未加载完成，请刷新页面重试')
    }

    app = cloudbase.init({
      env: CLOUD_CONFIG.ENV_ID,
      region: 'ap-shanghai'
    })

    const auth = app.auth({
      persistence: 'local'
    })

    const loginState = await auth.getLoginState()
    if (loginState && loginState.isAnonymousAuth) {
      console.log('✅ 复用已有匿名登录状态')
    } else {
      await auth.signInAnonymously()
      console.log('✅ 匿名登录成功')
    }

    db = app.database()
    isInitialized = true

    console.log('✅ 云开发初始化成功')
    return { app, db }
  } catch (error) {
    console.error('❌ 云开发初始化失败:', error)
    app = null
    db = null
    isInitialized = false
    throw error
  }
}

export function isCloudReady() {
  return isInitialized && db !== null
}

export function getDB() {
  if (!isInitialized || !db) {
    console.warn('⚠️ 云开发尚未初始化，请先调用 initCloudBase()')
    return null
  }
  return db
}

export function getApp() {
  if (!isInitialized || !app) {
    console.warn('⚠️ 云开发尚未初始化')
    return null
  }
  return app
}

export async function callCloudFunction(name, data) {
  if (!app) {
    throw new Error('云开发未初始化')
  }

  try {
    const res = await app.callFunction({ name, data })
    return res.result
  } catch (error) {
    console.error(`❌ 云函数 ${name} 调用失败:`, error)
    if (error.message && (error.message.indexOf('auth') > -1 || error.message.indexOf('login') > -1 || error.message.indexOf('token') > -1)) {
      console.log('🔄 认证过期，尝试重新初始化...')
      isInitialized = false
      app = null
      db = null
      initPromise = null
      await initCloudBase()
      const res = await app.callFunction({ name, data })
      return res.result
    }
    throw error
  }
}

export async function ensureCloudReady() {
  if (isCloudReady()) return true
  try {
    await initCloudBase()
    return true
  } catch (error) {
    console.error('❌ 云开发初始化失败:', error)
    return false
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0分钟'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

export function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return ''
  if (avatarUrl.indexOf('cloud://') === 0) {
    var parts = avatarUrl.split('/')
    if (parts.length >= 4) {
      var envId = parts[2]
      var filePath = parts.slice(3).join('/')
      return 'https://' + envId + '.tcb.qcloud.la/' + filePath
    }
  }
  return avatarUrl
}
