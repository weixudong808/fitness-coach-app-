-- 修复 notifications 表的 title 字段
-- 将 title 字段改为可选（允许为 NULL）

ALTER TABLE notifications ALTER COLUMN title DROP NOT NULL;

COMMENT ON COLUMN notifications.title IS '通知标题（可选字段）';
