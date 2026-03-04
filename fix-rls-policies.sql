-- 修复注册时的 RLS 策略问题

-- 1. 允许新用户创建自己的角色记录
DROP POLICY IF EXISTS "用户可以创建自己的角色" ON user_roles;
CREATE POLICY "用户可以创建自己的角色" ON user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2. 允许新会员创建自己的会员记录
DROP POLICY IF EXISTS "会员可以创建自己的记录" ON members;
CREATE POLICY "会员可以创建自己的记录" ON members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. 保留教练插入会员的权限（如果已存在）
-- 这个策略允许教练添加会员
CREATE POLICY IF NOT EXISTS "教练可以插入会员" ON members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );
