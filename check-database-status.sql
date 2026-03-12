-- ============================================
-- 第一步：查询数据库现状
-- 请在 Supabase SQL Editor 执行这些查询
-- 把结果截图或复制给我
-- ============================================

-- 1. 查询所有现有的 RLS 策略
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. 查询 coaches 表中是否有手机号 18613371019
SELECT id, name, phone, audit_status, created_at
FROM coaches
WHERE phone = '18613371019';

-- 3. 查询所有待审核的教练
SELECT id, name, phone, audit_status, created_at
FROM coaches
WHERE audit_status = 'pending'
ORDER BY created_at DESC;

-- 4. 查询 members 表的密码字段情况
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

-- 5. 查询所有没有密码的会员
SELECT
    id,
    name,
    phone,
    created_at
FROM members
WHERE password IS NULL OR password = ''
ORDER BY created_at DESC
LIMIT 10;
