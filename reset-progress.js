import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetProgress() {
  try {
    // 查询张三的会员ID
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', '张三')
      .single()

    console.log(`\n🔄 重置 ${member.name} 的认证进度数据...\n`)

    // 删除旧的进度数据
    const { error: deleteError } = await supabase
      .from('member_achievement_progress')
      .delete()
      .eq('member_id', member.id)

    if (deleteError) {
      console.error('删除失败:', deleteError)
      return
    }

    console.log('✅ 已删除旧的进度数据')
    console.log('\n请刷新浏览器页面，系统会自动重新计算进度')
  } catch (error) {
    console.error('重置失败:', error)
  }
}

resetProgress()
