import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNewCheckInLogic() {
  try {
    // 查询张三的会员ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    console.log(`\n📊 测试新的打卡统计逻辑：${member.name}\n`)

    // 1. 获取有效训练计划（status='active'）
    const { data: memberPlans } = await supabase
      .from('member_plans')
      .select('template_id, member_plans:training_templates(name)')
      .eq('member_id', member.id)
      .eq('status', 'active')

    console.log(`✅ 有效训练计划数量：${memberPlans?.length || 0}`)

    if (memberPlans && memberPlans.length > 0) {
      const activeTemplateIds = memberPlans.map(p => p.template_id)

      console.log('\n有效训练计划列表：')
      for (const plan of memberPlans) {
        const { data: template } = await supabase
          .from('training_templates')
          .select('name')
          .eq('id', plan.template_id)
          .single()

        console.log(`  - ${template?.name}`)
      }

      // 2. 统计这些计划下已完成的课次
      const { data: sessions, count } = await supabase
        .from('training_sessions')
        .select('id, session_number, completed_date, template_id', { count: 'exact' })
        .in('template_id', activeTemplateIds)
        .eq('completed', true)

      console.log(`\n✅ 有效打卡次数：${count} 次\n`)

      // 按计划分组显示
      const sessionsByTemplate = {}
      for (const session of sessions || []) {
        if (!sessionsByTemplate[session.template_id]) {
          sessionsByTemplate[session.template_id] = []
        }
        sessionsByTemplate[session.template_id].push(session)
      }

      console.log('各计划打卡详情：')
      for (const templateId of activeTemplateIds) {
        const { data: template } = await supabase
          .from('training_templates')
          .select('name')
          .eq('id', templateId)
          .single()

        const templateSessions = sessionsByTemplate[templateId] || []
        console.log(`\n  ${template?.name}: ${templateSessions.length} 次`)
        templateSessions.forEach(s => {
          console.log(`    - 第${s.session_number}次课 (${s.completed_date})`)
        })
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ 新逻辑测试完成')
    console.log('='.repeat(50) + '\n')
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testNewCheckInLogic()
