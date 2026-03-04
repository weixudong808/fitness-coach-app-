-- 新的训练计划模板数据库设计
-- 基于实际的训练计划表格结构

-- 1. 训练模板表（保持不变，但添加训练阶段字段）
ALTER TABLE training_templates ADD COLUMN IF NOT EXISTS training_stage TEXT;
-- 训练阶段：基础期/进阶期/突破期

-- 2. 创建训练课次表（替代原来的 template_days）
DROP TABLE IF EXISTS training_sessions CASCADE;
CREATE TABLE training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES training_templates(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL, -- 课次编号
  session_date DATE, -- 训练日期（分配给会员时填写）
  core_focus TEXT, -- 本节课核心重点
  training_part TEXT, -- 训练部位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建课次动作表（替代原来的 day_exercises）
DROP TABLE IF EXISTS session_exercises CASCADE;
CREATE TABLE session_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL, -- 动作名称
  equipment_notes TEXT, -- 器械/握距备注
  weight TEXT, -- 重量（标注单位）：单边Xkg/整体Xkg/自重/弹力带X档
  reps_standard TEXT NOT NULL, -- 次数/完成标准
  sets INTEGER NOT NULL, -- 组数
  next_goal TEXT, -- 下节进阶目标
  member_feedback TEXT, -- 会员反馈
  progress_record TEXT, -- 阶段进步记录
  order_index INTEGER NOT NULL, -- 动作顺序
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建会员训练计划表（记录分配给会员的计划）
-- 这个表保持不变，但需要关联到新的 training_sessions

-- 5. 创建会员课次记录表（记录会员每次上课的情况）
DROP TABLE IF EXISTS member_session_records CASCADE;
CREATE TABLE member_session_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES member_plans(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  session_date DATE NOT NULL, -- 实际上课日期
  completed BOOLEAN DEFAULT false, -- 是否完成
  coach_notes TEXT, -- 教练备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建会员动作记录表（记录会员每个动作的完成情况）
DROP TABLE IF EXISTS member_exercise_records CASCADE;
CREATE TABLE member_exercise_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_record_id UUID REFERENCES member_session_records(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES session_exercises(id) ON DELETE CASCADE,
  actual_weight TEXT, -- 实际使用的重量
  actual_reps TEXT, -- 实际完成的次数
  actual_sets INTEGER, -- 实际完成的组数
  member_feedback TEXT, -- 会员反馈（发力/难度/感受）
  coach_feedback TEXT, -- 教练反馈
  completed BOOLEAN DEFAULT false, -- 是否完成
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_session_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_exercise_records ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略

-- training_sessions 表策略
DROP POLICY IF EXISTS "所有人可以查看训练课次" ON training_sessions;
CREATE POLICY "所有人可以查看训练课次" ON training_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "教练可以创建训练课次" ON training_sessions;
CREATE POLICY "教练可以创建训练课次" ON training_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以更新训练课次" ON training_sessions;
CREATE POLICY "教练可以更新训练课次" ON training_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以删除训练课次" ON training_sessions;
CREATE POLICY "教练可以删除训练课次" ON training_sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

-- session_exercises 表策略
DROP POLICY IF EXISTS "所有人可以查看课次动作" ON session_exercises;
CREATE POLICY "所有人可以查看课次动作" ON session_exercises FOR SELECT USING (true);

DROP POLICY IF EXISTS "教练可以创建课次动作" ON session_exercises;
CREATE POLICY "教练可以创建课次动作" ON session_exercises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以更新课次动作" ON session_exercises;
CREATE POLICY "教练可以更新课次动作" ON session_exercises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以删除课次动作" ON session_exercises;
CREATE POLICY "教练可以删除课次动作" ON session_exercises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

-- member_session_records 表策略
DROP POLICY IF EXISTS "会员可以查看自己的课次记录" ON member_session_records;
CREATE POLICY "会员可以查看自己的课次记录" ON member_session_records
  FOR SELECT
  USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "教练可以查看所有课次记录" ON member_session_records;
CREATE POLICY "教练可以查看所有课次记录" ON member_session_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以创建课次记录" ON member_session_records;
CREATE POLICY "教练可以创建课次记录" ON member_session_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以更新课次记录" ON member_session_records;
CREATE POLICY "教练可以更新课次记录" ON member_session_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

-- member_exercise_records 表策略
DROP POLICY IF EXISTS "会员可以查看自己的动作记录" ON member_exercise_records;
CREATE POLICY "会员可以查看自己的动作记录" ON member_exercise_records
  FOR SELECT
  USING (
    session_record_id IN (
      SELECT id FROM member_session_records
      WHERE member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "教练可以查看所有动作记录" ON member_exercise_records;
CREATE POLICY "教练可以查看所有动作记录" ON member_exercise_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以创建动作记录" ON member_exercise_records;
CREATE POLICY "教练可以创建动作记录" ON member_exercise_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "教练可以更新动作记录" ON member_exercise_records;
CREATE POLICY "教练可以更新动作记录" ON member_exercise_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_training_sessions_template_id ON training_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_session_id ON session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_member_session_records_member_id ON member_session_records(member_id);
CREATE INDEX IF NOT EXISTS idx_member_session_records_plan_id ON member_session_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_member_exercise_records_session_record_id ON member_exercise_records(session_record_id);
