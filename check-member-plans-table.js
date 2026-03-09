import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMemberPlans() {
  try {
    // 查询张三的会员ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    console.log(`\n📊 检查 ${member.name} 的 member_plans 表数据：\n`)

    // 查询所有 member_plans 记录
    const { data: plans, count } = await supabase
      .from('member_plans')
      .select('*, training_templates(name)', { count: 'exact' })
      .eq('member_id', member.id)

    console.log(`member_plans 表中的记录数：${count}`)

    if (plans && plans.length > 0) {
      console.log('\n记录详情：')
      for (const plan of plans) {
        console.log(`  - 模板：${plan.training_templates?.name}`)
        console.log(`    状态：${plan.status}`)
        console.log(`    开始日期：${plan.start_date}`)
        console.log(`    结束日期：${plan.end_date || '无'}`)
        console.log('')
      }
    } else {
      console.log('\n⚠️  member_plans 表中没有该会员的记录！')
      console.log('\n这说明系统可能使用的是旧的数据结构：')
      console.log('  - 旧结构：training_templates 表直接有 member_id 字段')
      console.log('  - 新结构：通过 member_plans 表关联会员和模板')
    }

    // 检查 training_templates 表
    console.log('\n' + '='.repeat(50))
    console.log('检查 training_templates 表：')
    console.log('='.repeat(50) + '\n')

    const { data: templates, count: templateCount } = await supabase
      .from('training_templates')
      .select('id, name, member_id, is_template', { count: 'exact' })
      .eq('member_id', member.id)

    console.log(`training_templates 表中的记录数：${templateCount}`)

    if (templates && templates.length > 0) {
      console.log('\n记录详情：')
      for (const template of templates) {
        console.log(`  - ${template.name}`)
        console.log(`    is_template: ${template.is_template}`)
        console.log('')
      }
    }
  } catch (error) {
    console.error('查询失败:', error)
  }
}

checkMemberPlans()
