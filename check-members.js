import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.UoJCGZuyVJzAie3_xhveDN9zQzFU4sv4Slag5VI6rq8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMembers() {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, phone')
    .limit(10)

  if (error) {
    console.error('错误:', error)
    return
  }

  console.log('📋 数据库中的会员：')
  members.forEach(m => {
    console.log(`  - ${m.name} (${m.phone})`)
  })
}

checkMembers()
