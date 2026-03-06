import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMemberPlans() {
  console.log('🔍 检查张三的训练计划...\n')

  const zhangSanId = '2f5278bf-022e-4138-bfc9-6b07af825d31'

  // 1. 查询所有 member_plans
  const { data: plans } = await supabase
    .from('member_plans')
    .select('id, template_id, status, start_date, created_at')
    .eq('member_id', zhangSanId)
    .order('created_at', { ascending: false })

  console.log(`📋 找到 ${plans?.length || 0} 个训练计划记录\n`)

  // 2. 查询每个计划对应的模板
  for (const plan of plans || []) {
    const { data: template } = await supabase
      .from('training_templates')
      .select('name, is_template, member_id')
      .eq('id', plan.template_id)
      .single()

    console.log(`计划 ID: ${plan.id.substring(0, 8)}...`)
    console.log(`  模板名称: ${template?.name}`)
    console.log(`  is_template: ${template?.is_template}`)
    console.log(`  状态: ${plan.status}`)
    console.log(`  创建时间: ${plan.created_at}`)
    console.log('')
  }

  // 3. 查询所有专属模板（is_template=false）
  const { data: exclusiveTemplates } = await supabase
    .from('training_templates')
    .select('id, name, member_id')
    .eq('is_template', false)
    .eq('member_id', zhangSanId)

  console.log(`\n📝 张三的专属模板（is_template=false）: ${exclusiveTemplates?.length || 0} 个\n`)

  for (const template of exclusiveTemplates || []) {
    // 检查是否有对应的 member_plans
    const { data: planExists } = await supabase
      .from('member_plans')
      .select('id')
      .eq('template_id', template.id)
      .single()

    console.log(`模板: ${template.name}`)
    console.log(`  有 member_plans 关联: ${planExists ? '✅ 是' : '❌ 否'}`)
    console.log('')
  }
}

checkMemberPlans()
