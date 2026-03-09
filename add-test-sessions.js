import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 存储添加的测试数据ID，用于后续删除
const testSessionIds = []
const testExerciseIds = []

async function addTestSessions(count) {
  try {
    console.log(`🧪 开始添加 ${count} 次测试训练记录...\n`)

    // 1. 获取张三的会员ID和训练计划
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

    // 2. 获取张三的第一个训练计划
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', member.id)
      .limit(1)

    if (!plans || plans.length === 0) {
      console.log('❌ 找不到训练计划')
      return
    }

    const templateId = plans[0].template_id
    console.log(`✅ 使用训练计划：${templateId}\n`)

    // 3. 批量添加训练课次
    const today = new Date().toISOString().split('T')[0]

    for (let i = 0; i < count; i++) {
      // 添加课次
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          template_id: templateId,
          session_number: 9999 + i,  // 使用特殊编号，方便识别测试数据
          core_focus: `测试课次 ${i + 1}`,
          training_part: '测试',
          session_date: today,
          completed: true,
          completed_date: today
        })
        .select()
        .single()

      if (sessionError) {
        console.error(`❌ 添加课次 ${i + 1} 失败:`, sessionError.message)
        continue
      }

      testSessionIds.push(session.id)

      // 添加一个测试动作
      const { data: exercise, error: exerciseError } = await supabase
        .from('session_exercises')
        .insert({
          session_id: session.id,
          exercise_name: '测试动作',
          reps_standard: '10次',
          sets: 3,
          order_index: 0
        })
        .select()
        .single()

      if (exerciseError) {
        console.error(`❌ 添加动作失败:`, exerciseError.message)
      } else {
        testExerciseIds.push(exercise.id)
      }

      if ((i + 1) % 10 === 0) {
        console.log(`  ✅ 已添加 ${i + 1}/${count} 次训练记录`)
      }
    }

    console.log(`\n✅ 成功添加 ${testSessionIds.length} 次训练记录`)
    console.log(`📝 测试课次ID已保存，用于后续删除\n`)

    // 4. 更新认证进度
    console.log('🔄 更新认证进度...')
    const { data: progressData } = await supabase
      .from('member_achievement_progress')
      .select('current_value')
      .eq('member_id', member.id)
      .eq('achievement_code', 'check_in_10')
      .single()

    const currentCount = progressData?.current_value || 0
    const newCount = currentCount + count

    // 更新所有打卡认证
    const checkInAchievements = [
      { code: 'check_in_10', target: 10 },
      { code: 'check_in_25', target: 25 },
      { code: 'check_in_50', target: 50 },
      { code: 'check_in_75', target: 75 },
      { code: 'check_in_100', target: 100 }
    ]

    for (const achievement of checkInAchievements) {
      const progressPercent = Math.min(Math.round((newCount / achievement.target) * 100), 100)
      const isCompleted = newCount >= achievement.target

      await supabase
        .from('member_achievement_progress')
        .upsert({
          member_id: member.id,
          achievement_code: achievement.code,
          current_value: newCount,
          target_value: achievement.target,
          progress_percent: progressPercent,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'member_id,achievement_code'
        })

      console.log(`  ✅ ${achievement.code}: ${newCount}/${achievement.target} (${progressPercent}%)${isCompleted ? ' 🎉 已完成' : ''}`)
    }

    console.log(`\n✅ 当前总打卡次数：${newCount} 次`)
    console.log(`\n📋 测试数据ID已保存到 test-session-ids.json`)

    // 保存ID到文件，方便后续删除
    const fs = await import('fs')
    fs.writeFileSync('test-session-ids.json', JSON.stringify({
      sessionIds: testSessionIds,
      exerciseIds: testExerciseIds,
      count: testSessionIds.length
    }, null, 2))

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 从命令行参数获取要添加的次数
const count = parseInt(process.argv[2]) || 50
addTestSessions(count)
