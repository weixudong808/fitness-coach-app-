import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  'https://ppjwkqtbgdpeamzbhwta.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeCoachIds() {
  console.log('=== 分析 coach_id 问题 ===\n')

  const zhangSanId = '2f5278bf-022e-4138-bfc9-6b07af825d31'

  // 1. 查询张三的所有训练计划
  const { data: plans } = await supabase
    .from('member_plans')
    .select('id, template_id, coach_id, created_at')
    .eq('member_id', zhangSanId)
    .order('created_at', { ascending: false })

  console.log(`找到 ${plans?.length} 个训练计划\n`)

  // 2. 统计不同的 coach_id
  const coachIds = new Set()
  for (const plan of plans || []) {
    coachIds.add(plan.coach_id)

    const { data: template } = await supabase
      .from('training_templates')
      .select('name')
      .eq('id', plan.template_id)
      .single()

    console.log(`计划: ${template?.name}`)
    console.log(`  coach_id: ${plan.coach_id}`)
    console.log(`  是否等于张三ID: ${plan.coach_id === zhangSanId ? '是' : '否'}`)
    console.log('')
  }

  console.log(`\n共有 ${coachIds.size} 个不同的 coach_id:\n`)
  for (const id of coachIds) {
    console.log(`- ${id}`)
    if (id === zhangSanId) {
      console.log('  ⚠️ 这是张三的会员ID，不是教练ID！')
    }
  }

  console.log('\n=== 建议 ===')
  console.log('需要将"张三-日常训练记录"的 coach_id 改为真正的教练ID')
  console.log('请告诉我：前端登录的教练用户ID是什么？')
}

analyzeCoachIds()
