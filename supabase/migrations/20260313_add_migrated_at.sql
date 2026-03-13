-- 添加 migrated_at 字段到 coaches 和 members 表
-- 用于记录老用户迁移到 Supabase Auth 的时间

-- 给 coaches 表添加 migrated_at 字段
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- 给 members 表添加 migrated_at 字段
ALTER TABLE members ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- 添加注释
COMMENT ON COLUMN coaches.migrated_at IS '迁移到 Supabase Auth 的时间';
COMMENT ON COLUMN members.migrated_at IS '迁移到 Supabase Auth 的时间';
