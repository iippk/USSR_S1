const envListModule = require('../miniprogram/envList.js')

describe('envList.js 环境配置模块', () => {
  it('导出 envList 数组', () => {
    expect(Array.isArray(envListModule.envList)).toBe(true)
  })

  it('envList 不为空', () => {
    expect(envListModule.envList.length).toBeGreaterThan(0)
  })

  it('每个环境包含 envId 和 alias 字段', () => {
    envListModule.envList.forEach(env => {
      expect(env).toHaveProperty('envId')
      expect(env).toHaveProperty('alias')
      expect(typeof env.envId).toBe('string')
      expect(typeof env.alias).toBe('string')
    })
  })

  it('环境 ID 格式正确（以 cloud 开头）', () => {
    envListModule.envList.forEach(env => {
      expect(env.envId).toMatch(/^cloud/)
    })
  })

  it('导出 isMac 布尔值', () => {
    expect(typeof envListModule.isMac).toBe('boolean')
  })

  it('当前 isMac 为 false（Windows 环境）', () => {
    expect(envListModule.isMac).toBe(false)
  })
})
