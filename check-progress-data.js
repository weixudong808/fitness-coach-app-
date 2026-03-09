import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProgressData() {
  try {
    console.log('📊 检查张三的认证进度数据...\n')

    // 1. 获取张三的会员ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    console.log(`会员：${member.name} (${member.id})\n`)

    // 2. 查询 member_achievement_progress 表中的数据
    const { data: progressData } = await supabase
      .from('member_achievement_progress')
      .select('*')
      .eq('member_id', member.id)
      .eq('achievement_code', 'check_in_10')
      .single()

    console.log('member_achievement_progress 表中的数据：')
    console.log('  achievement_code:', progressData?.achievement_code)
    console.log('  current_value:', progressData?.current_value)
    console.log('  target_value:', progressData?.target_value)
    console.log('  progress_percent:', progressData?.progress_percent)
    console.log('  last_updated:', progressData?.last_updated)
    console.log()

    // 3. 实际统计打卡次数
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', member.id)

    const templateIds = plans.map(p => p.template_id)

    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('completed', true)
      .in('template_id', templateIds)

    console.log('实际打卡次数（从数据库统计）:', sessions?.length || 0)
    console.log()

    // 4. 检查前端会读取到什么数据
    console.log('前端 getAchievementsByCategory 会读取到的数据：')
    const { data: frontendData } = await supabase
      .from('member_achievement_progress')
      .select('*')
      .eq('member_id', member.id)
      .order('achievement_code')

    console.log(`  总共 ${frontendData?.length || 0} 条记录`)
    const checkInProgress = frontendData?.filter(d => d.achievement_code.startsWith('check_in'))
    console.log(`  打卡认证进度：`)
    checkInProgress?.forEach(p => {
      console.log(`    - ${p.achievement_code}: ${p.current_value}/${p.target_value} (${p.progress_percent}%)`)
    })

  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

checkProgressData()
