import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAllMemberPlans() {
  try {
    console.log('\n📊 检查 member_plans 表的所有数据：\n')

    // 查询所有 member_plans 记录
    const { data: allPlans, count, error } = await supabase
      .from('member_plans')
      .select('*', { count: 'exact' })

    if (error) {
      console.error('查询失败:', error)
      return
    }

    console.log(`总记录数：${count}`)

    if (allPlans && allPlans.length > 0) {
      console.log('\n所有记录：')
      for (const plan of allPlans) {
        // 获取会员名称
        const { data: member } = await supabase
          .from('members')
          .select('name')
          .eq('id', plan.member_id)
          .single()

        // 获取模板名称
        const { data: template } = await supabase
          .from('training_templates')
          .select('name')
          .eq('id', plan.template_id)
          .single()

        console.log(`\n  会员：${member?.name}`)
        console.log(`  模板：${template?.name}`)
        console.log(`  状态：${plan.status}`)
        console.log(`  开始日期：${plan.start_date}`)
      }
    } else {
      console.log('\n⚠️  member_plans 表是空的！')
    }
  } catch (error) {
    console.error('查询失败:', error)
  }
}

checkAllMemberPlans()
