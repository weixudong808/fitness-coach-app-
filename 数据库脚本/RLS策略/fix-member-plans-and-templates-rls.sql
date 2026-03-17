-- 修复 member_plans 和 training_templates 表的 RLS 策略（过渡兼容版）
-- 问题：原策略用 auth.uid() = coach_id，但代码插入的是 coaches.id
-- 解决：INSERT 只允许 coaches.id（防止继续写乱），SELECT/UPDATE/DELETE 兼容两种口径（不丢老数据）

-- ========================================
-- 1. 修复 member_plans 表
-- ========================================

-- 删除旧策略
DROP POLICY IF EXISTS "教练可以查看自己分配的计划" ON member_plans;
DROP POLICY IF EXISTS "教练可以创建分配计划" ON member_plans;
DROP POLICY IF EXISTS "教练可以更新自己分配的计划" ON member_plans;
DROP POLICY IF EXISTS "教练可以删除自己分配的计划" ON member_plans;

-- 创建新策略（过渡兼容版）

-- SELECT: 兼容两种口径（coaches.id 或 auth.uid()）
CREATE POLICY "教练可以查看自己分配的计划"
  ON member_plans FOR SELECT
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
    OR coach_id = auth.uid()
  );

-- INSERT: 只允许 coaches.id（防止继续写乱）
CREATE POLICY "教练可以创建分配计划"
  ON member_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );

-- UPDATE: USING 兼容两种口径，WITH CHECK 只允许 coaches.id
CREATE POLICY "教练可以更新自己分配的计划"
  ON member_plans FOR UPDATE
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
    OR coach_id = auth.uid()
  )
  WITH CHECK (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );

-- DELETE: 兼容两种口径
CREATE POLICY "教练可以删除自己分配的计划"
  ON member_plans FOR DELETE
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
    OR coach_id = auth.uid()
  );

-- ========================================
-- 2. 修复 training_templates 表
-- ========================================

-- 删除旧策略
DROP POLICY IF EXISTS "教练可以查看自己的训练模板" ON training_templates;
DROP POLICY IF EXISTS "教练可以创建训练模板" ON training_templates;
DROP POLICY IF EXISTS "教练可以更新自己的训练模板" ON training_templates;
DROP POLICY IF EXISTS "教练可以删除自己的训练模板" ON training_templates;

-- 创建新策略（过渡兼容版）

-- SELECT: 兼容两种口径（coaches.id 或 auth.uid()）
CREATE POLICY "教练可以查看自己的训练模板"
  ON training_templates FOR SELECT
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
    OR coach_id = auth.uid()
  );

-- INSERT: 只允许 coaches.id（防止继续写乱）
CREATE POLICY "教练可以创建训练模板"
  ON training_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );

-- UPDATE: USING 兼容两种口径，WITH CHECK 只允许 coaches.id
CREATE POLICY "教练可以更新自己的训练模板"
  ON training_templates FOR UPDATE
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
    OR coach_id = auth.uid()
  )
  WITH CHECK (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );

-- DELETE: 兼容两种口径
CREATE POLICY "教练可以删除自己的训练模板"
  ON training_templates FOR DELETE
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
    OR coach_id = auth.uid()
  );
