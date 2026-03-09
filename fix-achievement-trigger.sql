-- 修复 member_achievement_progress 表的触发器
-- 问题：触发器尝试更新 updated_at 字段，但表中只有 last_updated 字段
-- 解决：创建新的触发器函数，更新 last_updated 字段

-- 创建新的触发器函数（更新 last_updated 字段）
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧的触发器
DROP TRIGGER IF EXISTS update_member_achievement_progress_updated_at ON member_achievement_progress;

-- 创建新的触发器（使用新函数）
CREATE TRIGGER update_member_achievement_progress_last_updated
BEFORE UPDATE ON member_achievement_progress
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();

-- 验证
DO $$
BEGIN
  RAISE NOTICE '✅ 触发器修复完成！';
  RAISE NOTICE '   - 删除了旧触发器：update_member_achievement_progress_updated_at';
  RAISE NOTICE '   - 创建了新触发器：update_member_achievement_progress_last_updated';
  RAISE NOTICE '   - 新触发器会自动更新 last_updated 字段';
END $$;
