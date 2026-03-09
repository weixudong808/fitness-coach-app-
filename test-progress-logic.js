import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testProgressLogic() {
  try {
    // 查询张三的会员ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    console.log(`\n✅ 测试"我的进步"页面的逻辑：${member.name}\n`)

    // 1. 查询 member_plans（不过滤 status）
    const { data: plansData } = await supabase
      .from('member_plans')
      .select('template_id, status')
      .eq('member_id', member.id)

    console.log(`member_plans 记录数：${plansData?.length || 0}`)

    if (plansData && plansData.length > 0) {
      for (const plan of plansData) {
        const { data: template } = await supabase
          .from('training_templates')
          .select('name')
          .eq('id', plan.template_id)
          .single()

        console.log(`  - ${template?.name} (${plan.status})`)
      }

      // 2. 统计已完成课次
      const templateIds = plansData.map(p => p.template_id)
      const { data: completedSessions, count } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .in('template_id', templateIds)
        .eq('completed', true)

      console.log(`\n✅ 总打卡次数：${count} 次`)
    }
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testProgressLogic()
