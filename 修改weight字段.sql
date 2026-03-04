-- 修改 template_exercises 表的 weight 字段类型
-- 从 DECIMAL 改为 TEXT，以支持输入文字（如"自重"）

ALTER TABLE template_exercises
ALTER COLUMN weight TYPE TEXT;
