import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testMemberQuery() {
  try {
    console.log('🧪 测试会员端查询...\n')

    // 1. 测试查询 achievement_definitions（应该成功，因为所有人可读）
    console.log('1️⃣ 测试查询 achievement_definitions...')
    const { data: defs, error: defError } = await supabase
      .from('achievement_definitions')
      .select('code, name')
      .limit(3)

    if (defError) {
      console.log('❌ 失败:', defError.message)
      console.log('   错误详情:', JSON.stringify(defError, null, 2))
    } else {
      console.log('✅ 成功，找到', defs.length, '条记录\n')
    }

    // 2. 测试查询 member_achievement_progress（可能失败，需要认证）
    console.log('2️⃣ 测试查询 member_achievement_progress（未登录）...')
    const { data: progress, error: progressError } = await supabase
      .from('member_achievement_progress')
      .select('*')
      .limit(1)

    if (progressError) {
      console.log('❌ 失败:', progressError.message)
      console.log('   错误代码:', progressError.code)
      console.log('   错误详情:', JSON.stringify(progressError, null, 2))
    } else {
      console.log('✅ 成功，找到', progress?.length || 0, '条记录\n')
    }

    // 3. 测试查询特定会员的进度（张三）
    console.log('3️⃣ 测试查询张三的进度（未登录）...')

    // 先获取张三的 ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    if (!member) {
      console.log('❌ 找不到会员：张三')
      return
    }

    console.log('   会员ID:', member.id)

    const { data: memberProgress, error: memberProgressError } = await supabase
      .from('member_achievement_progress')
      .select('*')
      .eq('member_id', member.id)
      .limit(3)

    if (memberProgressError) {
      console.log('❌ 失败:', memberProgressError.message)
      console.log('   错误代码:', memberProgressError.code)
      console.log('   HTTP状态:', memberProgressError.status)
      console.log('   错误详情:', JSON.stringify(memberProgressError, null, 2))
    } else {
      console.log('✅ 成功，找到', memberProgress?.length || 0, '条记录')
      if (memberProgress && memberProgress.length > 0) {
        console.log('   示例:', memberProgress[0].achievement_code, '-', memberProgress[0].current_value, '/', memberProgress[0].target_value)
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testMemberQuery()
