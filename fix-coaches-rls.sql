-- 修复 coaches 表的 RLS 策略
-- 允许任何人注册教练账号（插入数据）

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Allow public insert coaches" ON coaches;

-- 创建新的策略：允许任何人插入教练数据（注册）
CREATE POLICY "Allow public insert coaches"
ON coaches
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 创建策略：教练只能查看自己的数据
DROP POLICY IF EXISTS "Coaches can view own data" ON coaches;
CREATE POLICY "Coaches can view own data"
ON coaches
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- 创建策略：教练可以更新自己的数据
DROP POLICY IF EXISTS "Coaches can update own data" ON coaches;
CREATE POLICY "Coaches can update own data"
ON coaches
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text);

COMMENT ON POLICY "Allow public insert coaches" ON coaches IS '允许任何人注册教练账号';
