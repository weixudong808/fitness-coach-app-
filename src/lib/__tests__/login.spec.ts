import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase 模块
vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: { id: 1, name: '测试教练' }, error: null })),
          single: vi.fn(() => ({ data: { id: 1, name: '测试会员' }, error: null }))
        }))
      }))
    }))
  }
}))

import { loginCoachWithAuth, loginMemberWithAuth } from '../api.js'
import { supabase } from '../supabase.js'

describe('登录手机号标准化', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===== 手机号格式校验 =====

  it('非法手机号：太短 → 返回格式错误', async () => {
    const result = await loginCoachWithAuth('123', 'password')
    expect(result.success).toBe(false)
    expect(result.error).toBe('手机号格式错误')
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('非法手机号：字母 → 返回格式错误', async () => {
    const result = await loginCoachWithAuth('abcdefghijk', 'password')
    expect(result.success).toBe(false)
    expect(result.error).toBe('手机号格式错误')
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('非法手机号：不以1开头 → 返回格式错误', async () => {
    const result = await loginCoachWithAuth('28613371019', 'password')
    expect(result.success).toBe(false)
    expect(result.error).toBe('手机号格式错误')
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  // ===== 手机号清洗 + 邮箱映射 =====

  it('标准11位手机号 → 用正确邮箱登录', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })

    await loginCoachWithAuth('18613371019', 'password')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: '18613371019@fitness.app',
      password: 'password'
    })
  })

  it('+86前缀手机号 → 清洗后用正确邮箱登录', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })

    await loginCoachWithAuth('+8618613371019', 'password')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: '18613371019@fitness.app',
      password: 'password'
    })
  })

  it('带空格手机号 → 清洗后用正确邮箱登录', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })

    await loginCoachWithAuth('86 186 1337 1019', 'password')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: '18613371019@fitness.app',
      password: 'password'
    })
  })

  // ===== 登录失败分支 =====

  it('密码错误 → 返回手机号或密码错误', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' }
    })

    const result = await loginCoachWithAuth('18613371019', 'wrong')
    expect(result.success).toBe(false)
    expect(result.error).toBe('手机号或密码错误')
  })

  // ===== 会员登录同样逻辑 =====

  it('会员登录：标准手机号 → 用正确邮箱登录', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null
    })

    await loginMemberWithAuth('13800138000', 'password')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: '13800138000@fitness.app',
      password: 'password'
    })
  })

  it('会员登录：非法手机号 → 返回格式错误', async () => {
    const result = await loginMemberWithAuth('999', 'password')
    expect(result.success).toBe(false)
    expect(result.error).toBe('手机号格式错误')
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})
