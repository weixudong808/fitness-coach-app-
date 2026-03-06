import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 检查 Service Role Key 是否配置
if (!supabaseServiceKey) {
  console.error('❌ 缺少 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 使用 Service Role Key 创建客户端（绕过 RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixMemberPlans() {
  console.log('🔧 修复训练计划关联...\n')

  try {
    // 1. 查询所有专属模板（is_template=false）
    const { data: templates, error: templatesError } = await supabase
      .from('training_templates')
      .select('*')
      .eq('is_template', false)

    if (templatesError) throw templatesError

    if (!templates || templates.length === 0) {
      console.log('✅ 没有需要修复的模板')
      return
    }

    console.log(`找到 ${templates.length} 个专属模板\n`)

    // 2. 为每个模板检查并创建 member_plans 记录
    for (const template of templates) {
      console.log(`📋 处理模板: ${template.name}`)

      // 检查是否已有 member_plans 记录
      const { data: existingPlan } = await supabase
        .from('member_plans')
        .select('*')
        .eq('template_id', template.id)
        .eq('member_id', template.member_id)
        .single()

      if (existingPlan) {
        console.log(`   ⏭️  已存在训练计划关联，跳过\n`)
        continue
      }

      // 创建 member_plans 记录
      const { error: planError } = await supabase
        .from('member_plans')
        .insert({
          member_id: template.member_id,
          template_id: template.id,
          coach_id: template.coach_id,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active'
        })

      if (planError) {
        console.error(`   ❌ 创建失败: ${planError.message}\n`)
        continue
      }

      console.log(`   ✅ 已创建训练计划关联\n`)
    }

    console.log('🎉 修复完成！')

  } catch (error) {
    console.error('\n❌ 修复失败:', error.message)
    process.exit(1)
  }
}

fixMemberPlans()
