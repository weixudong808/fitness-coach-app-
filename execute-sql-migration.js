// 执行数据库改造SQL脚本
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ 错误：未找到 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQLFile() {
  console.log('🔄 开始执行数据库改造...\n')

  try {
    // 读取SQL文件
    const sqlContent = fs.readFileSync('数据库改造-统一架构.sql', 'utf-8')

    console.log('📄 SQL文件已读取')
    console.log('⚠️  注意：Supabase客户端不支持直接执行多条SQL语句')
    console.log('📝 需要手动执行SQL脚本\n')

    console.log('请按以下步骤操作：')
    console.log('1. 打开 Supabase Dashboard: https://supabase.com/dashboard')
    console.log('2. 选择项目: ppjwkqtbgdpeamzbhwta')
    console.log('3. 进入 SQL Editor')
    console.log('4. 新建查询')
    console.log('5. 复制粘贴 数据库改造-统一架构.sql 文件的内容')
    console.log('6. 点击 Run 执行')
    console.log('\n执行完成后，运行 node verify-database-migration.js 验证结果')

  } catch (error) {
    console.error('❌ 错误：', error)
    process.exit(1)
  }
}

executeSQLFile()
