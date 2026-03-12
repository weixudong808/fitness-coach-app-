// 数据库备份脚本
// 执行数据库改造前，先备份重要数据

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ 错误：未找到 SUPABASE_SERVICE_ROLE_KEY')
  console.error('请在 .env.local 中配置 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function backupDatabase() {
  console.log('🔄 开始备份数据库...\n')

  const backup = {
    timestamp: new Date().toISOString(),
    tables: {}
  }

  try {
    // 备份 members 表
    console.log('📦 备份 members 表...')
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')

    if (membersError) throw membersError
    backup.tables.members = members
    console.log(`✅ members: ${members?.length || 0} 条记录\n`)

    // 备份 training_templates 表
    console.log('📦 备份 training_templates 表...')
    const { data: templates, error: templatesError } = await supabase
      .from('training_templates')
      .select('*')

    if (templatesError) throw templatesError
    backup.tables.training_templates = templates
    console.log(`✅ training_templates: ${templates?.length || 0} 条记录\n`)

    // 备份 training_sessions 表
    console.log('📦 备份 training_sessions 表...')
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')

    if (sessionsError) throw sessionsError
    backup.tables.training_sessions = sessions
    console.log(`✅ training_sessions: ${sessions?.length || 0} 条记录\n`)

    // 备份 session_exercises 表
    console.log('📦 备份 session_exercises 表...')
    const { data: exercises, error: exercisesError } = await supabase
      .from('session_exercises')
      .select('*')

    if (exercisesError) throw exercisesError
    backup.tables.session_exercises = exercises
    console.log(`✅ session_exercises: ${exercises?.length || 0} 条记录\n`)

    // 备份 member_plans 表
    console.log('📦 备份 member_plans 表...')
    const { data: plans, error: plansError } = await supabase
      .from('member_plans')
      .select('*')

    if (plansError) throw plansError
    backup.tables.member_plans = plans
    console.log(`✅ member_plans: ${plans?.length || 0} 条记录\n`)

    // 备份 achievement_definitions 表
    console.log('📦 备份 achievement_definitions 表...')
    const { data: definitions, error: definitionsError } = await supabase
      .from('achievement_definitions')
      .select('*')

    if (definitionsError) throw definitionsError
    backup.tables.achievement_definitions = definitions
    console.log(`✅ achievement_definitions: ${definitions?.length || 0} 条记录\n`)

    // 备份 member_achievements 表
    console.log('📦 备份 member_achievements 表...')
    const { data: achievements, error: achievementsError } = await supabase
      .from('member_achievements')
      .select('*')

    if (achievementsError) throw achievementsError
    backup.tables.member_achievements = achievements
    console.log(`✅ member_achievements: ${achievements?.length || 0} 条记录\n`)

    // 保存备份文件
    const backupFileName = `database-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    fs.writeFileSync(backupFileName, JSON.stringify(backup, null, 2))

    console.log('✅ 数据库备份完成！')
    console.log(`📁 备份文件：${backupFileName}`)
    console.log('\n📊 备份统计：')
    console.log(`  - members: ${backup.tables.members?.length || 0} 条`)
    console.log(`  - training_templates: ${backup.tables.training_templates?.length || 0} 条`)
    console.log(`  - training_sessions: ${backup.tables.training_sessions?.length || 0} 条`)
    console.log(`  - session_exercises: ${backup.tables.session_exercises?.length || 0} 条`)
    console.log(`  - member_plans: ${backup.tables.member_plans?.length || 0} 条`)
    console.log(`  - achievement_definitions: ${backup.tables.achievement_definitions?.length || 0} 条`)
    console.log(`  - member_achievements: ${backup.tables.member_achievements?.length || 0} 条`)
    console.log('\n⚠️  请妥善保管备份文件！')

  } catch (error) {
    console.error('❌ 备份失败：', error)
    process.exit(1)
  }
}

backupDatabase()
