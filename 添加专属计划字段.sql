-- 添加字段区分模板和专属计划
ALTER TABLE training_templates
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT true;

-- 添加会员关联字段（仅用于专属计划）
ALTER TABLE training_templates
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE CASCADE;

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_training_templates_is_template
ON training_templates(is_template);

CREATE INDEX IF NOT EXISTS idx_training_templates_member_id
ON training_templates(member_id);

-- 添加约束：专属计划必须关联会员
ALTER TABLE training_templates
ADD CONSTRAINT check_member_id_for_exclusive_plan
CHECK (is_template = true OR (is_template = false AND member_id IS NOT NULL));

-- 更新现有数据（将所有现有模板标记为 is_template = true）
UPDATE training_templates SET is_template = true WHERE is_template IS NULL;
