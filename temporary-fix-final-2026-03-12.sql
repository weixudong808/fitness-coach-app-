-- ============================================
-- 临时止血方案（最终版）- 2026-03-12
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

DO $$
BEGIN
    RAISE NOTICE '✅ 已禁用5张表的RLS';
END $$;

-- ============================================
-- 第二部分：重置旧会员密码
-- ============================================

-- 给手机号 13800138000 的会员设置密码
DO $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE members
    SET password = '123456'
    WHERE phone = '13800138000';

    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    IF updated_rows = 0 THEN
        RAISE NOTICE '⚠️  警告：手机号 13800138000 在 members 表中不存在';
    ELSE
        RAISE NOTICE '✅ 成功：已为手机号 13800138000 设置密码';
    END IF;
END $$;

-- 给手机号 13122227789 的会员设置密码
DO $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE members
    SET password = '123456'
    WHERE phone = '13122227789';

    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    IF updated_rows = 0 THEN
        RAISE NOTICE '⚠️  警告：手机号 13122227789 在 members 表中不存在';
    ELSE
        RAISE NOTICE '✅ 成功：已为手机号 13122227789 设置密码';
    END IF;
END $$;

-- 给所有没有密码的会员设置默认密码
DO $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE members
    SET password = '123456'
    WHERE password IS NULL OR password = '';

    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    RAISE NOTICE '✅ 成功：已为 % 个会员设置默认密码', updated_rows;
END $$;

-- ============================================
-- 第三部分：确保教练审核状态正确
-- ============================================

-- 检查并更新教练审核状态
DO $$
DECLARE
    coach_exists BOOLEAN;
    updated_rows INTEGER;
BEGIN
    -- 先检查教练是否存在
    SELECT EXISTS(SELECT 1 FROM coaches WHERE phone = '18613371019') INTO coach_exists;

    IF NOT coach_exists THEN
        RAISE NOTICE '⚠️  警告：手机号 18613371019 在 coaches 表中不存在';
    ELSE
        -- 只更新不是 approved 的行
        UPDATE coaches
        SET audit_status = 'approved'
        WHERE phone = '18613371019'
          AND audit_status IS DISTINCT FROM 'approved';

        GET DIAGNOSTICS updated_rows = ROW_COUNT;

        IF updated_rows > 0 THEN
            RAISE NOTICE '✅ 成功：已将教练 18613371019 设置为审核通过';
        ELSE
            RAISE NOTICE 'ℹ️  提示：教练 18613371019 已经是审核通过状态';
        END IF;
    END IF;
END $$;

-- ============================================
-- 第四部分：验证结果
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '验证结果：';
    RAISE NOTICE '========================================';
END $$;

-- 查看所有教练的审核状态
DO $$
DECLARE
    coach_record RECORD;
BEGIN
    RAISE NOTICE '教练列表：';
    FOR coach_record IN
        SELECT id, name, phone, audit_status, created_at
        FROM coaches
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '  - %: % (%) - %', coach_record.phone, coach_record.name, coach_record.audit_status, coach_record.created_at;
    END LOOP;
END $$;

-- 查看已设置密码的会员
DO $$
DECLARE
    member_record RECORD;
    password_status TEXT;
BEGIN
    RAISE NOTICE '会员密码状态：';
    FOR member_record IN
        SELECT id, name, phone, password, created_at
        FROM members
        WHERE phone IN ('13800138000', '13122227789')
        ORDER BY created_at DESC
    LOOP
        IF member_record.password IS NULL THEN
            password_status := 'NULL';
        ELSIF member_record.password = '' THEN
            password_status := 'EMPTY';
        ELSE
            password_status := 'HAS_PASSWORD';
        END IF;

        RAISE NOTICE '  - %: % (%)', member_record.phone, member_record.name, password_status;
    END LOOP;
END $$;

-- 提交事务
COMMIT;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 所有操作已完成并提交';
    RAISE NOTICE '========================================';
END $$;

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
-- ⚠️ 此SQL只解决数据库问题，前端代码问题需要单独修复：
-- - 问题1: 教练登录跳转（已修复代码）
-- - 问题3: 会员管理页面（已修复代码）
-- - 问题5: localStorage缓存（需用户手动清除）
-- - 问题9: 查找教练页面（已修复代码）
-- - 问题11: 管理员审核按钮（已修复代码）
