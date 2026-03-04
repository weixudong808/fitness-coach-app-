-- 数据库迁移：简化训练记录逻辑
-- 日期：2026-03-04
-- 目的：将"计划"和"记录"合并，不再区分计划数据和实际数据

-- 1. 为 training_sessions 表添加完成状态字段
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_date DATE;

-- 2. 为 session_exercises 表添加会员反馈字段（如果还没有的话）
ALTER TABLE session_exercises
ADD COLUMN IF NOT EXISTS member_feedback TEXT,
ADD COLUMN IF NOT EXISTS progress_notes TEXT;

-- 3. 添加注释说明
COMMENT ON COLUMN training_sessions.completed IS '课次是否已完成训练';
COMMENT ON COLUMN training_sessions.completed_date IS '课次完成日期';
COMMENT ON COLUMN session_exercises.member_feedback IS '会员反馈（发力/难度/感受）';
COMMENT ON COLUMN session_exercises.progress_notes IS '阶段进步记录';

-- 注意：不删除 member_session_records 和 member_exercise_records 表
-- 这些表可能包含历史数据，保留以防万一
-- 但新的业务逻辑不再使用这些表
