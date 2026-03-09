require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ppjwkqtbgdpeamzbhwta.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteLatest75() {
  try {
    console.log('🗑️  开始删除最新的75条测试记录...\n')

    // 1. 查询张三的所有已完成课次
    const { data: plans } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', '2f5278bf-022e-4138-bfc9-6b07af825d31')

    const templateIds = plans?.map(p => p.template_id) || []
    console.log('训练计划数量:', templateIds.length)

    // 2. 查询最新的75条记录
    const { data: sessions, error: queryError } = await supabase
      .from('training_sessions')
      .select('id, session_number, created_at')
      .in('template_id', templateIds)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(75)

    if (queryError) {
      console.error('❌ 查询失败:', queryError.message)
      return
    }

    console.log('找到', sessions?.length || 0, '条记录\n')

    if (!sessions || sessions.length === 0) {
      console.log('没有找到需要删除的记录')
      return
    }

    // 3. 删除这些记录
    const ids = sessions.map(s => s.id)
    const { error: deleteError } = await supabase
      .from('training_sessions')
      .delete()
      .in('id', ids)

    if (deleteError) {
      console.error('❌ 删除失败:', deleteError.message)
    } else {
      console.log('✅ 成功删除', sessions.length, '条记录\n')
    }

    // 4. 验证剩余数量
    const { count } = await supabase
      .from('training_sessions')
      .select('id', { count: 'exact', head: true })
      .in('template_id', templateIds)
      .eq('completed', true)

    console.log('📊 剩余课次数量:', count)

  } catch (error) {
    console.error('❌ 错误:', error.message)
  }
}

deleteLatest75()
