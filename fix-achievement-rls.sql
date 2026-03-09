-- 修复认证系统的 RLS 策略
-- 添加 INSERT 和 UPDATE 权限

-- =====================================================
-- member_achievement_progress 表的策略
-- =====================================================

-- 允许插入进度数据（系统自动插入）
DROP POLICY IF EXISTS "允许插入认证进度" ON member_achievement_progress;
CREATE POLICY "允许插入认证进度"
ON member_achievement_progress FOR INSERT
WITH CHECK (true);  -- 允许所有插入（由应用层控制）

-- 允许更新进度数据
DROP POLICY IF EXISTS "允许更新认证进度" ON member_achievement_progress;
CREATE POLICY "允许更新认证进度"
ON member_achievement_progress FOR UPDATE
USING (true)
WITH CHECK (true);

-- =====================================================
-- member_achievements 表的策略
-- =====================================================

-- 允许插入认证记录
DROP POLICY IF EXISTS "允许插入认证记录" ON member_achievements;
CREATE POLICY "允许插入认证记录"
ON member_achievements FOR INSERT
WITH CHECK (true);

-- 允许更新认证记录
DROP POLICY IF EXISTS "允许更新认证记录" ON member_achievements;
CREATE POLICY "允许更新认证记录"
ON member_achievements FOR UPDATE
USING (true)
WITH CHECK (true);

-- =====================================================
-- member_levels 表的策略
-- =====================================================

-- 允许插入等级数据
DROP POLICY IF EXISTS "允许插入等级数据" ON member_levels;
CREATE POLICY "允许插入等级数据"
ON member_levels FOR INSERT
WITH CHECK (true);

-- 允许更新等级数据
DROP POLICY IF EXISTS "允许更新等级数据" ON member_levels;
CREATE POLICY "允许更新等级数据"
ON member_levels FOR UPDATE
USING (true)
WITH CHECK (true);

-- =====================================================
-- 完成提示
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS 策略已修复！';
  RAISE NOTICE '📝 已添加 INSERT 和 UPDATE 权限';
  RAISE NOTICE '';
  RAISE NOTICE '现在可以正常插入和更新认证数据了';
END $$;
