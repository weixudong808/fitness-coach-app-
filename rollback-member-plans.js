import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function rollbackMemberPlans() {
  console.log('🔄 回滚错误的训练计划关联...\n')

  try {
    const zhangSanId = '2f5278bf-022e-4138-bfc9-6b07af825d31'

    // 1. 查询今天10:57创建的 member_plans（错误的记录）
    const { data: wrongPlans, error: queryError } = await supabase
      .from('member_plans')
      .select('id, template_id, created_at')
      .eq('member_id', zhangSanId)
      .gte('created_at', '2026-03-05T10:57:00')
      .lte('created_at', '2026-03-05T10:58:00')

    if (queryError) throw queryError

    if (!wrongPlans || wrongPlans.length === 0) {
      console.log('✅ 没有需要回滚的记录')
      return
    }

    console.log(`找到 ${wrongPlans.length} 条错误记录\n`)

    // 2. 查询每条记录对应的模板名称
    for (const plan of wrongPlans) {
      const { data: template } = await supabase
        .from('training_templates')
        .select('name')
        .eq('id', plan.template_id)
        .single()

      console.log(`准备删除: ${template?.name}`)
      console.log(`  计划 ID: ${plan.id}`)
      console.log(`  创建时间: ${plan.created_at}`)
    }

    console.log('\n⚠️  即将删除以上记录，按 Ctrl+C 取消...')

    // 等待3秒
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 3. 删除这些记录
    const { error: deleteError } = await supabase
      .from('member_plans')
      .delete()
      .in('id', wrongPlans.map(p => p.id))

    if (deleteError) throw deleteError

    console.log(`\n✅ 已删除 ${wrongPlans.length} 条错误记录`)
    console.log('\n💡 现在刷新浏览器页面，应该恢复正常了')

  } catch (error) {
    console.error('\n❌ 回滚失败:', error.message)
    process.exit(1)
  }
}

rollbackMemberPlans()
