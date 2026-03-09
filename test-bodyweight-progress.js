import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.UoJCGZuyVJzAie3_xhveDN9zQzFU4sv4Slag5VI6rq8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addBodyweightProgressData() {
  try {
    console.log('🔍 查询张三的会员信息...')

    // 1. 查询张三
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .limit(1)

    if (memberError) throw memberError
    if (!members || members.length === 0) {
      console.log('❌ 未找到张三')
      return
    }

    const member = members[0]
    console.log(`✅ 找到会员: ${member.name}`)

    // 2. 查询张三的训练模板
    const { data: templates, error: templateError } = await supabase
      .from('training_templates')
      .select('id, template_name')
      .eq('member_id', member.id)
      .limit(1)

    if (templateError) throw templateError
    if (!templates || templates.length === 0) {
      console.log('❌ 未找到训练模板')
      return
    }

    const template = templates[0]
    console.log(`✅ 找到模板: ${template.template_name}`)

    // 3. 创建5个训练课次，展示引体向上的进步
    const progressData = [
      { date: '2026-03-01', weight: '自重-15kg', reps: '5次', sets: 3, comment: '使用弹力带辅助' },
      { date: '2026-03-03', weight: '自重-10kg', reps: '6次', sets: 3, comment: '减少辅助' },
      { date: '2026-03-05', weight: '自重', reps: '8次', sets: 3, comment: '完成纯自重' },
      { date: '2026-03-07', weight: '自重+5kg', reps: '6次', sets: 3, comment: '开始负重' },
      { date: '2026-03-08', weight: '自重+10kg', reps: '5次', sets: 3, comment: '增加负重' }
    ]

    console.log('\n📝 开始创建训练记录...\n')

    for (let i = 0; i < progressData.length; i++) {
      const data = progressData[i]

      // 创建课次
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          template_id: template.id,
          session_number: 100 + i, // 使用特殊编号避免冲突
          training_part: '背部',
          session_date: data.date,
          completed: true,
          completed_date: data.date
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // 添加引体向上动作
      const { error: exerciseError } = await supabase
        .from('session_exercises')
        .insert({
          session_id: session.id,
          exercise_name: '引体向上',
          weight: data.weight,
          reps_standard: data.reps,
          sets: data.sets,
          coach_comment: data.comment,
          order_index: 1
        })

      if (exerciseError) throw exerciseError

      console.log(`✅ ${data.date} - 引体向上 ${data.weight} ${data.reps} ${data.sets}组 - ${data.comment}`)
    }

    console.log('\n✅ 测试数据创建成功！')
    console.log('\n📊 进步轨迹：')
    console.log('   辅助-15kg → 辅助-10kg → 自重 → 负重+5kg → 负重+10kg')
    console.log('\n🌐 请在浏览器中打开会员详情页查看"引体向上"的进步趋势图')

  } catch (error) {
    console.error('❌ 错误:', error.message)
  }
}

addBodyweightProgressData()
