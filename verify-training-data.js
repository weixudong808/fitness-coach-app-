import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 检查 Service Role Key 是否配置
if (!supabaseServiceKey) {
  console.error('❌ 缺少 SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('请按照以下步骤配置：')
  console.error('1. 复制 .env.local.example 为 .env.local')
  console.error('2. 从 Supabase Dashboard 获取 service_role key')
  console.error('3. 将密钥填入 .env.local 文件')
  console.error('')
  console.error('详细说明请查看：README-配置说明.md')
  process.exit(1)
}

// 使用 Service Role Key 创建客户端（绕过 RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyTrainingData(memberName) {
  console.log(`\n🔍 查询会员"${memberName}"的训练数据...\n`)

  try {
    // 1. 查询会员
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('name', memberName)
      .single()

    if (memberError || !member) {
      console.error(`❌ 找不到会员"${memberName}"`)
      console.log('\n💡 提示：运行 node list-members.js 查看所有会员')
      process.exit(1)
    }

    console.log('👤 会员信息:')
    console.log(`   姓名: ${member.name}`)
    console.log(`   手机: ${member.phone || '无'}`)
    console.log(`   ID: ${member.id}`)
    console.log('')

    // 2. 查询会员的训练模板
    const { data: templates } = await supabase
      .from('training_templates')
      .select('*')
      .eq('is_template', false)
      .eq('member_id', member.id)

    if (!templates || templates.length === 0) {
      console.log('⚠️  该会员还没有训练模板')
      console.log('\n💡 提示：运行 node init-test-data.js 创建模板')
      return
    }

    console.log('📋 训练模板:')
    templates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`)
    })
    console.log('')

    // 3. 查询所有课次
    let totalSessions = 0
    let totalExercises = 0

    for (const template of templates) {
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('*, session_exercises(*)')
        .eq('template_id', template.id)
        .order('session_number', { ascending: true })

      if (!sessions || sessions.length === 0) {
        console.log(`📝 模板"${template.name}"暂无课次记录`)
        console.log('')
        continue
      }

      console.log(`📝 模板"${template.name}"的课次记录:`)
      console.log('')

      sessions.forEach(session => {
        totalSessions++
        const exerciseCount = session.session_exercises?.length || 0
        totalExercises += exerciseCount
        const status = session.completed ? '✅ 已完成' : '⏳ 待训练'

        console.log(`   第${session.session_number}次课 - ${status}`)
        console.log(`   训练部位: ${session.training_part || '未指定'}`)
        console.log(`   核心重点: ${session.core_focus || '未指定'}`)
        if (session.completed_date) {
          console.log(`   完成日期: ${session.completed_date}`)
        }
        console.log(`   动作数量: ${exerciseCount}个`)

        if (session.session_exercises && session.session_exercises.length > 0) {
          console.log(`   动作列表:`)
          session.session_exercises
            .sort((a, b) => a.order_index - b.order_index)
            .forEach(ex => {
              const comment = ex.coach_comment ? ` (${ex.coach_comment})` : ''
              console.log(`      ${ex.order_index}. ${ex.exercise_name} ${ex.weight} ${ex.reps_standard} ${ex.sets}组${comment}`)
            })
        }
        console.log('')
      })
    }

    // 4. 显示统计
    console.log('='.repeat(50))
    console.log('📊 统计信息')
    console.log('='.repeat(50))
    console.log(`会员: ${member.name}`)
    console.log(`训练模板: ${templates.length}个`)
    console.log(`训练课次: ${totalSessions}次`)
    console.log(`训练动作: ${totalExercises}个`)
    console.log('='.repeat(50))

  } catch (error) {
    console.error('\n❌ 查询失败:', error.message)
    process.exit(1)
  }
}

// 主函数
const memberName = process.argv[2]

if (!memberName) {
  console.error('❌ 请指定会员姓名')
  console.error('')
  console.error('使用方法:')
  console.error('  node verify-training-data.js 张三')
  console.error('')
  console.error('💡 提示：运行 node list-members.js 查看所有会员')
  process.exit(1)
}

verifyTrainingData(memberName)
