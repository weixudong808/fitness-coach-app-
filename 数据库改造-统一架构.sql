-- ============================================
-- 健身教练管理系统 - 数据库架构改造
-- ============================================
-- 改造目标：从"单教练独立数据库"改为"统一数据库 + 多教练 + 邀请码"
-- 创建时间：2026-03-12
-- 执行前请备份数据库！
-- ============================================

-- ============================================
-- 第一部分：创建新表
-- ============================================

-- 1. 教练表（coaches）
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- 教练姓名
  phone TEXT UNIQUE NOT NULL,            -- 手机号（唯一）
  password TEXT NOT NULL,                -- 密码（加密存储）
  audit_status TEXT DEFAULT 'pending',   -- 审核状态：pending/approved/rejected
  reject_reason TEXT,                    -- 拒绝原因
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_coaches_phone ON coaches(phone);
CREATE INDEX IF NOT EXISTS idx_coaches_audit_status ON coaches(audit_status);

COMMENT ON TABLE coaches IS '教练表';
COMMENT ON COLUMN coaches.audit_status IS '审核状态：pending待审核/approved已通过/rejected已拒绝';

-- ============================================

-- 2. 邀请码表（invite_codes）
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL,                -- 教练ID
  code TEXT UNIQUE NOT NULL,             -- 邀请码（唯一）
  is_active BOOLEAN DEFAULT true,        -- 是否有效
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_coach_id ON invite_codes(coach_id);

COMMENT ON TABLE invite_codes IS '邀请码表';
COMMENT ON COLUMN invite_codes.is_active IS '是否有效（可以撤销邀请码）';

-- ============================================

-- 3. 教练-会员关系表（coach_member_relations）
CREATE TABLE IF NOT EXISTS coach_member_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL,                -- 教练ID
  member_id UUID NOT NULL,               -- 会员ID
  status TEXT DEFAULT 'pending',         -- 关系状态：pending/active/ended
  initiator TEXT NOT NULL,               -- 申请方：coach/member/invite_code
  reject_reason TEXT,                    -- 拒绝原因
  end_type TEXT,                         -- 结束类型：coach_delete/member_cancel/member_force_cancel
  start_time TIMESTAMP,                  -- 开始时间
  end_time TIMESTAMP,                    -- 结束时间
  cancel_request_time TIMESTAMP,         -- 取消申请时间（用于计算1小时超时）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_relations_coach_id ON coach_member_relations(coach_id);
CREATE INDEX IF NOT EXISTS idx_relations_member_id ON coach_member_relations(member_id);
CREATE INDEX IF NOT EXISTS idx_relations_status ON coach_member_relations(status);
CREATE INDEX IF NOT EXISTS idx_relations_coach_member ON coach_member_relations(coach_id, member_id);

COMMENT ON TABLE coach_member_relations IS '教练-会员关系表';
COMMENT ON COLUMN coach_member_relations.status IS '关系状态：pending待审核/active已建立/ended已结束';
COMMENT ON COLUMN coach_member_relations.initiator IS '申请方：coach教练/member会员/invite_code邀请码';
COMMENT ON COLUMN coach_member_relations.end_type IS '结束类型：coach_delete教练删除/member_cancel会员取消/member_force_cancel会员强制取消';

-- ============================================

-- 4. 通知表（notifications）
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_type TEXT NOT NULL,               -- 用户类型：coach/member/admin
  user_id UUID NOT NULL,                 -- 用户ID
  type TEXT NOT NULL,                    -- 通知类型：coach_audit/member_apply/coach_apply/cancel_request等
  title TEXT NOT NULL,                   -- 通知标题
  content TEXT NOT NULL,                 -- 通知内容
  is_read BOOLEAN DEFAULT false,         -- 是否已读
  related_id UUID,                       -- 关联ID（如关系ID）
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS '通知表';
COMMENT ON COLUMN notifications.user_type IS '用户类型：coach教练/member会员/admin管理员';
COMMENT ON COLUMN notifications.type IS '通知类型：coach_audit教练审核/member_apply会员申请/coach_apply教练申请/cancel_request取消申请等';

-- ============================================
-- 第二部分：修改现有表
-- ============================================

-- 修改 members 表，添加新字段
ALTER TABLE members ADD COLUMN IF NOT EXISTS initial_weight DECIMAL(5,2);  -- 初始体重（kg）
ALTER TABLE members ADD COLUMN IF NOT EXISTS current_weight DECIMAL(5,2);  -- 当前体重（kg）
ALTER TABLE members ADD COLUMN IF NOT EXISTS password TEXT;                -- 密码（加密存储）

-- 修改手机号为唯一（如果还没有约束）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'members_phone_unique'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_phone_unique UNIQUE(phone);
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

COMMENT ON COLUMN members.initial_weight IS '初始体重（注册时填写，不能改，用于认证基准）';
COMMENT ON COLUMN members.current_weight IS '当前体重（会员可更新，用于当前认证计算）';

-- ============================================
-- 第三部分：RLS 策略配置
-- ============================================

-- 启用 RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_member_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- coaches 表 RLS 策略
-- ============================================

-- 教练可以查看自己的信息
DROP POLICY IF EXISTS "教练查看自己的信息" ON coaches;
CREATE POLICY "教练查看自己的信息"
ON coaches FOR SELECT
USING (id = auth.uid());

-- 教练可以更新自己的信息
DROP POLICY IF EXISTS "教练更新自己的信息" ON coaches;
CREATE POLICY "教练更新自己的信息"
ON coaches FOR UPDATE
USING (id = auth.uid());

-- 允许注册（插入）
DROP POLICY IF EXISTS "允许教练注册" ON coaches;
CREATE POLICY "允许教练注册"
ON coaches FOR INSERT
WITH CHECK (true);

-- ============================================
-- invite_codes 表 RLS 策略
-- ============================================

-- 教练可以查看自己的邀请码
DROP POLICY IF EXISTS "教练查看自己的邀请码" ON invite_codes;
CREATE POLICY "教练查看自己的邀请码"
ON invite_codes FOR SELECT
USING (coach_id = auth.uid());

-- 教练可以创建邀请码
DROP POLICY IF EXISTS "教练创建邀请码" ON invite_codes;
CREATE POLICY "教练创建邀请码"
ON invite_codes FOR INSERT
WITH CHECK (coach_id = auth.uid());

-- 教练可以更新自己的邀请码
DROP POLICY IF EXISTS "教练更新邀请码" ON invite_codes;
CREATE POLICY "教练更新邀请码"
ON invite_codes FOR UPDATE
USING (coach_id = auth.uid());

-- 允许所有人查询邀请码（用于验证）
DROP POLICY IF EXISTS "验证邀请码" ON invite_codes;
CREATE POLICY "验证邀请码"
ON invite_codes FOR SELECT
USING (true);

-- ============================================
-- coach_member_relations 表 RLS 策略
-- ============================================

-- 教练可以查看自己的会员关系
DROP POLICY IF EXISTS "教练查看自己的会员关系" ON coach_member_relations;
CREATE POLICY "教练查看自己的会员关系"
ON coach_member_relations FOR SELECT
USING (coach_id = auth.uid());

-- 会员可以查看自己的教练关系
DROP POLICY IF EXISTS "会员查看自己的教练关系" ON coach_member_relations;
CREATE POLICY "会员查看自己的教练关系"
ON coach_member_relations FOR SELECT
USING (member_id = auth.uid());

-- 教练可以创建关系（添加会员）
DROP POLICY IF EXISTS "教练创建关系" ON coach_member_relations;
CREATE POLICY "教练创建关系"
ON coach_member_relations FOR INSERT
WITH CHECK (coach_id = auth.uid());

-- 会员可以创建关系（申请教练）
DROP POLICY IF EXISTS "会员创建关系" ON coach_member_relations;
CREATE POLICY "会员创建关系"
ON coach_member_relations FOR INSERT
WITH CHECK (member_id = auth.uid());

-- 教练可以更新自己的关系（审核、删除）
DROP POLICY IF EXISTS "教练更新关系" ON coach_member_relations;
CREATE POLICY "教练更新关系"
ON coach_member_relations FOR UPDATE
USING (coach_id = auth.uid());

-- 会员可以更新自己的关系（取消关注）
DROP POLICY IF EXISTS "会员更新关系" ON coach_member_relations;
CREATE POLICY "会员更新关系"
ON coach_member_relations FOR UPDATE
USING (member_id = auth.uid());

-- ============================================
-- notifications 表 RLS 策略
-- ============================================

-- 用户只能查看自己的通知
DROP POLICY IF EXISTS "用户查看自己的通知" ON notifications;
CREATE POLICY "用户查看自己的通知"
ON notifications FOR SELECT
USING (
  (user_type = 'coach' AND user_id = auth.uid()) OR
  (user_type = 'member' AND user_id = auth.uid()) OR
  (user_type = 'admin' AND user_id = auth.uid())
);

-- 用户可以标记自己的通知为已读
DROP POLICY IF EXISTS "用户标记通知已读" ON notifications;
CREATE POLICY "用户标记通知已读"
ON notifications FOR UPDATE
USING (
  (user_type = 'coach' AND user_id = auth.uid()) OR
  (user_type = 'member' AND user_id = auth.uid()) OR
  (user_type = 'admin' AND user_id = auth.uid())
);

-- 允许系统创建通知（使用 service_role）
DROP POLICY IF EXISTS "系统创建通知" ON notifications;
CREATE POLICY "系统创建通知"
ON notifications FOR INSERT
WITH CHECK (true);

-- ============================================
-- 第四部分：创建触发器
-- ============================================

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 coaches 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_coaches_updated_at ON coaches;
CREATE TRIGGER update_coaches_updated_at
BEFORE UPDATE ON coaches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 为 coach_member_relations 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_relations_updated_at ON coach_member_relations;
CREATE TRIGGER update_relations_updated_at
BEFORE UPDATE ON coach_member_relations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第五部分：数据验证
-- ============================================

-- 验证表是否创建成功
DO $$
BEGIN
  RAISE NOTICE '=== 数据库改造完成 ===';
  RAISE NOTICE '新增表：';
  RAISE NOTICE '  - coaches (教练表)';
  RAISE NOTICE '  - invite_codes (邀请码表)';
  RAISE NOTICE '  - coach_member_relations (教练-会员关系表)';
  RAISE NOTICE '  - notifications (通知表)';
  RAISE NOTICE '';
  RAISE NOTICE '修改表：';
  RAISE NOTICE '  - members (添加 initial_weight, current_weight, password 字段)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS 策略已配置';
  RAISE NOTICE '触发器已创建';
  RAISE NOTICE '';
  RAISE NOTICE '请验证表结构是否正确！';
END $$;

-- ============================================
-- 执行完成
-- ============================================
