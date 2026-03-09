require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ppjwkqtbgdpeamzbhwta.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function restore25Sessions() {
  try {
    console.log('🔄 恢复25条训练记录...\n')

    // 1. 查询张三的会员信息
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('name', '张三')
      .single()

    console.log('✅ 找到会员：张三')

    // 2. 查询训练计划
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', member.id)
      .limit(1)

    const templateId = plans[0].template_id
    console.log('✅ 使用训练计划:', templateId)

    // 3. 添加25条训练记录
    const sessions = []
    const baseDate = new Date('2026-01-01')

    for (let i = 0; i < 25; i++) {
      const completedDate = new Date(baseDate)
      completedDate.setDate(baseDate.getDate() + i * 3) // 每3天一次

      sessions.push({
        template_id: templateId,
        session_number: i + 1,
        core_focus: '恢复的训练记录',
        training_part: '全身',
        completed: true,
        completed_date: completedDate.toISOString().split('T')[0],
        created_at: completedDate.toISOString()
      })
    }

    const { data: insertedSessions, error } = await supabase
      .from('training_sessions')
      .insert(sessions)
      .select('id')

    if (error) {
      console.error('❌ 插入失败:', error.message)
      return
    }

    console.log('✅ 成功恢复', insertedSessions.length, '条训练记录\n')

    // 4. 为每个课次添加一个动作
    const exercises = insertedSessions.map(session => ({
      session_id: session.id,
      exercise_name: '深蹲',
      weight: '80kg',
      reps_standard: '10次',
      sets: 3,
      order_index: 1
    }))

    const { error: exerciseError } = await supabase
      .from('session_exercises')
      .insert(exercises)

    if (exerciseError) {
      console.error('❌ 插入动作失败:', exerciseError.message)
    } else {
      console.log('✅ 成功添加', exercises.length, '个动作记录\n')
    }

    console.log('🎉 数据恢复完成！')

  } catch (error) {
    console.error('❌ 错误:', error.message)
  }
}

restore25Sessions()
