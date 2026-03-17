import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { phoneToAuthIdentity } from '../lib/authIdentity.js'

const user = ref(null)
const loading = ref(false)

export function useAuth() {
  // 获取当前用户（兼容新旧方式）
  const getCurrentUser = async () => {
    loading.value = true
    try {
      // 1. 优先从 Supabase Auth 获取（新用户）
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (currentUser) {
        user.value = currentUser
        return {
          id: currentUser.id,
          phone: currentUser.phone || currentUser.user_metadata?.phone,
          name: currentUser.user_metadata?.name,
          // 统一读取角色：优先 app_metadata.role，再 user_metadata.role，再 user_metadata.user_type
          userType: currentUser.app_metadata?.role || currentUser.user_metadata?.role || currentUser.user_metadata?.user_type,
          isNewAuth: true // 标记为新认证方式
        }
      }

      // 2. 如果 Supabase Auth 没有用户，尝试从 localStorage 获取（老用户）
      const userType = localStorage.getItem('userType')
      const userId = localStorage.getItem('userId')
      const userName = localStorage.getItem('userName')

      if (userType && userId) {
        return {
          id: userId,
          name: userName,
          userType: userType,
          isNewAuth: false // 标记为旧认证方式
        }
      }

      return null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    } finally {
      loading.value = false
    }
  }

  // 检查是否已登录（兼容新旧方式）
  const isAuthenticated = async () => {
    // 1. 检查 Supabase Auth（新用户）
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      return true
    }

    // 2. 检查 localStorage（老用户）
    const userType = localStorage.getItem('userType')
    const userId = localStorage.getItem('userId')

    return !!(userType && userId)
  }

  // 退出登录（清理新旧两种登录态）
  const logout = async () => {
    loading.value = true
    try {
      // 1. 清理 Supabase Auth（新用户）
      await supabase.auth.signOut()

      // 2. 清理 localStorage（老用户）
      localStorage.removeItem('userType')
      localStorage.removeItem('userId')
      localStorage.removeItem('userName')
      localStorage.removeItem('userGender')
      localStorage.removeItem('coachData')

      user.value = null
      return { success: true }
    } catch (error) {
      console.error('退出登录失败:', error)
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // 登录
  const signIn = async (phone, password) => {
    loading.value = true
    try {
      const { email, isValid } = phoneToAuthIdentity(phone)
      if (!isValid) {
        return { success: false, error: '手机号格式错误' }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      user.value = data.user
      return { success: true, user: data.user }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // 注册
  const signUp = async (phone, password, role = 'member', memberInfo = null) => {
    loading.value = true
    try {
      // 1. 使用手机号映射的邮箱身份注册
      const { normalizedPhone, email, isValid } = phoneToAuthIdentity(phone)
      if (!isValid) {
        return { success: false, error: '手机号格式错误' }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, phone: normalizedPhone }
        }
      })
      if (error) throw error

      // 2. 创建用户角色记录
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: data.user.id,
            role: role
          }])

        if (roleError) {
          console.error('创建用户角色失败:', roleError)
        }

        // 3. 如果是会员，创建会员记录
        if (role === 'member' && memberInfo) {
          const { error: memberError } = await supabase
            .from('members')
            .insert([{
              user_id: data.user.id,
              name: memberInfo.name,
              gender: memberInfo.gender,
              age: memberInfo.age,
              phone: normalizedPhone,
              height: memberInfo.height,
              initial_weight: memberInfo.initial_weight,
              initial_body_fat: memberInfo.initial_body_fat
            }])

          if (memberError) {
            console.error('创建会员记录失败:', memberError)
            throw new Error('创建会员信息失败')
          }
        }
      }

      return { success: true, user: data.user }
    } catch (error) {
      console.error('注册失败:', error)
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const signOut = async () => {
    loading.value = true
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      user.value = null
      return { success: true }
    } catch (error) {
      console.error('登出失败:', error)
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // 统一获取会员ID（兼容新老用户）
  // 新用户：通过 Supabase Auth → 查 members 表的 user_id 字段
  // 老用户：直接从 localStorage 读取 userId（老系统存的就是 members.id）
  const resolveCurrentMemberId = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: member, error } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', authUser.id)
          .single()
        if (error || !member) return null
        return member.id // 返回 members.id（字符串）
      }
      // 老用户：localStorage 里的 userId 就是 members.id
      const userId = localStorage.getItem('userId')
      return userId || null
    } catch (error) {
      console.error('获取会员ID失败:', error)
      return null
    }
  }

  // 统一获取教练ID（兼容新老用户 + 历史数据双ID兼容）
  // 返回：{ coachId, authUserId }
  // - coachId: coaches.id（统一写入标准，必须有值才允许写入）
  // - authUserId: auth.users.id（仅用于查询历史数据）
  const resolveCurrentCoachId = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        // ✅ 优先查 coaches 表：存在即为教练（不依赖 metadata）
        const { data: coach, error } = await supabase
          .from('coaches')
          .select('id')
          .eq('user_id', authUser.id)
          .single()

        if (coach) {
          // ✅ 找到了 coaches 记录，直接返回
          return { coachId: coach.id, authUserId: authUser.id }
        }

        // ⚠️ 有 authUser 但查不到 coaches 记录
        // 可能是半迁移用户，检查 localStorage 兜底
        const localUserId = localStorage.getItem('userId')
        if (localUserId) {
          // 验证这个 localUserId 是否存在于 coaches 表
          const { data: localCoach, error: localError } = await supabase
            .from('coaches')
            .select('id')
            .eq('id', localUserId)
            .single()

          if (localCoach) {
            // 返回 localStorage 的教练ID + authUserId（用于查询历史数据）
            return { coachId: localCoach.id, authUserId: authUser.id }
          }
        }

        // ❌ 查不到有效的教练记录，不允许写入
        console.error('找不到对应的教练记录')
        return { coachId: null, authUserId: authUser.id }  // 只返回 authUserId 用于查询
      }

      // 老教练：localStorage 里的 userId 就是 coaches.id
      const userId = localStorage.getItem('userId')
      const userType = localStorage.getItem('userType')

      if (userId && userType === 'coach') {
        // 验证这个 userId 是否存在于 coaches 表
        const { data: coach, error } = await supabase
          .from('coaches')
          .select('id')
          .eq('id', userId)
          .is('user_id', null)  // 确保是老用户
          .single()

        if (coach) {
          return { coachId: coach.id, authUserId: null }
        }
      }

      console.error('未找到有效的教练登录信息')
      return { coachId: null, authUserId: null }
    } catch (error) {
      console.error('获取教练ID失败:', error)
      return { coachId: null, authUserId: null }
    }
  }

  // 检查用户角色
  const getUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data?.role || 'member'
    } catch (error) {
      console.error('获取用户角色失败:', error)
      return 'member'
    }
  }

  const isAuthenticatedComputed = computed(() => !!user.value)

  return {
    user,
    loading,
    isAuthenticated, // 函数版本（兼容新旧方式）
    isAuthenticatedComputed, // computed 版本（保持向后兼容）
    getCurrentUser,
    resolveCurrentMemberId, // 统一获取会员ID（新老用户兼容）
    resolveCurrentCoachId, // 统一获取教练ID（新老用户兼容 + 双ID查询）
    signIn,
    signUp,
    signOut: logout, // 使用新的 logout 函数
    logout, // 也导出 logout 名称
    getUserRole
  }
}

// 独立导出 getCoachId 函数，供其他 composables 直接导入使用
// 与 resolveCurrentCoachId 保持同一套逻辑，避免两套判断漂移
export async function getCoachId() {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      // ✅ 优先查 coaches 表：存在即为教练（不依赖 metadata）
      const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (coach) {
        return { coachId: coach.id, authUserId: authUser.id }
      }

      // ⚠️ 没找到 coaches 记录，尝试老用户兜底
      // 老教练：localStorage 里的 userId 就是 coaches.id，且 userType === 'coach'
      const userId = localStorage.getItem('userId')
      const userType = localStorage.getItem('userType')

      if (userId && userType === 'coach') {
        const { data: localCoach } = await supabase
          .from('coaches')
          .select('id')
          .eq('id', userId)
          .is('user_id', null)  // 确保是老用户
          .maybeSingle()

        if (localCoach) {
          return { coachId: localCoach.id, authUserId: authUser.id }
        }
      }

      return { coachId: null, authUserId: authUser.id }
    }

    // 未登录，尝试老用户兜底
    const userId = localStorage.getItem('userId')
    const userType = localStorage.getItem('userType')

    if (userId && userType === 'coach') {
      const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', userId)
        .is('user_id', null)  // 确保是老用户
        .maybeSingle()

      if (coach) {
        return { coachId: coach.id, authUserId: null }
      }
    }

    return { coachId: null, authUserId: null }
  } catch (error) {
    console.error('获取教练ID失败:', error)
    return { coachId: null, authUserId: null }
  }
}
