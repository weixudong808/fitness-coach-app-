-- ============================================
-- Supabase Auth 改造 - 数据库迁移脚本
-- 日期：2026-03-13
-- 说明：添加 user_id 字段关联 auth.users，实施 RLS 策略
-- ============================================

-- 注意：此脚本必须在 Supabase SQL Editor 执行（需要管理员权限）

BEGIN;

-- ============================================
-- 第一步：添加 user_id 字段
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '第一步：添加 user_id 字段';
  RAISE NOTICE '========================================';
END $$;

-- 1.1 给 coaches 表添加 user_id
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 1.2 给 members 表添加 user_id
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 1.3 创建索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

DO $$
BEGIN
  RAISE NOTICE '✅ 已添加 user_id 字段和索引';
END $$;

-- ============================================
-- 第二步：启用 RLS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '第二步：启用 RLS';
  RAISE NOTICE '========================================';
END $$;

-- 2.1 启用 RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_member_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '✅ 已启用 5 张表的 RLS';
END $$;

-- ============================================
-- 第三步：删除旧的 RLS 策略
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '第三步：删除旧的 RLS 策略';
  RAISE NOTICE '========================================';
END $$;

-- 3.1 删除 coaches 表的旧策略
DROP POLICY IF EXISTS "教练可以注册" ON coaches;
DROP POLICY IF EXISTS "教练可以查看自己的信息" ON coaches;
DROP POLICY IF EXISTS "教练可以更新自己的信息" ON coaches;
DROP POLICY IF EXISTS "任何人可以查看已审核的教练" ON coaches;

-- 3.2 删除 members 表的旧策略
DROP POLICY IF EXISTS "会员可以注册" ON members;
DROP POLICY IF EXISTS "会员可以查看自己的信息" ON members;
DROP POLICY IF EXISTS "会员可以更新自己的信息" ON members;
DROP POLICY IF EXISTS "教练可以查看自己的会员" ON members;
DROP POLICY IF EXISTS "会员可以删除自己的账号" ON members;

-- 3.3 删除 invite_codes 表的旧策略
DROP POLICY IF EXISTS "教练可以创建邀请码" ON invite_codes;
DROP POLICY IF EXISTS "教练可以查看自己的邀请码" ON invite_codes;
DROP POLICY IF EXISTS "教练可以更新自己的邀请码" ON invite_codes;
DROP POLICY IF EXISTS "任何人可以查看有效的邀请码" ON invite_codes;

-- 3.4 删除 coach_member_relations 表的旧策略
DROP POLICY IF EXISTS "教练可以查看自己的关系" ON coach_member_relations;
DROP POLICY IF EXISTS "会员可以查看自己的关系" ON coach_member_relations;
DROP POLICY IF EXISTS "会员可以申请关系" ON coach_member_relations;
DROP POLICY IF EXISTS "教练可以更新关系状态" ON coach_member_relations;

-- 3.5 删除 notifications 表的旧策略
DROP POLICY IF EXISTS "用户可以查看自己的通知" ON notifications;
DROP POLICY IF EXISTS "用户可以更新自己的通知" ON notifications;
DROP POLICY IF EXISTS "系统可以创建通知" ON notifications;

DO $$
BEGIN
  RAISE NOTICE '✅ 已删除所有旧的 RLS 策略';
END $$;

-- ============================================
-- 第四步：创建新的 RLS 策略（基于 auth.uid()）
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '第四步：创建新的 RLS 策略';
  RAISE NOTICE '========================================';
END $$;

-- 4.1 coaches 表的策略
-- 教练可以查看自己的信息
CREATE POLICY "coaches_select_own" ON coaches
  FOR SELECT USING (user_id = auth.uid());

-- 教练可以更新自己的信息
CREATE POLICY "coaches_update_own" ON coaches
  FOR UPDATE USING (user_id = auth.uid());

-- 任何人可以查看已审核的教练（用于会员查找教练）
CREATE POLICY "coaches_select_approved" ON coaches
  FOR SELECT USING (audit_status = 'approved');

-- 注册时可以插入（user_id 必须是自己）
CREATE POLICY "coaches_insert_own" ON coaches
  FOR INSERT WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '✅ 已创建 coaches 表的 RLS 策略';
END $$;

-- 4.2 members 表的策略
-- 会员可以查看自己的信息
CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (user_id = auth.uid());

-- 会员可以更新自己的信息
CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (user_id = auth.uid());

-- 注册时可以插入（user_id 必须是自己）
CREATE POLICY "members_insert_own" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 教练可以查看自己的会员
CREATE POLICY "members_select_by_coach" ON members
  FOR SELECT USING (
    id IN (
      SELECT member_id FROM coach_member_relations
      WHERE coach_id IN (
        SELECT id FROM coaches WHERE user_id = auth.uid()
      )
      AND status = 'active'
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ 已创建 members 表的 RLS 策略';
END $$;

-- 4.3 invite_codes 表的策略
-- 教练可以查看和管理自己的邀请码
CREATE POLICY "invite_codes_all_own" ON invite_codes
  FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 任何人可以查看有效的邀请码（用于验证）
CREATE POLICY "invite_codes_select_active" ON invite_codes
  FOR SELECT USING (is_active = true);

DO $$
BEGIN
  RAISE NOTICE '✅ 已创建 invite_codes 表的 RLS 策略';
END $$;

-- 4.4 coach_member_relations 表的策略
-- 教练可以查看自己的关系
CREATE POLICY "relations_select_by_coach" ON coach_member_relations
  FOR SELECT USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 会员可以查看自己的关系
CREATE POLICY "relations_select_by_member" ON coach_member_relations
  FOR SELECT USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 会员可以申请关系
CREATE POLICY "relations_insert_by_member" ON coach_member_relations
  FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 教练可以更新关系状态
CREATE POLICY "relations_update_by_coach" ON coach_member_relations
  FOR UPDATE USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

DO $$
BEGIN
  RAISE NOTICE '✅ 已创建 coach_member_relations 表的 RLS 策略';
END $$;

-- 4.5 notifications 表的策略
-- 用户可以查看自己的通知
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    (user_type = 'coach' AND user_id IN (SELECT id FROM coaches WHERE user_id = auth.uid()))
    OR
    (user_type = 'member' AND user_id IN (SELECT id FROM members WHERE user_id = auth.uid()))
  );

-- 用户可以更新自己的通知
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    (user_type = 'coach' AND user_id IN (SELECT id FROM coaches WHERE user_id = auth.uid()))
    OR
    (user_type = 'member' AND user_id IN (SELECT id FROM members WHERE user_id = auth.uid()))
  );

-- 系统可以创建通知（任何认证用户都可以创建通知）
CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DO $$
BEGIN
  RAISE NOTICE '✅ 已创建 notifications 表的 RLS 策略';
END $$;

-- ============================================
-- 第五步：验证结果
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '第五步：验证结果';
  RAISE NOTICE '========================================';
END $$;

-- 5.1 检查 user_id 字段是否存在
DO $$
DECLARE
  coaches_has_user_id BOOLEAN;
  members_has_user_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaches' AND column_name = 'user_id'
  ) INTO coaches_has_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'user_id'
  ) INTO members_has_user_id;

  IF coaches_has_user_id AND members_has_user_id THEN
    RAISE NOTICE '✅ user_id 字段已成功添加';
  ELSE
    RAISE EXCEPTION '❌ user_id 字段添加失败';
  END IF;
END $$;

-- 5.2 检查 RLS 是否启用
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('coaches', 'members', 'invite_codes', 'coach_member_relations', 'notifications')
    AND rowsecurity = true;

  IF rls_count = 5 THEN
    RAISE NOTICE '✅ RLS 已成功启用（5 张表）';
  ELSE
    RAISE EXCEPTION '❌ RLS 启用失败，只有 % 张表启用了 RLS', rls_count;
  END IF;
END $$;

-- 5.3 统计新策略数量
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('coaches', 'members', 'invite_codes', 'coach_member_relations', 'notifications');

  RAISE NOTICE '✅ 已创建 % 条 RLS 策略', policy_count;
END $$;

-- ============================================
-- 提交事务
-- ============================================

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 数据库迁移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 在 Supabase Dashboard 关闭邮箱验证';
  RAISE NOTICE '   Authentication → Settings → Email Auth';
  RAISE NOTICE '   取消勾选 "Confirm email"';
  RAISE NOTICE '';
  RAISE NOTICE '2. 修改前端代码，使用 Supabase Auth';
  RAISE NOTICE '';
  RAISE NOTICE '3. 迁移现有用户数据';
END $$;
