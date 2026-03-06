import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.UoJCGZuyVJzAie3_xhveDN9zQzFU4sv4Slag5VI6rq8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listMembers() {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')

    if (error) {
      console.error('❌ 查询出错:', error.message)
      return
    }

    console.log('📋 数据库中的会员列表：')
    console.log('='.repeat(50))
    if (members && members.length > 0) {
      members.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name} (ID: ${member.id})`)
      })
    } else {
      console.log('暂无会员数据')
    }
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ 查询出错:', error.message)
  }
}

listMembers()
