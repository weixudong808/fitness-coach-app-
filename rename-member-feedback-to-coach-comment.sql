-- 重命名字段：member_feedback → coach_comment
-- 原因：member_feedback 字段现在用于存储教练评语，未来会员端需要新增真正的会员反馈字段
-- 执行时间：2026-03-04

ALTER TABLE session_exercises
RENAME COLUMN member_feedback TO coach_comment;

-- 说明：
-- 1. coach_comment: 教练评语（教练填写）
-- 2. 未来可以新增 member_feedback: 会员反馈（会员填写）
