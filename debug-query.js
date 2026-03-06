// 调试：检查查询逻辑

console.log('=== 模拟当前查询逻辑 ===\n')

// 假设 memberPlans 有3个计划
const memberPlans = [
  { id: 'plan1', template_id: 'template-A' },
  { id: 'plan2', template_id: 'template-B' },
  { id: 'plan3', template_id: 'template-C' }
]

// 提取 template_id
const templateIds = memberPlans.map(p => p.template_id)
console.log('查询的 templateIds:', templateIds)
console.log('')

// 模拟数据库中的 training_sessions 表
const allSessions = [
  { id: 1, template_id: 'template-A', completed: true, completed_date: '2026-03-01' },
  { id: 2, template_id: 'template-B', completed: true, completed_date: '2026-03-03' },
  { id: 3, template_id: 'template-C', completed: true, completed_date: '2026-03-06' },
  { id: 4, template_id: 'template-C', completed: true, completed_date: '2026-03-06' },
  { id: 5, template_id: 'template-C', completed: true, completed_date: '2026-03-06' },
  { id: 6, template_id: 'template-D', completed: true, completed_date: '2026-03-06' }, // 不属于张三
]

// 模拟查询：.in('template_id', templateIds).eq('completed', true)
const completedSessions = allSessions.filter(s => 
  templateIds.includes(s.template_id) && s.completed === true
)

console.log('查询结果 completedSessions:')
completedSessions.forEach(s => {
  console.log(`  - Session ${s.id}: template=${s.template_id}, date=${s.completed_date}`)
})
console.log('')
console.log(`总共查询到 ${completedSessions.length} 条记录`)
console.log('')

// 按日期统计
const dateCount = {}
completedSessions.forEach(s => {
  const date = s.completed_date
  dateCount[date] = (dateCount[date] || 0) + 1
})

console.log('按日期统计:')
Object.keys(dateCount).sort().forEach(date => {
  console.log(`  ${date}: ${dateCount[date]} 次`)
})
