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

async function createTestData() {
  // 1. 创建会员
  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({ name: '张三', phone: '13800138000' })
    .select()
    .single()

  if (memberError) {
    console.log(JSON.stringify({ error: '创建会员失败: ' + memberError.message }))
    return
  }

  console.log('✅ 会员创建成功:', member)

  // 2. 创建训练模板
  const { data: template, error: templateError } = await supabase
    .from('training_templates')
    .insert({
      name: '增肌训练计划',
      description: '适合初学者的增肌计划'
    })
    .select()
    .single()

  if (templateError) {
    console.log(JSON.stringify({ error: '创建模板失败: ' + templateError.message }))
    return
  }

  console.log('✅ 训练模板创建成功:', template)

  // 3. 分配训练计划给会员
  const { data: memberPlan, error: planError } = await supabase
    .from('member_plans')
    .insert({
      member_id: member.id,
      template_id: template.id,
      status: 'active'
    })
    .select()
    .single()

  if (planError) {
    console.log(JSON.stringify({ error: '分配计划失败: ' + planError.message }))
    return
  }

  console.log('✅ 训练计划分配成功:', memberPlan)

  // 4. 创建训练课次
  const sessions = [
    { session_number: 1, core_focus: '胸部', training_part: '胸' },
    { session_number: 2, core_focus: '背部', training_part: '背' },
    { session_number: 3, core_focus: '腿部', training_part: '腿' }
  ]

  for (const session of sessions) {
    const { data, error } = await supabase
      .from('training_sessions')
      .insert({
        template_id: template.id,
        ...session,
        completed: false
      })
      .select()
      .single()

    if (error) {
      console.log(JSON.stringify({ error: '创建课次失败: ' + error.message }))
      return
    }

    console.log(`✅ 课次${session.session_number}创建成功:`, data)
  }

  console.log('\n🎉 测试数据创建完成！')
  console.log(JSON.stringify({
    member,
    template,
    memberPlan
  }))
}

createTestData()
