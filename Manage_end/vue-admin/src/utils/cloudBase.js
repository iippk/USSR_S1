import { CLOUD_CONFIG } from '../config/cloud.js'

let app = null
let db = null
let isInitialized = false

export async function initCloudBase() {
  try {
    if (typeof cloudbase === 'undefined') {
      throw new Error('CloudBase SDK未加载完成，请刷新页面重试')
    }

    app = cloudbase.init({ env: CLOUD_CONFIG.ENV_ID })
    const auth = app.auth()
    await auth.signInAnonymously()
    db = app.database()
    isInitialized = true

    console.log('✅ 云开发初始化成功')
    return { app, db }
  } catch (error) {
    console.error('❌ 云开发初始化失败:', error)
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

  const res = await app.callFunction({ name, data })
  return res.result
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
