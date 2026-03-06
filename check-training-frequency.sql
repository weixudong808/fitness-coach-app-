-- 检查张三的训练频率数据

-- 1. 查看张三的所有训练计划
SELECT 
  mp.id as plan_id,
  tt.name as template_name,
  tt.is_template,
  mp.status,
  mp.created_at
FROM member_plans mp
JOIN training_templates tt ON mp.template_id = tt.id
WHERE mp.member_id = (SELECT id FROM members WHERE name = '张三')
ORDER BY mp.created_at;

-- 2. 查看这些计划下的所有已完成课次
SELECT 
  ts.id,
  ts.session_number,
  ts.completed,
  ts.completed_date,
  DATE(ts.completed_date) as date_only,
  tt.name as template_name
FROM training_sessions ts
JOIN training_templates tt ON ts.template_id = tt.id
JOIN member_plans mp ON mp.template_id = tt.id
WHERE mp.member_id = (SELECT id FROM members WHERE name = '张三')
  AND ts.completed = true
ORDER BY ts.completed_date;

-- 3. 按日期统计训练次数
SELECT 
  DATE(ts.completed_date) as training_date,
  COUNT(*) as count
FROM training_sessions ts
JOIN training_templates tt ON ts.template_id = tt.id
JOIN member_plans mp ON mp.template_id = tt.id
WHERE mp.member_id = (SELECT id FROM members WHERE name = '张三')
  AND ts.completed = true
  AND ts.completed_date IS NOT NULL
  AND DATE(ts.completed_date) <= CURRENT_DATE
GROUP BY DATE(ts.completed_date)
ORDER BY training_date;
