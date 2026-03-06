import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = 'https://ppjwkqtbgdpeamzbhwta.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwandrcXRiZ2RwZWFtemJod3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MjAsImV4cCI6MjA4NzkzMDQyMH0.sFSKruski3Ot-Hn_Qs-Aq-Aq0Aq0Aq0Aq0Aq0Aq0Aq0'
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

// 创建匿名客户端用于验证（模拟前端查询）
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

// 解析会员信息（支持手机号后4位）
function parseMemberInfo(memberText) {
  // 格式1: "张三 (1234)" - 带手机号后4位
  const withPhoneMatch = memberText.match(/^(.+?)\s*\((\d{4})\)$/)
  if (withPhoneMatch) {
    return {
      name: withPhoneMatch[1].trim(),
      phoneLast4: withPhoneMatch[2]
    }
  }

  // 格式2: "张三" - 只有姓名
  return {
    name: memberText.trim(),
    phoneLast4: null
  }
}

// 查询会员
async function findMemberByName(memberInfo) {
  const { name, phoneLast4 } = memberInfo

  // 查询所有同名会员
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .eq('name', name)

  if (error) {
    throw new Error(`查询会员失败: ${error.message}`)
  }

  if (!members || members.length === 0) {
    return null
  }

  // 如果只有一个会员，直接返回
  if (members.length === 1) {
    return members[0]
  }

  // 如果有多个会员
  if (phoneLast4) {
    // 通过手机号后4位匹配
    const matched = members.filter(m => m.phone && m.phone.endsWith(phoneLast4))
    if (matched.length === 1) {
      return matched[0]
    }
    if (matched.length === 0) {
      throw new Error(`找不到手机号后4位为 ${phoneLast4} 的会员"${name}"`)
    }
    // 如果还是有多个匹配，返回第一个（极小概率）
    return matched[0]
  } else {
    // 没有提供手机号后4位，报错并提示
    console.error(`\n❌ 找到 ${members.length} 个会员名为"${name}"：`)
    members.forEach((m, i) => {
      const maskedPhone = m.phone ? m.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '无手机号'
      const last4 = m.phone ? m.phone.slice(-4) : '????'
      console.error(`   ${i + 1}. ${m.name} - ${maskedPhone} (后4位: ${last4})`)
    })
    console.error('')
    console.error('💡 请在文档中指定手机号后4位，例如：')
    console.error(`   **会员：** ${name} (${members[0].phone ? members[0].phone.slice(-4) : '1234'})`)
    console.error('')
    throw new Error('会员重名，请指定手机号后4位')
  }
}

// 查询或创建日常训练模板
async function findOrCreateDailyTemplate(member) {
  const templateName = `${member.name}-日常训练记录`

  // 先查询
  const { data: templates } = await supabase
    .from('training_templates')
    .select('*')
    .eq('name', templateName)
    .eq('is_template', false)
    .eq('member_id', member.id)

  if (templates && templates.length > 0) {
    return templates[0]
  }

  // 如果不存在，创建
  console.log(`   📝 创建训练模板: ${templateName}`)
  const { data: newTemplate, error } = await supabase
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

  if (error) {
    throw new Error(`创建模板失败: ${error.message}`)
  }

  // 创建 member_plans 关联记录
  console.log(`   📝 创建训练计划关联...`)
  const { error: planError } = await supabase
    .from('member_plans')
    .insert({
      member_id: member.id,
      template_id: newTemplate.id,
      coach_id: coachId,  // 使用配置的教练ID
      start_date: new Date().toISOString().split('T')[0],
      status: 'active'
    })

  if (planError) {
    throw new Error(`创建训练计划关联失败: ${planError.message}`)
  }

  return newTemplate
}

// 获取下一个课次编号
async function getNextSessionNumber(templateId) {
  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('session_number')
    .eq('template_id', templateId)
    .order('session_number', { ascending: false })
    .limit(1)

  return sessions && sessions.length > 0
    ? sessions[0].session_number + 1
    : 1
}

// 创建课次
async function createSession(sessionData) {
  const { data, error } = await supabase
    .from('training_sessions')
    .insert(sessionData)
    .select()
    .single()

  if (error) {
    throw new Error(`创建课次失败: ${error.message}`)
  }

  return data
}

// 批量插入动作
async function insertExercises(sessionId, exercises) {
  const exercisesData = exercises.map(ex => ({
    session_id: sessionId,
    exercise_name: ex.exercise_name,
    weight: ex.weight,
    reps_standard: ex.reps_standard,
    sets: ex.sets,
    coach_comment: ex.coach_comment || '',
    order_index: ex.order_index
  }))

  const { error } = await supabase
    .from('session_exercises')
    .insert(exercisesData)

  if (error) {
    throw new Error(`插入动作失败: ${error.message}`)
  }
}

// 解析训练记录文档
function parseTrainingRecord(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  const record = {
    memberName: '',
    trainingPart: '',
    trainingDate: '',
    exercises: []
  }

  // 解析元数据
  for (const line of lines) {
    if (line.includes('**会员：**')) {
      record.memberName = line.split('**会员：**')[1].trim()
    } else if (line.includes('**训练部位：**')) {
      record.trainingPart = line.split('**训练部位：**')[1].trim()
    } else if (line.includes('**训练日期：**')) {
      record.trainingDate = line.split('**训练日期：**')[1].trim()
    }
  }

  // 解析训练动作表格
  let inTable = false
  for (const line of lines) {
    if (line.includes('| 序号 | 动作名称')) {
      inTable = true
      continue
    }
    if (inTable && line.startsWith('|') && !line.includes('---')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p)
      if (parts.length >= 5 && parts[0] !== '序号') {
        record.exercises.push({
          order_index: parseInt(parts[0]),
          exercise_name: parts[1],
          weight: parts[2],
          reps_standard: parts[3],
          sets: parseInt(parts[4]),
          coach_comment: parts[5] || ''
        })
      }
    }
    if (inTable && line.includes('---') && !line.includes('|')) {
      break
    }
  }

  return record
}

// 导入训练记录
async function importTrainingRecord(filePath) {
  console.log(`\n📄 正在导入: ${path.basename(filePath)}`)

  try {
    // 1. 解析文档
    const record = parseTrainingRecord(filePath)
    console.log(`   会员: ${record.memberName}`)
    console.log(`   训练日期: ${record.trainingDate}`)
    console.log(`   动作数量: ${record.exercises.length}`)

    if (!record.memberName) {
      throw new Error('文档中缺少会员姓名')
    }

    if (record.exercises.length === 0) {
      throw new Error('文档中没有训练动作')
    }

    // 2. 查询会员
    console.log(`   🔍 查询会员...`)
    const memberInfo = parseMemberInfo(record.memberName)
    const member = await findMemberByName(memberInfo)

    if (!member) {
      throw new Error(`找不到会员"${record.memberName}"`)
    }

    console.log(`   ✅ 找到会员: ${member.name} (${member.phone || '无手机号'})`)

    // 3. 查询或创建模板
    console.log(`   🔍 查询训练模板...`)
    const template = await findOrCreateDailyTemplate(member)
    console.log(`   ✅ 训练模板: ${template.name}`)

    // 4. 确定课次编号
    const sessionNumber = await getNextSessionNumber(template.id)
    console.log(`   📝 课次编号: 第${sessionNumber}次课`)

    // 5. 创建课次
    console.log(`   💾 创建课次...`)
    const session = await createSession({
      template_id: template.id,
      session_number: sessionNumber,
      core_focus: '日常训练',
      training_part: record.trainingPart || '',
      completed: false,
      completed_date: null
    })
    console.log(`   ✅ 课次创建成功`)

    // 6. 插入动作
    console.log(`   💾 插入动作数据...`)
    await insertExercises(session.id, record.exercises)
    console.log(`   ✅ 已插入 ${record.exercises.length} 个动作`)

    // 7. 验证数据可见性（模拟前端查询）
    console.log(`   🔍 验证数据可见性...`)
    const { data: verifyPlans, error: verifyError } = await supabaseAnon
      .from('member_plans')
      .select(`
        *,
        training_templates (*)
      `)
      .eq('member_id', member.id)
      .eq('template_id', template.id)

    if (verifyError) {
      console.error(`   ⚠️  验证查询失败: ${verifyError.message}`)
    } else if (!verifyPlans || verifyPlans.length === 0) {
      console.error(`   ⚠️  警告：前端无法查询到导入的数据！`)
      console.error(`   这可能是 RLS 策略或 coach_id 配置问题`)
      console.error(`   请检查 .env.local 中的 COACH_ID 是否正确`)
    } else {
      console.log(`   ✅ 前端可以正常查询到数据`)
    }

    // 8. 更新文档状态
    const updatedContent = fs.readFileSync(filePath, 'utf-8')
      .replace('**状态：** 待导入', '**状态：** 已导入')
    fs.writeFileSync(filePath, updatedContent)
    console.log(`   ✅ 文档已标记为"已导入"`)

    console.log(`\n✅ 导入成功！`)
    console.log(`   会员: ${member.name}`)
    console.log(`   模板: ${template.name}`)
    console.log(`   课次: 第${sessionNumber}次课`)
    console.log(`   动作: ${record.exercises.length}个`)
    console.log(`   教练ID: ${coachId}`)
    console.log(`   状态: 待训练 (completed=false)`)

  } catch (error) {
    console.error(`\n❌ 导入失败: ${error.message}`)
    throw error
  }
}

// 主函数
async function main() {
  console.log('📂 扫描训练记录目录...\n')

  const recordsDir = path.join(process.cwd(), '..', '训练记录')

  if (!fs.existsSync(recordsDir)) {
    console.error(`❌ 训练记录目录不存在: ${recordsDir}`)
    process.exit(1)
  }

  const files = fs.readdirSync(recordsDir)
  const pendingFiles = []

  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = path.join(recordsDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')

      if (content.includes('**状态：** 待导入')) {
        pendingFiles.push(filePath)
      }
    }
  }

  if (pendingFiles.length === 0) {
    console.log('✅ 没有待导入的训练记录')
    return
  }

  console.log(`找到 ${pendingFiles.length} 个待导入的记录：`)
  pendingFiles.forEach((file, i) => {
    console.log(`${i + 1}. ${path.basename(file)}`)
  })

  // 逐个导入
  let successCount = 0
  let failCount = 0

  for (const filePath of pendingFiles) {
    try {
      await importTrainingRecord(filePath)
      successCount++
    } catch (error) {
      failCount++
      console.error(`跳过该文件，继续处理下一个...\n`)
    }
  }

  // 显示总结
  console.log('\n' + '='.repeat(50))
  console.log('📊 导入总结')
  console.log('='.repeat(50))
  console.log(`✅ 成功: ${successCount} 个`)
  console.log(`❌ 失败: ${failCount} 个`)
  console.log(`📝 总计: ${pendingFiles.length} 个`)
  console.log('='.repeat(50))
}

main()
