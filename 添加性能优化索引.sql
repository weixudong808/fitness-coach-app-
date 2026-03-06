-- 为训练计划深度复制功能添加性能优化索引

-- 为 training_templates 添加索引
CREATE INDEX IF NOT EXISTS idx_training_templates_coach_id
ON training_templates(coach_id);

CREATE INDEX IF NOT EXISTS idx_training_templates_member_id
ON training_templates(member_id);

CREATE INDEX IF NOT EXISTS idx_training_templates_is_template
ON training_templates(is_template);

-- 为 training_sessions 添加索引
CREATE INDEX IF NOT EXISTS idx_training_sessions_template_id
ON training_sessions(template_id);

-- 为 session_exercises 添加索引
CREATE INDEX IF NOT EXISTS idx_session_exercises_session_id
ON session_exercises(session_id);

-- 为 member_plans 添加索引
CREATE INDEX IF NOT EXISTS idx_member_plans_member_id
ON member_plans(member_id);

CREATE INDEX IF NOT EXISTS idx_member_plans_template_id
ON member_plans(template_id);

-- 验证索引创建
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('training_templates', 'training_sessions', 'session_exercises', 'member_plans')
ORDER BY tablename, indexname;
