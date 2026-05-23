import { describe, it, expect } from 'vitest'
import { formatDate, formatDuration, getAvatarUrl } from '../../src/utils/cloudBase.js'

describe('cloudBase 工具函数', () => {

  describe('formatDate', () => {
    it('空值返回 "-"', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate(undefined)).toBe('-')
      expect(formatDate('')).toBe('-')
    })

    it('正确格式化日期时间字符串', () => {
      const result = formatDate('2026-04-30T10:30:45.000Z')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })

    it('格式化包含日期对象兼容输入', () => {
      const dateStr = '2026-01-05T08:15:30Z'
      const result = formatDate(dateStr)
      expect(result).toContain('2026-01-05')
    })
  })

  describe('formatDuration', () => {
    it('空值或零返回 "0分钟"', () => {
      expect(formatDuration(0)).toBe('0分钟')
      expect(formatDuration(null)).toBe('0分钟')
      expect(formatDuration(undefined)).toBe('0分钟')
      expect(formatDuration(-5)).toBe('0分钟')
    })

    it('纯分钟数（< 1小时）', () => {
      expect(formatDuration(120)).toBe('2分钟')
      expect(formatDuration(3599)).toBe('59分钟')
    })

    it('小时+分钟混合', () => {
      expect(formatDuration(3600)).toBe('1小时0分钟')
      expect(formatDuration(7200)).toBe('2小时0分钟')
      expect(formatDuration(3661)).toBe('1小时1分钟')
      expect(formatDuration(7265)).toBe('2小时1分钟')
    })
  })

  describe('getAvatarUrl', () => {
    it('空值返回空字符串', () => {
      expect(getAvatarUrl(null)).toBe('')
      expect(getAvatarUrl('')).toBe('')
    })

    it('普通 URL 原样返回', () => {
      const url = 'https://example.com/avatar.png'
      expect(getAvatarUrl(url)).toBe(url)
    })

    it('cloud:// 开头的 URL 转换为 HTTPS URL 格式', () => {
      const cloudUrl = 'cloud://env-id/avatars/test.png'
      const result = getAvatarUrl(cloudUrl)
      expect(result).toContain('https://')
      expect(result).toContain('tcb.qcloud.la')
      expect(result).toContain('avatars/test.png')
    })

    it('cloud:// URL 路径部分正确保留', () => {
      const cloudUrl = 'cloud://my-env/path/to/avatar.jpg'
      const result = getAvatarUrl(cloudUrl)
      expect(result).toMatch(/^https:\/\/.*\.tcb\.qcloud\.la\/path\/to\/avatar\.jpg$/)
    })

    it('非 cloud:// 开头的云路径原样返回', () => {
      const url = 'http://example.com/image.png'
      expect(getAvatarUrl(url)).toBe(url)
    })
  })
})
