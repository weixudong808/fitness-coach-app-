require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkIsCompleted() {
  try {
    // 查询张三的打卡认证进度
    const { data, error } = await supabase
      .from('member_achievement_progress')
      .select('achievement_code, current_value, target_value, progress_percent, is_completed, completed_at')
      .eq('member_id', '2f5278bf-022e-4138-bfc9-6b07af825d31')
      .like('achievement_code', 'check_in_%')
      .order('target_value')

    if (error) {
      console.error('❌ 查询失败:', error)
      return
    }

    console.log('📊 张三的打卡认证详情：\n')
    data.forEach(item => {
      const status = item.is_completed ? '✅ 已完成' : '⏳ 进行中'
      console.log(`${status} ${item.achievement_code}:`)
      console.log(`   进度: ${item.current_value}/${item.target_value} (${item.progress_percent}%)`)
      console.log(`   is_completed: ${item.is_completed}`)
      console.log(`   completed_at: ${item.completed_at || '未完成'}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ 错误:', error)
  }
}

checkIsCompleted()
