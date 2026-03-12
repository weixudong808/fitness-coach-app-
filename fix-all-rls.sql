-- 完整的RLS权限修复脚本
-- 一次性解决 coaches 和 members 表的权限问题

-- ============================================
-- 第一部分：修复 coaches 表的 RLS 策略
-- ============================================

-- 删除所有旧的策略
DROP POLICY IF EXISTS "Allow public insert coaches" ON coaches;
DROP POLICY IF EXISTS "Coaches can view own data" ON coaches;
DROP POLICY IF EXISTS "Coaches can update own data" ON coaches;
DROP POLICY IF EXISTS "Enable insert for anon" ON coaches;
DROP POLICY IF EXISTS "Enable read access for all users" ON coaches;

-- 创建新的策略：允许任何人插入教练数据（注册）
CREATE POLICY "Allow anyone to register as coach"
ON coaches
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 创建策略：允许任何人查看教练数据（用于登录验证）
CREATE POLICY "Allow anyone to view coaches"
ON coaches
FOR SELECT
TO anon, authenticated
USING (true);

-- 创建策略：教练可以更新自己的数据
CREATE POLICY "Coaches can update own data"
ON coaches
FOR UPDATE
TO authenticated
USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub')
WITH CHECK (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================
-- 第二部分：修复 members 表的 RLS 策略
-- ============================================

-- 删除所有旧的策略
DROP POLICY IF EXISTS "Allow public insert members" ON members;
DROP POLICY IF EXISTS "Members can view own data" ON members;
DROP POLICY IF EXISTS "Members can update own data" ON members;
DROP POLICY IF EXISTS "Enable insert for anon" ON members;
DROP POLICY IF EXISTS "Enable read access for all users" ON members;

-- 创建新的策略：允许任何人插入会员数据（注册）
CREATE POLICY "Allow anyone to register as member"
ON members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 创建策略：允许任何人查看会员数据（用于登录验证）
CREATE POLICY "Allow anyone to view members"
ON members
FOR SELECT
TO anon, authenticated
USING (true);

-- 创建策略：会员可以更新自己的数据
CREATE POLICY "Members can update own data"
ON members
FOR UPDATE
TO authenticated
USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub')
WITH CHECK (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================
-- 第三部分：添加注释
-- ============================================

COMMENT ON POLICY "Allow anyone to register as coach" ON coaches IS '允许任何人注册教练账号';
COMMENT ON POLICY "Allow anyone to view coaches" ON coaches IS '允许任何人查看教练数据（用于登录）';
COMMENT ON POLICY "Allow anyone to register as member" ON members IS '允许任何人注册会员账号';
COMMENT ON POLICY "Allow anyone to view members" ON members IS '允许任何人查看会员数据（用于登录）';

-- 完成
SELECT 'RLS策略修复完成！' as message;
