import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

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
          userType: currentUser.user_metadata?.user_type,
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
      // 将手机号转换为邮箱格式
      const email = `${phone}@fitness.app`

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
      // 1. 使用手机号作为邮箱格式注册（Supabase 要求邮箱格式）
      const email = `${phone}@fitness.app`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, phone }
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
              phone: memberInfo.phone,
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
    signIn,
    signUp,
    signOut: logout, // 使用新的 logout 函数
    logout, // 也导出 logout 名称
    getUserRole
  }
}
