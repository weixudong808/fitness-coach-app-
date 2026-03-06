import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const coachId = process.env.COACH_ID

// 检查必需的配置
if (!supabaseServiceKey) {
  console.error('❌ 缺少 SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('请按照以下步骤配置：')
  console.error('1. 复制 .env.local.example 为 .env.local')
  console.error('2. 从 Supabase Dashboard 获取 service_role key')
  console.error('3. 将密钥填入 .env.local 文件')
  console.error('')
  process.exit(1)
}

if (!coachId) {
  console.error('❌ 缺少 COACH_ID')
  console.error('')
  console.error('请按照以下步骤配置：')
  console.error('1. 打开 .env.local 文件')
  console.error('2. 添加你的教练ID：COACH_ID=your_coach_id_here')
  console.error('')
  console.error('如何获取教练ID：')
  console.error('- 方法1：登录前端，在控制台查看 localStorage')
  console.error('- 方法2：在 Supabase Dashboard 的 auth.users 表中查找')
  console.error('')
  console.error('详细说明请查看：.env.local.example')
  console.error('')
  process.exit(1)
}

// 使用 Service Role Key 创建客户端（绕过 RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function initTestData() {
  console.log('🚀 开始初始化测试数据...\n')

  try {
    // 1. 检查数据库连接
    console.log('📡 检查数据库连接...')
    const { data: testData, error: testError } = await supabase
      .from('members')
      .select('count')
      .limit(1)

    if (testError) {
      throw new Error(`数据库连接失败: ${testError.message}`)
    }
    console.log('✅ 数据库连接正常\n')

    // 2. 创建测试会员
    const testMembers = [
      { name: '张三', phone: '13800138000', gender: 'male', age: 25 },
      { name: '李四', phone: '13900139000', gender: 'male', age: 30 }
    ]

    console.log('👥 创建测试会员...')
    const createdMembers = []

    for (const memberData of testMembers) {
      // 检查会员是否已存在
      const { data: existing } = await supabase
        .from('members')
        .select('*')
        .eq('name', memberData.name)
        .eq('phone', memberData.phone)
        .single()

      if (existing) {
        console.log(`   ⏭️  会员"${memberData.name}"已存在，跳过`)
        createdMembers.push(existing)
        continue
      }

      // 创建新会员
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert(memberData)
        .select()
        .single()

      if (memberError) {
        console.error(`   ❌ 创建会员"${memberData.name}"失败: ${memberError.message}`)
        continue
      }

      console.log(`   ✅ 创建会员: ${member.name} (${member.phone})`)
      createdMembers.push(member)
    }

    console.log('')

    // 3. 为每个会员创建日常训练模板
    console.log('📋 创建训练模板...')

    for (const member of createdMembers) {
      const templateName = `${member.name}-日常训练记录`

      // 检查模板是否已存在
      const { data: existingTemplate } = await supabase
        .from('training_templates')
        .select('*')
        .eq('name', templateName)
        .eq('is_template', false)
        .eq('member_id', member.id)
        .single()

      if (existingTemplate) {
        console.log(`   ⏭️  模板"${templateName}"已存在，跳过`)
        continue
      }

      // 创建新模板
      const { data: template, error: templateError } = await supabase
        .from('training_templates')
        .insert({
          name: templateName,
          description: '日常训练记录',
          target_goal: '日常训练',
          difficulty_level: 'intermediate',
          training_stage: '基础期',
          is_template: false,
          member_id: member.id,
          coach_id: coachId  // 使用配置的教练ID
        })
        .select()
        .single()

      if (templateError) {
        console.error(`   ❌ 创建模板"${templateName}"失败: ${templateError.message}`)
        continue
      }

      console.log(`   ✅ 创建模板: ${template.name}`)

      // 创建 member_plans 关联记录
      const { error: planError } = await supabase
        .from('member_plans')
        .insert({
          member_id: member.id,
          template_id: template.id,
          coach_id: coachId,  // 使用配置的教练ID
          start_date: new Date().toISOString().split('T')[0],
          status: 'active'
        })

      if (planError) {
        console.error(`   ❌ 创建训练计划关联失败: ${planError.message}`)
        continue
      }

      console.log(`   ✅ 创建训练计划关联`)
    }

    console.log('')

    // 4. 显示初始化结果
    console.log('=' .repeat(50))
    console.log('🎉 初始化完成！')
    console.log('='.repeat(50))
    console.log(`✅ 会员数量: ${createdMembers.length}`)
    console.log(`✅ 教练ID: ${coachId}`)
    console.log('')
    console.log('📋 会员列表:')
    createdMembers.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.name} (${m.phone})`)
    })
    console.log('')
    console.log('💡 下一步:')
    console.log('   1. 在 Claude 对话中说"训练记录模式"')
    console.log('   2. 说"开启张三训练记录"开始记录')
    console.log('   3. 记录完成后运行 node import-training-record.js 导入')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message)
    process.exit(1)
  }
}

initTestData()
