import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Toast from '../../src/components/Toast.vue'

describe('Toast 组件', () => {
  it('show 为 false 时不渲染内容', () => {
    const wrapper = mount(Toast, {
      props: { message: '测试消息', show: false }
    })
    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  it('show 为 true 时渲染消息内容', () => {
    const wrapper = mount(Toast, {
      props: { message: '操作成功', show: true }
    })
    const toastEl = wrapper.find('.toast')
    expect(toastEl.exists()).toBe(true)
    expect(toastEl.text()).toContain('操作成功')
  })

  it('默认 type 为 info', () => {
    const wrapper = mount(Toast, {
      props: { message: '提示', show: true }
    })
    expect(wrapper.find('.toast.info').exists()).toBe(true)
  })

  it('支持 success 类型', () => {
    const wrapper = mount(Toast, {
      props: { message: '成功', type: 'success', show: true }
    })
    expect(wrapper.find('.toast.success').exists()).toBe(true)
  })

  it('支持 error 类型', () => {
    const wrapper = mount(Toast, {
      props: { message: '错误', type: 'error', show: true }
    })
    expect(wrapper.find('.toast.error').exists()).toBe(true)
  })

  it('支持 warning 类型', () => {
    const wrapper = mount(Toast, {
      props: { message: '警告', type: 'warning', show: true }
    })
    expect(wrapper.find('.toast.warning').exists()).toBe(true)
  })

  it('消息内容更新时响应式更新', async () => {
    const wrapper = mount(Toast, {
      props: { message: '旧消息', show: true }
    })
    expect(wrapper.text()).toContain('旧消息')
    await wrapper.setProps({ message: '新消息' })
    expect(wrapper.text()).toContain('新消息')
  })
})
