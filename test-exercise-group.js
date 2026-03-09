import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 复制 parseTrainingValue 函数
const parseTrainingValue = (valueStr) => {
  if (!valueStr) return 0

  const str = String(valueStr).trim()

  // 解析时间：5分钟 -> 300秒
  const timeMatch = str.match(/^(\d+(?:\.\d+)?)\s*分钟?$/)
  if (timeMatch) {
    return parseFloat(timeMatch[1]) * 60
  }

  // 解析秒：90秒 -> 90
  const secondMatch = str.match(/^(\d+(?:\.\d+)?)\s*秒$/)
  if (secondMatch) {
    return parseFloat(secondMatch[1])
  }

  // 解析次数：10个 -> 10
  const countMatch = str.match(/^(\d+(?:\.\d+)?)\s*个?$/)
  if (countMatch) {
    return parseFloat(countMatch[1])
  }

  // 解析重量：80kg -> 80
  const weightMatch = str.match(/^(\d+(?:\.\d+)?)\s*kg$/)
  if (weightMatch) {
    return parseFloat(weightMatch[1])
  }

  // 纯数字
  const numMatch = str.match(/^(\d+(?:\.\d+)?)$/)
  if (numMatch) {
    return parseFloat(numMatch[1])
  }

  return 0
}

async function testExerciseGroup() {
  try {
    console.log('🧪 测试动作组认证计算逻辑...\n')

    // 1. 获取张三的会员ID和性别
    const { data: member } = await supabase
      .from('members')
      .select('id, name, gender')
      .eq('name', '张三')
      .single()

    if (!member) {
      console.log('❌ 找不到会员：张三')
      return
    }

    console.log(`✅ 找到会员：${member.name} (${member.gender})\n`)

    const isMale = member.gender === 'male'

    // 2. 获取高级核心认证的定义
    const { data: achievement } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('code', 'advanced_fitness_core')
      .single()

    console.log('📋 高级核心认证要求:')
    achievement.requirement.exercises.forEach(ex => {
      const target = isMale ? ex.target_male : ex.target_female
      console.log(`   - ${ex.name}: ${target}${ex.name.includes('支撑') ? '秒' : '个'}`)
    })
    console.log('')

    // 3. 获取训练计划
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', member.id)

    const templateIds = plans?.map(p => p.template_id) || []

    // 4. 获取已完成课次
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id')
      .in('template_id', templateIds)
      .eq('completed', true)

    const sessionIds = sessions?.map(s => s.id) || []

    console.log(`✅ 已完成课次数量：${sessions?.length || 0}\n`)

    // 5. 检查每个动作
    console.log('🔍 检查动作完成情况:\n')

    let completedCount = 0
    const exercises = achievement.requirement.exercises || []

    for (const exercise of exercises) {
      const targetValue = isMale ? exercise.target_male : exercise.target_female

      const { data: records } = await supabase
        .from('session_exercises')
        .select('reps_standard')
        .in('session_id', sessionIds)
        .eq('exercise_name', exercise.name)
        .limit(1)

      console.log(`   ${exercise.name}:`)
      console.log(`   目标: ${targetValue}${exercise.name.includes('支撑') ? '秒' : '个'}`)

      if (records && records.length > 0) {
        const actualStr = records[0].reps_standard
        const actualValue = parseTrainingValue(actualStr)

        console.log(`   实际: ${actualStr} (解析为: ${actualValue})`)

        if (actualValue >= targetValue) {
          completedCount++
          console.log(`   ✅ 达标！\n`)
        } else {
          console.log(`   ❌ 未达标 (${actualValue} < ${targetValue})\n`)
        }
      } else {
        console.log(`   ❌ 没有找到记录\n`)
      }
    }

    console.log('==================================================')
    console.log(`📊 体能认证进度: ${completedCount}/${exercises.length}`)
    console.log('==================================================\n')

    // 6. 更新数据库
    console.log('🔄 更新认证进度到数据库...\n')

    const progressPercent = Math.min(Math.round((completedCount / exercises.length) * 100), 100)
    const isCompleted = completedCount >= exercises.length

    const { error } = await supabase
      .from('member_achievement_progress')
      .upsert({
        member_id: member.id,
        achievement_code: 'advanced_fitness_core',
        current_value: completedCount,
        target_value: exercises.length,
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
      console.log(`✅ 更新成功: advanced_fitness_core ${completedCount}/${exercises.length} (${progressPercent}%)`)
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testExerciseGroup()
