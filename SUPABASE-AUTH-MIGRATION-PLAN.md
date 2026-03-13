# Supabase Auth 改造方案

## 📊 当前架构分析

### 当前认证方式
- **自定义认证**：手机号 + 密码存储在数据库
- **密码存储**：明文存储（不安全）
- **会话管理**：localStorage 存储用户信息
- **权限控制**：RLS 已禁用（临时方案）

### 存在的问题
1. ❌ 密码明文存储，不安全
2. ❌ 没有使用 Supabase Auth，无法使用 RLS 的 `auth.uid()`
3. ❌ 会话管理不规范，容易被篡改
4. ❌ 没有密码重置、邮箱验证等功能

---

## 🎯 改造目标

### 使用 Supabase Auth
- ✅ 密码加密存储
- ✅ 标准的会话管理
- ✅ 支持 RLS 的 `auth.uid()`
- ✅ 内置密码重置、邮箱验证等功能

### 保持现有功能
- ✅ 手机号登录（作为用户名）
- ✅ 教练/会员分离
- ✅ 所有现有功能不变

---

## 📋 改造步骤

### 第一步：数据库改造

#### 1.1 添加 user_id 字段关联 auth.users
```sql
-- 给 coaches 表添加 user_id
ALTER TABLE coaches ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 给 members 表添加 user_id
ALTER TABLE members ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 创建索引
CREATE INDEX idx_coaches_user_id ON coaches(user_id);
CREATE INDEX idx_members_user_id ON members(user_id);
```

#### 1.2 保留现有字段（兼容过渡期）
- 保留 `phone` 和 `password` 字段
- 新用户使用 Supabase Auth
- 旧用户可以继续用旧方式登录，首次登录后迁移

---

### 第二步：修改认证逻辑

#### 2.1 注册流程
**旧流程：**
1. 检查手机号是否存在
2. 插入 coaches/members 表
3. 保存到 localStorage

**新流程：**
1. 使用 `supabase.auth.signUp()` 创建 auth.users 记录
   - email: `{phone}@fitness.local`（虚拟邮箱）
   - password: 用户输入的密码
2. 获取 `auth.uid()`
3. 插入 coaches/members 表，关联 `user_id`
4. Supabase 自动管理会话

#### 2.2 登录流程
**旧流程：**
1. 查询 coaches/members 表
2. 比对手机号和密码
3. 保存到 localStorage

**新流程：**
1. 使用 `supabase.auth.signInWithPassword()` 登录
   - email: `{phone}@fitness.local`
   - password: 用户输入的密码
2. Supabase 自动管理会话
3. 根据 `auth.uid()` 查询 coaches/members 表

#### 2.3 会话管理
**旧方式：**
```javascript
localStorage.setItem('userId', user.id)
localStorage.setItem('userType', 'member')
```

**新方式：**
```javascript
// Supabase 自动管理会话
const { data: { session } } = await supabase.auth.getSession()
const userId = session.user.id  // 这就是 auth.uid()
```

---

### 第三步：RLS 策略改造

#### 3.1 启用 RLS
```sql
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_member_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

#### 3.2 设计安全的 RLS 策略

**coaches 表：**
```sql
-- 教练可以查看自己的信息
CREATE POLICY "coaches_select_own" ON coaches
  FOR SELECT USING (user_id = auth.uid());

-- 教练可以更新自己的信息
CREATE POLICY "coaches_update_own" ON coaches
  FOR UPDATE USING (user_id = auth.uid());

-- 任何人可以查看已审核的教练（用于会员查找教练）
CREATE POLICY "coaches_select_approved" ON coaches
  FOR SELECT USING (audit_status = 'approved');

-- 注册时可以插入（user_id 必须是自己）
CREATE POLICY "coaches_insert_own" ON coaches
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

**members 表：**
```sql
-- 会员可以查看自己的信息
CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (user_id = auth.uid());

-- 会员可以更新自己的信息
CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (user_id = auth.uid());

-- 注册时可以插入（user_id 必须是自己）
CREATE POLICY "members_insert_own" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 教练可以查看自己的会员
CREATE POLICY "members_select_by_coach" ON members
  FOR SELECT USING (
    id IN (
      SELECT member_id FROM coach_member_relations
      WHERE coach_id IN (
        SELECT id FROM coaches WHERE user_id = auth.uid()
      )
    )
  );
```

**invite_codes 表：**
```sql
-- 教练可以查看和管理自己的邀请码
CREATE POLICY "invite_codes_all_own" ON invite_codes
  FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 任何人可以查看有效的邀请码（用于验证）
CREATE POLICY "invite_codes_select_active" ON invite_codes
  FOR SELECT USING (is_active = true);
```

**coach_member_relations 表：**
```sql
-- 教练可以查看自己的关系
CREATE POLICY "relations_select_by_coach" ON coach_member_relations
  FOR SELECT USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 会员可以查看自己的关系
CREATE POLICY "relations_select_by_member" ON coach_member_relations
  FOR SELECT USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 会员可以申请关系
CREATE POLICY "relations_insert_by_member" ON coach_member_relations
  FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 教练可以更新关系状态
CREATE POLICY "relations_update_by_coach" ON coach_member_relations
  FOR UPDATE USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );
```

---

### 第四步：前端代码改造

#### 4.1 修改 api.js 的认证函数

**registerCoach：**
```javascript
export async function registerCoach(coachData) {
  try {
    const { name, phone, password } = coachData

    // 1. 使用 Supabase Auth 注册
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `${phone}@fitness.local`,
      password: password,
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    // 2. 插入 coaches 表
    const { data, error } = await supabase
      .from('coaches')
      .insert([{
        user_id: authData.user.id,
        name,
        phone,
        audit_status: 'pending'
      }])
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**loginCoach：**
```javascript
export async function loginCoach(phone, password) {
  try {
    // 1. 使用 Supabase Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: `${phone}@fitness.local`,
      password: password,
    })

    if (authError) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 2. 查询教练信息
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (error || !data) {
      return { success: false, error: '未找到教练信息' }
    }

    // 3. 检查审核状态
    if (data.audit_status !== 'approved') {
      return { success: false, error: '账号待审核，请等待管理员审核' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

#### 4.2 修改前端页面的会话管理

**不再使用 localStorage 存储用户信息，改用 Supabase Session：**
```javascript
// 获取当前用户
const { data: { session } } = await supabase.auth.getSession()
if (session) {
  const userId = session.user.id  // 这就是 auth.uid()
}

// 退出登录
await supabase.auth.signOut()
```

---

### 第五步：数据迁移

#### 5.1 迁移现有用户到 Supabase Auth

**迁移脚本（需要 service_role key）：**
```javascript
// 这个脚本需要在后端运行，使用 service_role key
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY'  // 注意：这是 service_role key，不是 anon key
)

async function migrateUsers() {
  // 1. 迁移教练
  const { data: coaches } = await supabase
    .from('coaches')
    .select('*')
    .is('user_id', null)

  for (const coach of coaches) {
    // 创建 auth.users 记录
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: `${coach.phone}@fitness.local`,
      password: coach.password || '123456',  // 使用原密码或默认密码
      email_confirm: true
    })

    if (!error) {
      // 更新 coaches 表的 user_id
      await supabase
        .from('coaches')
        .update({ user_id: authData.user.id })
        .eq('id', coach.id)
    }
  }

  // 2. 迁移会员（同样的逻辑）
  // ...
}
```

---

## ⚠️ 注意事项

### 1. 邮箱问题
- 使用虚拟邮箱 `{phone}@fitness.local`
- 不需要真实邮箱验证
- 在 Supabase Dashboard 关闭邮箱验证：
  - Authentication → Settings → Email Auth
  - 取消勾选 "Confirm email"

### 2. 兼容性
- 保留旧的 `phone` 和 `password` 字段
- 可以支持旧用户逐步迁移
- 新用户直接使用 Supabase Auth

### 3. 管理员账号
- 管理员账号可以继续用旧方式
- 或者创建一个特殊的 admin 角色

---

## 📅 实施时间表

- **今天**：创建数据库迁移脚本
- **明天上午**：修改前端认证逻辑
- **明天下午**：实施 RLS 策略
- **后天**：测试验证

---

## 🔄 回滚方案

如果改造失败，可以快速回滚：
1. 禁用 RLS
2. 恢复使用旧的认证逻辑
3. 删除 `user_id` 字段

---

## ✅ 改造完成后的好处

1. ✅ 密码加密存储，安全性提升
2. ✅ 使用标准的 Supabase Auth，功能更强大
3. ✅ RLS 策略生效，数据库权限控制严格
4. ✅ 支持密码重置、邮箱验证等功能
5. ✅ 会话管理更规范，不易被篡改
