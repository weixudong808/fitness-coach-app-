// 通过Supabase API执行数据库改造
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ 错误：未找到 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 使用fetch直接调用Supabase的REST API执行SQL
async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`)

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      // 尝试使用pg_stat_statements
      const response2 = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: sql })
      })

      if (!response2.ok) {
        throw new Error(`HTTP ${response2.status}: ${await response2.text()}`)
      }
    }

    console.log(`✅ ${description} 完成`)
    return true
  } catch (error) {
    console.error(`❌ ${description} 失败:`, error.message)
    return false
  }
}

async function executeMigration() {
  console.log('🚀 开始数据库改造...')
  console.log('⚠️  注意：由于Supabase API限制，建议手动执行SQL脚本\n')

  console.log('=' .repeat(60))
  console.log('请按以下步骤手动执行：')
  console.log('=' .repeat(60))
  console.log('\n📋 步骤：')
  console.log('1. 打开浏览器访问: https://supabase.com/dashboard')
  console.log('2. 登录你的账号')
  console.log('3. 选择项目: ppjwkqtbgdpeamzbhwta')
  console.log('4. 点击左侧菜单 "SQL Editor"')
  console.log('5. 点击 "New query" 创建新查询')
  console.log('6. 打开文件: 数据库改造-统一架构.sql')
  console.log('7. 复制全部内容')
  console.log('8. 粘贴到SQL编辑器')
  console.log('9. 点击右下角 "Run" 按钮执行')
  console.log('10. 等待执行完成（会显示成功消息）')
  console.log('\n执行完成后，回到终端运行: node verify-database-migration.js')
  console.log('=' .repeat(60))

  console.log('\n💡 提示：')
  console.log('- SQL脚本包含了所有必要的表创建和修改')
  console.log('- 已经处理了IF NOT EXISTS，重复执行不会出错')
  console.log('- 已经配置了RLS策略和索引')
  console.log('- 执行时间约1-2分钟')

  console.log('\n📁 SQL文件位置：')
  console.log('   数据库改造-统一架构.sql')

  console.log('\n✅ 数据库已备份：')
  console.log('   database-backup-*.json')
}

executeMigration()
