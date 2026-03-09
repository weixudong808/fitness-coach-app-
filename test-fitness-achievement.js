import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFitnessAchievement() {
  try {
    console.log('🧪 测试体能认证计算逻辑...\n')

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

    console.log(`✅ 找到会员：${member.name} (${member.id})\n`)

    // 2. 获取高级核心认证的定义
    const { data: achievement } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('code', 'advanced_fitness_core')
      .single()

    if (!achievement) {
      console.log('❌ 找不到认证：advanced_fitness_core')
      return
    }

    console.log('📋 高级核心认证要求:')
    console.log(`   名称: ${achievement.name}`)
    console.log(`   要求: ${JSON.stringify(achievement.requirement, null, 2)}\n`)

    // 3. 查询张三的训练数据
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', member.id)

    if (!plans || plans.length === 0) {
      console.log('❌ 该会员没有训练计划')
      return
    }

    const templateIds = plans.map(p => p.template_id)
    console.log(`✅ 有效训练计划数量：${plans.length}\n`)

    // 4. 获取已完成课次
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, session_number, completed_date')
      .in('template_id', templateIds)
      .eq('completed', true)

    console.log(`✅ 已完成课次数量：${sessions?.length || 0}\n`)

    // 5. 查询平板支撑和腹肌轮的记录
    const sessionIds = sessions?.map(s => s.id) || []

    console.log('🔍 查询动作记录:\n')

    const exercises = achievement.requirement.exercises || []
    let completedCount = 0

    for (const exercise of exercises) {
      const { data: records } = await supabase
        .from('session_exercises')
        .select('exercise_name, reps_standard, weight, sets')
        .in('session_id', sessionIds)
        .eq('exercise_name', exercise.name)

      console.log(`   ${exercise.name}:`)
      console.log(`   要求: ${exercise.requirement}`)

      if (records && records.length > 0) {
        console.log(`   找到 ${records.length} 条记录:`)
        records.forEach((r, i) => {
          console.log(`     ${i + 1}. ${r.reps_standard} (${r.sets}组)`)
        })

        // 检查是否达标
        const actual = records[0].reps_standard
        if (actual === exercise.requirement) {
          completedCount++
          console.log(`   ✅ 达标！`)
        } else {
          console.log(`   ❌ 未达标`)
        }
      } else {
        console.log(`   ❌ 没有找到记录`)
      }
      console.log('')
    }

    console.log('==================================================')
    console.log(`📊 体能认证进度: ${completedCount}/${achievement.requirement.exercises.length}`)
    console.log('==================================================\n')

    // 6. 更新认证进度
    console.log('🔄 更新认证进度到数据库...\n')

    const progressPercent = Math.min(Math.round((completedCount / achievement.requirement.exercises.length) * 100), 100)
    const isCompleted = completedCount >= achievement.requirement.exercises.length

    const { data, error } = await supabase
      .from('member_achievement_progress')
      .upsert({
        member_id: member.id,
        achievement_code: 'advanced_fitness_core',
        current_value: completedCount,
        target_value: achievement.requirement.exercises.length,
        progress_percent: progressPercent,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'member_id,achievement_code'
      })

    if (error) {
      console.log('❌ 更新失败:', error.message)
    } else {
      console.log(`✅ 更新成功: advanced_fitness_core ${completedCount}/${achievement.requirement.exercises.length} (${progressPercent}%)`)
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testFitnessAchievement()
