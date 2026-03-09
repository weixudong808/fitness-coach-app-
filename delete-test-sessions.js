import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteTestSessions() {
  try {
    console.log('🗑️  开始删除测试数据...\n')

    // 读取测试数据ID
    if (!fs.existsSync('test-session-ids.json')) {
      console.log('❌ 找不到测试数据ID文件')
      return
    }

    const testData = JSON.parse(fs.readFileSync('test-session-ids.json', 'utf-8'))
    const { sessionIds, exerciseIds, count } = testData

    console.log(`📋 找到 ${count} 条测试记录`)
    console.log(`   - ${sessionIds.length} 个课次`)
    console.log(`   - ${exerciseIds.length} 个动作\n`)

    // 1. 删除动作记录
    if (exerciseIds.length > 0) {
      const { error: exerciseError } = await supabase
        .from('session_exercises')
        .delete()
        .in('id', exerciseIds)

      if (exerciseError) {
        console.error('❌ 删除动作记录失败:', exerciseError.message)
      } else {
        console.log(`✅ 已删除 ${exerciseIds.length} 个动作记录`)
      }
    }

    // 2. 删除课次记录
    if (sessionIds.length > 0) {
      const { error: sessionError } = await supabase
        .from('training_sessions')
        .delete()
        .in('id', sessionIds)

      if (sessionError) {
        console.error('❌ 删除课次记录失败:', sessionError.message)
      } else {
        console.log(`✅ 已删除 ${sessionIds.length} 个课次记录`)
      }
    }

    // 3. 重新计算认证进度
    console.log('\n🔄 重新计算认证进度...')

    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('name', '张三')
      .single()

    if (!member) {
      console.log('❌ 找不到会员：张三')
      return
    }

    // 统计实际打卡次数
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', member.id)

    const templateIds = plans?.map(p => p.template_id) || []

    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id')
      .in('template_id', templateIds)
      .eq('completed', true)

    const actualCount = sessions?.length || 0

    // 更新所有打卡认证
    const checkInAchievements = [
      { code: 'check_in_10', target: 10 },
      { code: 'check_in_25', target: 25 },
      { code: 'check_in_50', target: 50 },
      { code: 'check_in_75', target: 75 },
      { code: 'check_in_100', target: 100 }
    ]

    for (const achievement of checkInAchievements) {
      const progressPercent = Math.min(Math.round((actualCount / achievement.target) * 100), 100)
      const isCompleted = actualCount >= achievement.target

      await supabase
        .from('member_achievement_progress')
        .upsert({
          member_id: member.id,
          achievement_code: achievement.code,
          current_value: actualCount,
          target_value: achievement.target,
          progress_percent: progressPercent,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'member_id,achievement_code'
        })

      console.log(`  ✅ ${achievement.code}: ${actualCount}/${achievement.target} (${progressPercent}%)`)
    }

    console.log(`\n✅ 认证进度已恢复`)
    console.log(`📊 当前实际打卡次数：${actualCount} 次`)

    // 4. 删除测试数据ID文件
    fs.unlinkSync('test-session-ids.json')
    console.log('\n✅ 测试数据ID文件已删除')
    console.log('🎉 所有测试数据已清理完毕，系统已恢复到测试前状态！')

  } catch (error) {
    console.error('❌ 删除失败:', error)
  }
}

deleteTestSessions()
