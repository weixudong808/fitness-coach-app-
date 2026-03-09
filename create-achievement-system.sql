-- 会员成就认证系统 - 数据库表创建脚本
-- 创建时间：2026-03-08
-- 用途：实现游戏化的会员成就认证体系

-- =====================================================
-- 1. 认证定义表（achievement_definitions）
-- 存储所有认证的标准和条件
-- =====================================================
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,           -- 认证代码（如：check_in_100, basic_fitness_1）
  name TEXT NOT NULL,                  -- 认证名称
  category TEXT NOT NULL,              -- 认证类别（check_in/influence/basic_fitness/advanced_fitness/master）
  level INTEGER NOT NULL,              -- 等级（1-9）
  description TEXT,                    -- 认证描述
  requirement JSONB NOT NULL,          -- 认证条件（JSON格式）
  reward_text TEXT,                    -- 奖励话术
  reward_badge TEXT,                   -- 徽章图标/代码
  reward_physical TEXT,                -- 实体奖励描述
  sort_order INTEGER DEFAULT 0,        -- 排序
  is_active BOOLEAN DEFAULT true,      -- 是否启用
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE achievement_definitions IS '认证定义表：存储所有认证的标准和条件';
COMMENT ON COLUMN achievement_definitions.code IS '认证代码，唯一标识';
COMMENT ON COLUMN achievement_definitions.category IS '认证类别：check_in(打卡)/influence(影响力)/basic_fitness(基础体能)/advanced_fitness(高级体能)/master(大师)';
COMMENT ON COLUMN achievement_definitions.requirement IS '认证条件，JSON格式，如：{"type":"check_in_count","target":100}';

-- =====================================================
-- 2. 会员认证进度表（member_achievement_progress）
-- 存储会员各项认证的实时进度
-- =====================================================
CREATE TABLE IF NOT EXISTS member_achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL REFERENCES achievement_definitions(code) ON DELETE CASCADE,
  current_value NUMERIC DEFAULT 0,     -- 当前进度值
  target_value NUMERIC NOT NULL,       -- 目标值
  progress_percent INTEGER DEFAULT 0,  -- 进度百分比（0-100）
  is_completed BOOLEAN DEFAULT false,  -- 是否完成
  completed_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, achievement_code)
);

-- 添加注释
COMMENT ON TABLE member_achievement_progress IS '会员认证进度表：存储会员各项认证的实时进度';
COMMENT ON COLUMN member_achievement_progress.current_value IS '当前进度值，如：已打卡50次';
COMMENT ON COLUMN member_achievement_progress.target_value IS '目标值，如：100次';
COMMENT ON COLUMN member_achievement_progress.progress_percent IS '进度百分比，用于显示进度条';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_member_achievement_progress_member
ON member_achievement_progress(member_id);

CREATE INDEX IF NOT EXISTS idx_member_achievement_progress_completed
ON member_achievement_progress(is_completed);

CREATE INDEX IF NOT EXISTS idx_member_achievement_progress_code
ON member_achievement_progress(achievement_code);

-- =====================================================
-- 3. 会员认证记录表（member_achievements）
-- 存储会员已获得的认证
-- =====================================================
CREATE TABLE IF NOT EXISTS member_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL REFERENCES achievement_definitions(code) ON DELETE CASCADE,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT false,  -- 是否已领取奖励
  reward_claimed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,                            -- 备注
  UNIQUE(member_id, achievement_code)
);

-- 添加注释
COMMENT ON TABLE member_achievements IS '会员认证记录表：存储会员已获得的认证';
COMMENT ON COLUMN member_achievements.reward_claimed IS '是否已领取奖励（实体奖励）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_member_achievements_member
ON member_achievements(member_id);

CREATE INDEX IF NOT EXISTS idx_member_achievements_achieved_at
ON member_achievements(achieved_at);

CREATE INDEX IF NOT EXISTS idx_member_achievements_code
ON member_achievements(achievement_code);

-- =====================================================
-- 4. 会员等级表（member_levels）
-- 存储会员的整体等级信息
-- =====================================================
CREATE TABLE IF NOT EXISTS member_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,     -- 当前等级（1-9）
  level_name TEXT DEFAULT '新手',      -- 等级名称
  total_achievements INTEGER DEFAULT 0, -- 已获得认证数
  experience_points INTEGER DEFAULT 0,  -- 经验值
  next_level_requirements JSONB,       -- 下一等级要求
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE member_levels IS '会员等级表：存储会员的整体等级信息';
COMMENT ON COLUMN member_levels.current_level IS '当前等级：1-9（1=新手，9=自主训练者）';
COMMENT ON COLUMN member_levels.experience_points IS '经验值，每次训练获得经验';
COMMENT ON COLUMN member_levels.next_level_requirements IS '下一等级要求，JSON格式';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_member_levels_level
ON member_levels(current_level);

CREATE INDEX IF NOT EXISTS idx_member_levels_member
ON member_levels(member_id);

-- =====================================================
-- 5. RLS（行级安全）策略
-- =====================================================

-- 启用 RLS
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_levels ENABLE ROW LEVEL SECURITY;

-- achievement_definitions：所有人可读
DROP POLICY IF EXISTS "认证定义所有人可读" ON achievement_definitions;
CREATE POLICY "认证定义所有人可读"
ON achievement_definitions FOR SELECT
USING (true);

-- member_achievement_progress：会员只能查看自己的进度
DROP POLICY IF EXISTS "会员查看自己的认证进度" ON member_achievement_progress;
CREATE POLICY "会员查看自己的认证进度"
ON member_achievement_progress FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- member_achievement_progress：教练可以查看所有会员的进度
DROP POLICY IF EXISTS "教练查看所有会员认证进度" ON member_achievement_progress;
CREATE POLICY "教练查看所有会员认证进度"
ON member_achievement_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'coach'
  )
);

-- member_achievements：会员只能查看自己的认证
DROP POLICY IF EXISTS "会员查看自己的认证" ON member_achievements;
CREATE POLICY "会员查看自己的认证"
ON member_achievements FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- member_achievements：教练可以查看所有会员的认证
DROP POLICY IF EXISTS "教练查看所有会员认证" ON member_achievements;
CREATE POLICY "教练查看所有会员认证"
ON member_achievements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'coach'
  )
);

-- member_levels：会员只能查看自己的等级
DROP POLICY IF EXISTS "会员查看自己的等级" ON member_levels;
CREATE POLICY "会员查看自己的等级"
ON member_levels FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- member_levels：教练可以查看所有会员的等级
DROP POLICY IF EXISTS "教练查看所有会员等级" ON member_levels;
CREATE POLICY "教练查看所有会员等级"
ON member_levels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'coach'
  )
);

-- =====================================================
-- 6. 触发器：自动更新时间戳
-- =====================================================

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 member_levels 表添加触发器
DROP TRIGGER IF EXISTS update_member_levels_updated_at ON member_levels;
CREATE TRIGGER update_member_levels_updated_at
BEFORE UPDATE ON member_levels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 为 member_achievement_progress 表添加触发器
DROP TRIGGER IF EXISTS update_member_achievement_progress_updated_at ON member_achievement_progress;
CREATE TRIGGER update_member_achievement_progress_updated_at
BEFORE UPDATE ON member_achievement_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 完成提示
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 会员成就认证系统数据库表创建完成！';
  RAISE NOTICE '📋 已创建表：';
  RAISE NOTICE '   - achievement_definitions（认证定义）';
  RAISE NOTICE '   - member_achievement_progress（认证进度）';
  RAISE NOTICE '   - member_achievements（认证记录）';
  RAISE NOTICE '   - member_levels（会员等级）';
  RAISE NOTICE '🔒 RLS 策略已启用';
  RAISE NOTICE '📊 索引已创建';
  RAISE NOTICE '⏰ 触发器已配置';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：执行 init-achievement-definitions.sql 初始化认证数据';
END $$;
