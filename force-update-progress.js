import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function forceUpdateProgress() {
  try {
    console.log('🔄 强制更新张三的认证进度...\n')

    // 1. 获取张三的会员ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    if (!member) {
      console.log('❌ 找不到会员：张三')
      return
    }

    console.log(`✅ 找到会员：${member.name} (${member.id})`)

    // 2. 计算实际打卡次数（只统计有效训练计划）
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', member.id)

    if (!plans || plans.length === 0) {
      console.log('❌ 该会员没有训练计划')
      return
    }

    const templateIds = plans.map(p => p.template_id)
    console.log(`✅ 有效训练计划数量：${plans.length}`)

    // 3. 统计已完成课次
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, template_id, session_number, completed_date')
      .eq('completed', true)
      .in('template_id', templateIds)
      .order('completed_date', { ascending: false })

    const checkInCount = sessions?.length || 0
    console.log(`✅ 实际打卡次数：${checkInCount} 次\n`)

    // 4. 更新所有打卡认证的进度
    const checkInAchievements = [
      { code: 'check_in_10', target: 10 },
      { code: 'check_in_25', target: 25 },
      { code: 'check_in_50', target: 50 },
      { code: 'check_in_75', target: 75 },
      { code: 'check_in_100', target: 100 }
    ]

    for (const achievement of checkInAchievements) {
      const progressPercent = Math.min(Math.round((checkInCount / achievement.target) * 100), 100)
      const isCompleted = checkInCount >= achievement.target

      const { data, error } = await supabase
        .from('member_achievement_progress')
        .upsert({
          member_id: member.id,
          achievement_code: achievement.code,
          current_value: checkInCount,
          target_value: achievement.target,
          progress_percent: progressPercent,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'member_id,achievement_code'
        })

      if (error) {
        console.log(`  ❌ ${achievement.code}: 更新失败`)
        console.log(`     错误信息: ${error.message}`)
        console.log(`     错误详情: ${JSON.stringify(error, null, 2)}`)
      } else {
        console.log(`  ✅ ${achievement.code}: ${checkInCount}/${achievement.target} (${progressPercent}%)`)

        // 如果已完成，同时插入 member_achievements 表
        if (isCompleted) {
          const { error: achievementError } = await supabase
            .from('member_achievements')
            .upsert({
              member_id: member.id,
              achievement_code: achievement.code,
              achieved_at: new Date().toISOString()
            }, {
              onConflict: 'member_id,achievement_code'
            })

          if (achievementError) {
            console.log(`     ⚠️  插入徽章记录失败: ${achievementError.message}`)
          } else {
            console.log(`     🎖️  徽章已点亮`)
          }
        }
      }
    }

    console.log('\n✅ 认证进度更新完成！')
    console.log('请刷新浏览器页面查看最新数据')

  } catch (error) {
    console.error('❌ 更新失败:', error)
  }
}

forceUpdateProgress()
