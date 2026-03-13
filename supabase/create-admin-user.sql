-- ============================================
-- 创建管理员账号脚本
-- ============================================
-- 用途：为 Fitness Coach App 创建管理员账号
-- 执行方式：在 Supabase SQL Editor 中执行
-- ============================================

-- 第1步：设置管理员账号的 admin 角色
-- 将 admin@fitness.app 用户的 raw_user_meta_data 设置为 {"role": "admin"}
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'admin@fitness.app';

-- 第2步：验证设置是否成功
-- 查询管理员用户信息，确认 role 已设置
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as role,
  created_at,
  confirmed_at
FROM auth.users
WHERE email = 'admin@fitness.app';

-- ============================================
-- 预期结果：
-- 应该看到一行记录，role 列显示为 "admin"
-- ============================================

-- 注意事项：
-- 1. 执行此脚本前，请确保已在 Supabase Dashboard 中创建了 admin@fitness.app 用户
-- 2. 如果用户不存在，第1步的 UPDATE 不会报错，但也不会有任何效果
-- 3. 第2步的查询结果如果为空，说明用户不存在，需要先创建用户
