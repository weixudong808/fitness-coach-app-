import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.UoJCGZuyVJzAie3_xhveDN9zQzFU4sv4Slag5VI6rq8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function queryMember(memberName) {
  // 1. 查询会员信息
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('name', memberName)
    .single()

  if (memberError || !member) {
    console.log(JSON.stringify({ error: `找不到会员"${memberName}"，请确认会员姓名` }))
    return
  }

  // 2. 查询活跃的训练计划
  const { data: activePlan, error: planError } = await supabase
    .from('member_plans')
    .select('*')
    .eq('member_id', member.id)
    .eq('status', 'active')
    .single()

  if (planError || !activePlan) {
    console.log(JSON.stringify({ error: `会员"${memberName}"当前没有活跃的训练计划` }))
    return
  }

  // 3. 查询待训练课次
  const { data: sessions, error: sessionsError } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('template_id', activePlan.template_id)
    .eq('completed', false)
    .order('session_number', { ascending: true })

  if (sessionsError || !sessions || sessions.length === 0) {
    console.log(JSON.stringify({ error: `会员"${memberName}"的所有课次都已完成` }))
    return
  }

  // 选择 session_number 最小的课次
  const currentSession = sessions[0]

  console.log(JSON.stringify({
    member,
    activePlan,
    currentSession
  }))
}

const memberName = process.argv[2] || '张三'
queryMember(memberName)
