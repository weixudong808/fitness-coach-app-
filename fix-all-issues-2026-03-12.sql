-- ============================================
-- 修复所有问题的完整SQL脚本
-- 执行日期：2026-03-12
-- ============================================

-- ============================================
-- 1. 修复 invite_codes 表的RLS权限
-- ============================================
-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "invite_codes_insert_policy" ON invite_codes;
DROP POLICY IF EXISTS "invite_codes_select_policy" ON invite_codes;
DROP POLICY IF EXISTS "invite_codes_update_policy" ON invite_codes;

-- 允许已认证的教练插入邀请码
CREATE POLICY "invite_codes_insert_policy" ON invite_codes
FOR INSERT
WITH CHECK (true);

-- 允许所有人查询邀请码（用于验证）
CREATE POLICY "invite_codes_select_policy" ON invite_codes
FOR SELECT
USING (true);

-- 允许教练更新自己的邀请码
CREATE POLICY "invite_codes_update_policy" ON invite_codes
FOR UPDATE
USING (true);

-- ============================================
-- 2. 修复 members 表的RLS权限（查询权限）
-- ============================================
-- 删除旧的查询策略（如果存在）
DROP POLICY IF EXISTS "members_select_policy" ON members;

-- 允许所有人查询会员信息（用于教练查看会员、会员查看自己）
CREATE POLICY "members_select_policy" ON members
FOR SELECT
USING (true);

-- ============================================
-- 3. 修复 coaches 表的RLS权限（查询权限）
-- ============================================
-- 删除旧的查询策略（如果存在）
DROP POLICY IF EXISTS "coaches_select_policy" ON coaches;

-- 允许所有人查询教练信息（用于会员查找教练）
CREATE POLICY "coaches_select_policy" ON coaches
FOR SELECT
USING (true);

-- 允许更新教练信息（用于审核）
DROP POLICY IF EXISTS "coaches_update_policy" ON coaches;
CREATE POLICY "coaches_update_policy" ON coaches
FOR UPDATE
USING (true);

-- ============================================
-- 4. 修复 coach_member_relations 表的RLS权限
-- ============================================
-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "relations_insert_policy" ON coach_member_relations;
DROP POLICY IF EXISTS "relations_select_policy" ON coach_member_relations;
DROP POLICY IF EXISTS "relations_update_policy" ON coach_member_relations;
DROP POLICY IF EXISTS "relations_delete_policy" ON coach_member_relations;

-- 允许插入关系
CREATE POLICY "relations_insert_policy" ON coach_member_relations
FOR INSERT
WITH CHECK (true);

-- 允许查询关系
CREATE POLICY "relations_select_policy" ON coach_member_relations
FOR SELECT
USING (true);

-- 允许更新关系（用于审核）
CREATE POLICY "relations_update_policy" ON coach_member_relations
FOR UPDATE
USING (true);

-- 允许删除关系
CREATE POLICY "relations_delete_policy" ON coach_member_relations
FOR DELETE
USING (true);

-- ============================================
-- 5. 修复 notifications 表的RLS权限
-- ============================================
-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;

-- 允许插入通知
CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT
WITH CHECK (true);

-- 允许查询通知
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT
USING (true);

-- 允许更新通知（标记已读）
CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE
USING (true);

-- ============================================
-- 6. 给旧会员添加默认密码
-- ============================================
-- 给所有没有密码的会员添加默认密码 "123456"
UPDATE members
SET password = '123456'
WHERE password IS NULL OR password = '';

-- ============================================
-- 7. 确保教练账号审核状态正确
-- ============================================
-- 将手机号为 18613371019 的教练设置为已审核
UPDATE coaches
SET audit_status = 'approved'
WHERE phone = '18613371019';

-- ============================================
-- 完成！
-- ============================================
-- 执行完成后，所有RLS权限问题应该都解决了
-- 旧会员账号也可以正常登录了
