import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Loading from '../../src/components/Loading.vue'

describe('Loading 组件', () => {
  it('show 为 false 时不渲染加载遮罩', () => {
    const wrapper = mount(Loading, {
      props: { show: false }
    })
    expect(wrapper.find('.loading-overlay').exists()).toBe(false)
  })

  it('show 为 true 时渲染加载遮罩和动画', () => {
    const wrapper = mount(Loading, {
      props: { show: true }
    })
    expect(wrapper.find('.loading-overlay').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })

  it('切换 show 状态时正确显示/隐藏', async () => {
    const wrapper = mount(Loading, {
      props: { show: false }
    })
    expect(wrapper.find('.loading-overlay').exists()).toBe(false)

    await wrapper.setProps({ show: true })
    expect(wrapper.find('.loading-overlay').exists()).toBe(true)

    await wrapper.setProps({ show: false })
    expect(wrapper.find('.loading-overlay').exists()).toBe(false)
  })
})
