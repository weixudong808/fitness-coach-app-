import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  'https://ppjwkqtbgdpeamzbhwta.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function simulateFrontendQuery() {
  console.log('=== 模拟前端查询逻辑 ===\n')

  const zhangSanId = '2f5278bf-022e-4138-bfc9-6b07af825d31'

  // 1. 查询 member_plans（前端的第一步）
  const { data: plansData, error: plansError } = await supabase
    .from('member_plans')
    .select('*')
    .eq('member_id', zhangSanId)
    .order('created_at', { ascending: false })

  if (plansError) {
    console.error('查询 member_plans 失败:', plansError)
    return
  }

  console.log('✅ 查询到的 member_plans 数量:', plansData?.length)
  console.log('')

  if (!plansData || plansData.length === 0) {
    console.log('❌ 没有找到任何训练计划！')
    return
  }

  // 2. 获取所有相关的模板信息（前端的第二步）
  const templateIds = [...new Set(plansData.map(plan => plan.template_id))]
  console.log('需要查询的模板 ID 数量:', templateIds.length)

  const { data: templatesData, error: templatesError } = await supabase
    .from('training_templates')
    .select('id, name, target_goal, difficulty_level')
    .in('id', templateIds)

  if (templatesError) {
    console.error('查询模板失败:', templatesError)
    return
  }

  console.log('✅ 查询到的模板数量:', templatesData?.length)
  console.log('')

  // 3. 创建模板映射（前端的第三步）
  const templateMap = {}
  templatesData?.forEach(template => {
    templateMap[template.id] = template
  })

  // 4. 合并数据（前端的第四步）
  const formattedData = plansData.map(plan => {
    const template = templateMap[plan.template_id] || {}
    return {
      id: plan.id,
      template_id: plan.template_id,
      template_name: template.name || '未知模板',
      target_goal: template.target_goal || '-',
      difficulty_level: template.difficulty_level || '-',
      status: plan.status,
      start_date: plan.start_date,
      created_at: plan.created_at
    }
  })

  console.log('=== 前端应该显示的训练计划 ===\n')
  formattedData.forEach((plan, i) => {
    console.log(`${i + 1}. ${plan.template_name}`)
    console.log(`   状态: ${plan.status}`)
    console.log(`   目标: ${plan.target_goal}`)
    console.log(`   难度: ${plan.difficulty_level}`)
    console.log(`   创建时间: ${plan.created_at}`)
    console.log('')
  })

  // 5. 检查"张三-日常训练记录"是否在列表中
  const dailyRecord = formattedData.find(p => p.template_name === '张三-日常训练记录')

  if (dailyRecord) {
    console.log('✅ "张三-日常训练记录"在列表中！')
    console.log('   位置:', formattedData.indexOf(dailyRecord) + 1)
  } else {
    console.log('❌ "张三-日常训练记录"不在列表中！')
    console.log('\n开始排查原因...\n')

    // 排查：检查是否有对应的 member_plans
    const { data: dailyPlan } = await supabase
      .from('member_plans')
      .select('*')
      .eq('member_id', zhangSanId)
      .eq('template_id', (await supabase
        .from('training_templates')
        .select('id')
        .eq('name', '张三-日常训练记录')
        .single()).data?.id)

    console.log('member_plans 中是否有记录:', dailyPlan ? '有' : '无')
  }
}

simulateFrontendQuery()
