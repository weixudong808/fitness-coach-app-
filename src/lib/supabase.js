import { createClient } from '@supabase/supabase-js'

// 这里需要替换成你的Supabase项目信息
// 注册Supabase后，在项目设置中可以找到这两个值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// 创建教练端专用的 Supabase 客户端
export const coachSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'coach-auth-token',  // 教练端专用 storage key
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 创建会员端专用的 Supabase 客户端
export const memberSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'member-auth-token',  // 会员端专用 storage key
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 默认导出：根据当前路径自动选择合适的客户端
export const supabase = new Proxy({}, {
  get(target, prop) {
    const path = window.location.pathname
    const client = path.startsWith('/coach') ? coachSupabase : memberSupabase
    return client[prop]
  }
})
