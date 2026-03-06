import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.UoJCGZuyVJzAie3_xhveDN9zQzFU4sv4Slag5VI6rq8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTables() {
  console.log('检查各个表的数据...\n')

  // 检查训练模板
  const { data: templates, error: templateError } = await supabase
    .from('training_templates')
    .select('*')
    .limit(5)

  console.log('📋 training_templates:')
  if (templateError) {
    console.log('  ❌ 错误:', templateError.message)
  } else {
    console.log('  ✅ 记录数:', templates?.length || 0)
    if (templates && templates.length > 0) {
      console.log('  示例:', templates[0])
    }
  }

  // 检查训练课次
  const { data: sessions, error: sessionsError } = await supabase
    .from('training_sessions')
    .select('*')
    .limit(5)

  console.log('\n📋 training_sessions:')
  if (sessionsError) {
    console.log('  ❌ 错误:', sessionsError.message)
  } else {
    console.log('  ✅ 记录数:', sessions?.length || 0)
    if (sessions && sessions.length > 0) {
      console.log('  示例:', sessions[0])
    }
  }

  // 检查会员
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('*')

  console.log('\n📋 members:')
  if (membersError) {
    console.log('  ❌ 错误:', membersError.message)
  } else {
    console.log('  ✅ 记录数:', members?.length || 0)
  }

  // 检查会员计划
  const { data: plans, error: plansError } = await supabase
    .from('member_plans')
    .select('*')

  console.log('\n📋 member_plans:')
  if (plansError) {
    console.log('  ❌ 错误:', plansError.message)
  } else {
    console.log('  ✅ 记录数:', plans?.length || 0)
  }
}

checkTables()
