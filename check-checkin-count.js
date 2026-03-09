import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCheckInCount() {
  try {
    // 1. 获取所有会员
    const { data: members } = await supabase
      .from('members')
      .select('id, name')

    console.log('\n📊 会员打卡次数统计：\n')

    for (const member of members) {
      // 2. 获取该会员的所有模板
      const { data: templates } = await supabase
        .from('training_templates')
        .select('id, name')
        .eq('member_id', member.id)

      if (!templates || templates.length === 0) {
        console.log(`${member.name}: 0 次（无训练计划）`)
        continue
      }

      const templateIds = templates.map(t => t.id)

      // 3. 统计这些模板下已完成的课次
      const { data: sessions, count } = await supabase
        .from('training_sessions')
        .select('id, session_number, completed_date', { count: 'exact' })
        .in('template_id', templateIds)
        .eq('completed', true)

      console.log(`${member.name}: ${count} 次`)

      if (sessions && sessions.length > 0) {
        console.log('  课次详情：')
        sessions.forEach(s => {
          console.log(`    - 第${s.session_number}次课 (${s.completed_date})`)
        })
      }
      console.log('')
    }
  } catch (error) {
    console.error('查询失败:', error)
  }
}

checkCheckInCount()
