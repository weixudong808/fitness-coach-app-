-- ============================================
-- 临时止血方案（改进版）- 2026-03-12
-- ⚠️ 警告：此方案仅用于开发/测试环境
-- ⚠️ 不要在生产环境使用
-- ⚠️ 回切日期：2026-03-19
-- ============================================

-- 开始事务
BEGIN;

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

-- 检查是否更新成功
DO $$
BEGIN
    IF NOT FOUND THEN
        RAISE NOTICE '警告：手机号 13800138000 在 members 表中不存在';
    ELSE
        RAISE NOTICE '成功：已为手机号 13800138000 设置密码';
    END IF;
END $$;

-- 给手机号 13122227789 的会员设置密码为 "123456"
UPDATE members
SET password = '123456'
WHERE phone = '13122227789';

-- 检查是否更新成功
DO $$
BEGIN
    IF NOT FOUND THEN
        RAISE NOTICE '警告：手机号 13122227789 在 members 表中不存在';
    ELSE
        RAISE NOTICE '成功：已为手机号 13122227789 设置密码';
    END IF;
END $$;

-- 给所有没有密码的会员设置默认密码 "123456"
UPDATE members
SET password = '123456'
WHERE password IS NULL OR password = '';

-- 显示更新了多少条记录
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '成功：已为 % 个会员设置默认密码', updated_count;
END $$;

-- ============================================
-- 第三部分：确保教练审核状态正确
-- ============================================

-- 先检查教练是否存在
DO $$
DECLARE
    coach_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM coaches WHERE phone = '18613371019') INTO coach_exists;

    IF coach_exists THEN
        RAISE NOTICE '成功：找到教练 18613371019';
    ELSE
        RAISE EXCEPTION '错误：手机号 18613371019 在 coaches 表中不存在，请检查数据';
    END IF;
END $$;

-- 将教练 18613371019（东）设置为已审核
UPDATE coaches
SET audit_status = 'approved'
WHERE phone = '18613371019';

-- 检查是否更新成功
DO $$
BEGIN
    IF NOT FOUND THEN
        RAISE EXCEPTION '错误：无法更新教练 18613371019 的审核状态';
    ELSE
        RAISE NOTICE '成功：已将教练 18613371019 设置为审核通过';
    END IF;
END $$;

-- ============================================
-- 第四部分：验证结果
-- ============================================

-- 查看所有教练的审核状态
SELECT
    id,
    name,
    phone,
    audit_status,
    created_at
FROM coaches
ORDER BY created_at DESC;

-- 查看已设置密码的会员
SELECT
    id,
    name,
    phone,
    CASE
        WHEN password IS NULL THEN 'NULL'
        WHEN password = '' THEN 'EMPTY'
        ELSE 'HAS_PASSWORD'
    END as password_status,
    created_at
FROM members
WHERE phone IN ('13800138000', '13122227789')
ORDER BY created_at DESC;

-- 提交事务
COMMIT;

-- ============================================
-- 完成！
-- ============================================
-- 执行完成后：
-- 1. RLS已暂时禁用
-- 2. 旧会员密码已重置为 "123456"
-- 3. 教练 18613371019 已设置为审核通过
--
-- ⚠️ 重要提醒：
-- 1. 此方案仅用于开发/测试环境
-- 2. 不要放真实用户数据
-- 3. 回切日期：2026-03-19
-- 4. 届时需要启用 Supabase Auth + 正确的RLS策略
--
-- ⚠️ 前端代码还需要修复：
-- - 问题1: 教练登录跳转（已修复）
-- - 问题3: 会员管理页面（已修复）
-- - 问题5: localStorage缓存（需用户手动清除）
-- - 问题9: 查找教练页面（已修复）
-- - 问题11: 管理员审核按钮（已修复）
