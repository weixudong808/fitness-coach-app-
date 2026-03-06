import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.UoJCGZuyVJzAie3_xhveDN9zQzFU4sv4Slag5VI6rq8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createMemberWithPlan() {
  try {
    // 1. 创建会员
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({ name: '张三' })
      .select()
      .single()

    if (memberError) {
      console.error('❌ 创建会员失败:', memberError.message)
      return
    }

    console.log('✅ 创建会员成功:', member)

    // 2. 查询是否有训练模板
    const { data: templates, error: templateError } = await supabase
      .from('training_templates')
      .select('*')
      .limit(1)

    if (templateError || !templates || templates.length === 0) {
      console.log('❌ 数据库中没有训练模板，需要先导入训练计划')
      return
    }

    const template = templates[0]
    console.log('✅ 找到训练模板:', template.name)

    // 3. 为会员创建训练计划
    const { data: memberPlan, error: planError } = await supabase
      .from('member_plans')
      .insert({
        member_id: member.id,
        template_id: template.id,
        status: 'active'
      })
      .select()
      .single()

    if (planError) {
      console.error('❌ 创建训练计划失败:', planError.message)
      return
    }

    console.log('✅ 创建训练计划成功')

    // 4. 查询第一个待训练课次
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('template_id', template.id)
      .eq('completed', false)
      .order('session_number', { ascending: true })
      .limit(1)

    if (sessionsError || !sessions || sessions.length === 0) {
      console.log('❌ 没有找到待训练课次')
      return
    }

    const currentSession = sessions[0]

    // 5. 显示信息
    console.log('\n' + '='.repeat(50))
    console.log('✅ 已开启张三的训练记录')
    console.log('📋 会员：' + member.name)
    console.log('📅 训练计划：' + template.name)
    console.log('🎯 当前课次：第' + currentSession.session_number + '次课 - ' + currentSession.core_focus)
    console.log('📍 训练部位：' + currentSession.training_part)
    console.log('='.repeat(50))
    console.log('\n请告诉我训练动作，我会实时保存到数据库。\n')

    // 返回状态信息供后续使用
    console.log('\n📝 状态信息（供记录使用）:')
    console.log(JSON.stringify({
      memberId: member.id,
      memberName: member.name,
      planId: memberPlan.id,
      templateId: template.id,
      sessionId: currentSession.id,
      sessionNumber: currentSession.session_number
    }, null, 2))

  } catch (error) {
    console.error('❌ 操作出错:', error.message)
  }
}

createMemberWithPlan()
