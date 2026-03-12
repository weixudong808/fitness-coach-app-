-- 修复 members 表的 age 字段
-- 将 age 字段改为可选（允许为 NULL）

ALTER TABLE members ALTER COLUMN age DROP NOT NULL;

-- 如果 age 字段不存在，则添加（可选）
ALTER TABLE members ADD COLUMN IF NOT EXISTS age INTEGER;

COMMENT ON COLUMN members.age IS '年龄（可选字段）';
