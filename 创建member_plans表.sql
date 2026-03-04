-- 创建会员训练计划分配表

-- 1. 创建 member_plans 表
CREATE TABLE IF NOT EXISTS member_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  template_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_member_plans_member_id ON member_plans(member_id);
CREATE INDEX IF NOT EXISTS idx_member_plans_template_id ON member_plans(template_id);
CREATE INDEX IF NOT EXISTS idx_member_plans_coach_id ON member_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_member_plans_status ON member_plans(status);

-- 3. 启用行级安全策略（RLS）
ALTER TABLE member_plans ENABLE ROW LEVEL SECURITY;

-- 4. 创建安全策略 - 教练端
-- 教练可以查看自己分配的计划
CREATE POLICY "教练可以查看自己分配的计划"
  ON member_plans FOR SELECT
  USING (auth.uid() = coach_id);

-- 教练可以创建分配计划
CREATE POLICY "教练可以创建分配计划"
  ON member_plans FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- 教练可以更新自己分配的计划
CREATE POLICY "教练可以更新自己分配的计划"
  ON member_plans FOR UPDATE
  USING (auth.uid() = coach_id);

-- 教练可以删除自己分配的计划
CREATE POLICY "教练可以删除自己分配的计划"
  ON member_plans FOR DELETE
  USING (auth.uid() = coach_id);

-- 5. 创建安全策略 - 会员端
-- 会员可以查看分配给自己的计划
CREATE POLICY "会员可以查看自己的训练计划"
  ON member_plans FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );
