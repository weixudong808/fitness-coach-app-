-- 修复 members 表的 RLS 策略
-- 允许任何人注册会员账号（插入数据）

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Allow public insert members" ON members;

-- 创建新的策略：允许任何人插入会员数据（注册）
CREATE POLICY "Allow public insert members"
ON members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 创建策略：会员只能查看自己的数据
DROP POLICY IF EXISTS "Members can view own data" ON members;
CREATE POLICY "Members can view own data"
ON members
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- 创建策略：会员可以更新自己的数据
DROP POLICY IF EXISTS "Members can update own data" ON members;
CREATE POLICY "Members can update own data"
ON members
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text);

COMMENT ON POLICY "Allow public insert members" ON members IS '允许任何人注册会员账号';
