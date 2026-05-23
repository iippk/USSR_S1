var zhCN = require('./zh-CN.js')
var zhTW = require('./zh-TW.js')
var en = require('./en.js')

var LANG_KEY = 'app_language'

var langs = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en': en
}

var langLabels = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English'
}

function getCurrentLang() {
  var saved = wx.getStorageSync(LANG_KEY)
  if (saved && langs[saved]) return saved
  var sysLang = 'zh-CN'
  try {
    var sysInfo = wx.getSystemInfoSync()
    var language = sysInfo.language || ''
    if (language.indexOf('zh-TW') > -1 || language.indexOf('zh-HK') > -1 || language.indexOf('zh-Hant') > -1) {
      sysLang = 'zh-TW'
    } else if (language.indexOf('en') > -1) {
      sysLang = 'en'
    }
  } catch (e) {}
  return sysLang
}

function setLang(lang) {
  if (!langs[lang]) return false
  wx.setStorageSync(LANG_KEY, lang)
  return true
}

function t(path) {
  var lang = getCurrentLang()
  var dict = langs[lang] || zhCN
  var parts = path.split('.')
  var result = dict
  for (var i = 0; i < parts.length; i++) {
    if (result && typeof result === 'object' && parts[i] in result) {
      result = result[parts[i]]
    } else {
      result = undefined
      break
    }
  }
  if (result === undefined) {
    result = zhCN
    for (var j = 0; j < parts.length; j++) {
      if (result && typeof result === 'object' && parts[j] in result) {
        result = result[parts[j]]
      } else {
        return path
      }
    }
  }
  return result
}

function getPageText(pageName) {
  var lang = getCurrentLang()
  var dict = langs[lang] || zhCN
  var commonText = dict.common || {}
  var pageText = dict[pageName] || {}
  var result = {}
  var key
  for (key in commonText) {
    if (commonText.hasOwnProperty(key)) {
      result[key] = commonText[key]
    }
  }
  for (key in pageText) {
    if (pageText.hasOwnProperty(key)) {
      result[key] = pageText[key]
    }
  }
  return result
}

function getTabBarText() {
  var lang = getCurrentLang()
  var dict = langs[lang] || zhCN
  return dict.tabBar || {}
}

function getLangLabel(langCode) {
  return langLabels[langCode] || langCode
}

function getSupportedLangs() {
  var result = []
  for (var key in langLabels) {
    if (langLabels.hasOwnProperty(key)) {
      result.push({ code: key, label: langLabels[key] })
    }
  }
  return result
}

function refreshAllPages() {
  var pages = getCurrentPages()
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i]
    if (page && typeof page.applyLanguage === 'function') {
      page.applyLanguage()
    }
  }
  var tabBarPages = pages.filter(function(p) {
    return typeof p.getTabBar === 'function' && p.getTabBar()
  })
  if (tabBarPages.length > 0) {
    var tabBar = tabBarPages[0].getTabBar()
    if (tabBar && typeof tabBar.applyLanguage === 'function') {
      tabBar.applyLanguage()
    }
  }
}

module.exports = {
  getCurrentLang: getCurrentLang,
  setLang: setLang,
  t: t,
  getPageText: getPageText,
  getTabBarText: getTabBarText,
  getLangLabel: getLangLabel,
  getSupportedLangs: getSupportedLangs,
  refreshAllPages: refreshAllPages
}
