import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCheckInDetail() {
  try {
    // 查询张三的会员ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    console.log(`\n📊 ${member.name} 的打卡详情：\n`)

    // 获取该会员的所有模板
    const { data: templates } = await supabase
      .from('training_templates')
      .select('id, name, is_template')
      .eq('member_id', member.id)

    console.log(`训练计划数量：${templates.length}\n`)

    for (const template of templates) {
      console.log(`📋 训练计划：${template.name} (${template.is_template ? '模板' : '专属计划'})`)

      // 统计这个计划下已完成的课次
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id, session_number, completed_date, training_part')
        .eq('template_id', template.id)
        .eq('completed', true)
        .order('completed_date')

      console.log(`   已完成课次：${sessions?.length || 0} 次`)

      if (sessions && sessions.length > 0) {
        sessions.forEach(s => {
          console.log(`      - 第${s.session_number}次课 | ${s.training_part || '无部位'} | ${s.completed_date}`)
        })
      }
      console.log('')
    }

    // 总计
    const templateIds = templates.map(t => t.id)
    const { count } = await supabase
      .from('training_sessions')
      .select('id', { count: 'exact' })
      .in('template_id', templateIds)
      .eq('completed', true)

    console.log(`\n✅ 总打卡次数：${count} 次`)
  } catch (error) {
    console.error('查询失败:', error)
  }
}

checkCheckInDetail()
