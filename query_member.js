import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.UoJCGZuyVJzAie3_xhveDN9zQzFU4sv4Slag5VI6rq8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function openTrainingRecord(memberName) {
  try {
    // 1. 查询会员信息
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('name', memberName)
      .single()

    if (memberError || !member) {
      console.log(`❌ 找不到会员"${memberName}"，请确认会员姓名`)
      return
    }

    console.log('✅ 找到会员:', member)

    // 2. 查询活跃的训练计划
    const { data: activePlan, error: planError } = await supabase
      .from('member_plans')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'active')
      .single()

    if (planError || !activePlan) {
      console.log(`❌ 会员"${memberName}"当前没有活跃的训练计划`)
      return
    }

    console.log('✅ 找到活跃计划:', activePlan)

    // 3. 查询待训练课次
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('template_id', activePlan.template_id)
      .eq('completed', false)
      .order('session_number', { ascending: true })

    if (sessionsError || !sessions || sessions.length === 0) {
      console.log(`❌ 会员"${memberName}"的所有课次都已完成`)
      return
    }

    const currentSession = sessions[0]
    console.log('✅ 找到待训练课次:', currentSession)

    // 4. 显示信息
    console.log('\n' + '='.repeat(50))
    console.log('✅ 已开启张三的训练记录')
    console.log('📋 会员：' + member.name)
    console.log('📅 训练计划ID：' + activePlan.template_id)
    console.log('🎯 当前课次：第' + currentSession.session_number + '次课 - ' + currentSession.core_focus)
    console.log('📍 训练部位：' + currentSession.training_part)
    console.log('='.repeat(50))
    console.log('\n请告诉我训练动作，我会实时保存到数据库。\n')

    // 返回状态信息
    return {
      memberId: member.id,
      memberName: member.name,
      planId: activePlan.id,
      templateId: activePlan.template_id,
      sessionId: currentSession.id,
      sessionNumber: currentSession.session_number
    }

  } catch (error) {
    console.error('❌ 查询出错:', error.message)
  }
}

// 执行查询
openTrainingRecord('张三')
