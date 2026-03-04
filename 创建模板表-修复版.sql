-- 创建训练计划模板表和动作表（修复版）

-- 1. 创建训练计划模板表
CREATE TABLE IF NOT EXISTS training_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_goal TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建模板动作表
CREATE TABLE IF NOT EXISTS template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight TEXT,
  rest_time INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 添加外键约束
ALTER TABLE training_templates
ADD CONSTRAINT fk_coach
FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE template_exercises
ADD CONSTRAINT fk_template
FOREIGN KEY (template_id) REFERENCES training_templates(id) ON DELETE CASCADE;

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_training_templates_coach_id ON training_templates(coach_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);

-- 5. 启用行级安全策略（RLS）
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;

-- 6. 创建安全策略 - training_templates
CREATE POLICY "教练可以查看自己的训练模板"
  ON training_templates FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "教练可以创建训练模板"
  ON training_templates FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "教练可以更新自己的训练模板"
  ON training_templates FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "教练可以删除自己的训练模板"
  ON training_templates FOR DELETE
  USING (auth.uid() = coach_id);

-- 7. 创建安全策略 - template_exercises
CREATE POLICY "教练可以查看自己模板的动作"
  ON template_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_templates
      WHERE training_templates.id = template_exercises.template_id
      AND training_templates.coach_id = auth.uid()
    )
  );

CREATE POLICY "教练可以为自己的模板添加动作"
  ON template_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_templates
      WHERE training_templates.id = template_exercises.template_id
      AND training_templates.coach_id = auth.uid()
    )
  );

CREATE POLICY "教练可以更新自己模板的动作"
  ON template_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM training_templates
      WHERE training_templates.id = template_exercises.template_id
      AND training_templates.coach_id = auth.uid()
    )
  );

CREATE POLICY "教练可以删除自己模板的动作"
  ON template_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM training_templates
      WHERE training_templates.id = template_exercises.template_id
      AND training_templates.coach_id = auth.uid()
    )
  );
