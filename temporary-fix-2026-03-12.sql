-- ============================================
-- 临时止血方案 - 2026-03-12
-- ⚠️ 警告：此方案仅用于开发/测试环境
-- ⚠️ 不要在生产环境使用
-- ⚠️ 回切日期：2026-03-19
-- ============================================

-- ============================================
-- 第一部分：暂时禁用RLS（临时方案）
-- ============================================

-- 禁用 coaches 表的 RLS
ALTER TABLE coaches DISABLE ROW LEVEL SECURITY;

-- 禁用 members 表的 RLS
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- 禁用 invite_codes 表的 RLS
ALTER TABLE invite_codes DISABLE ROW LEVEL SECURITY;

-- 禁用 coach_member_relations 表的 RLS
ALTER TABLE coach_member_relations DISABLE ROW LEVEL SECURITY;

-- 禁用 notifications 表的 RLS
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 第二部分：重置旧会员密码
-- ============================================

-- 给手机号 13800138000 的会员设置密码为 "123456"
UPDATE members
SET password = '123456'
WHERE phone = '13800138000';

-- 给手机号 13122227789 的会员设置密码为 "123456"
UPDATE members
SET password = '123456'
WHERE phone = '13122227789';

-- 给所有没有密码的会员设置默认密码 "123456"
UPDATE members
SET password = '123456'
WHERE password IS NULL OR password = '';

-- ============================================
-- 第三部分：确保教练审核状态正确
-- ============================================

-- 将教练 18613371019（东）设置为已审核
UPDATE coaches
SET audit_status = 'approved'
WHERE phone = '18613371019';

-- 查看所有教练的审核状态
SELECT id, name, phone, audit_status, created_at
FROM coaches
ORDER BY created_at DESC;

-- ============================================
-- 完成！
-- ============================================
-- 执行完成后，RLS已暂时禁用
-- 所有旧会员密码已重置为 "123456"
-- 教练 18613371019 已设置为审核通过
--
-- ⚠️ 重要提醒：
-- 1. 此方案仅用于开发/测试环境
-- 2. 不要放真实用户数据
-- 3. 回切日期：2026-03-19
-- 4. 届时需要启用 Supabase Auth + 正确的RLS策略
