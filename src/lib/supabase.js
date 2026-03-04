import { createClient } from '@supabase/supabase-js'

// 这里需要替换成你的Supabase项目信息
// 注册Supabase后，在项目设置中可以找到这两个值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
