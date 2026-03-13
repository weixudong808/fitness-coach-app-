# Supabase Phone Auth 改造方案（正式版）

## 📋 改造目标

将当前的"自定义认证（手机号+密码）"改造为"Supabase Phone Auth + RLS"，提升系统安全性和用户体验。

---

## 🔍 当前架构分析

### 当前认证方式
- **教练端：** 手机号 + 密码，存储在 `coaches` 表
- **会员端：** 手机号 + 密码，存储在 `members` 表
- **登录状态：** 保存在 localStorage（`userType`, `userId`, `userName`）
- **权限控制：** RLS已禁用（临时方案）

### 当前问题
1. ❌ 密码明文存储（不安全）
2. ❌ RLS已禁用（数据库无权限保护）
3. ❌ 没有使用 Supabase Auth（无法利用官方认证功能）
4. ❌ 无法使用 `auth.uid()` 做权限控制
5. ❌ 无法发送短信验证码

---

## 🎯 改造方案（使用 Supabase Phone Auth）

### 方案概述
1. **使用 Supabase Phone Auth** - 原生支持手机号认证
2. **保留现有表结构** - `coaches` 和 `members` 表继续存储业务数据
3. **建立关联** - 通过 `user_id` 字段关联 Supabase Auth 用户
4. **启用 RLS** - 基于 `auth.uid()` 的安全权限控制
5. **支持短信验证码** - 可选功能，提升安全性

### 架构设计

```
Supabase Phone Auth (auth.users)
    ↓ user_id
    ├─→ coaches 表 (教练业务数据)
    └─→ members 表 (会员业务数据)
```

### 优势
- ✅ 原生支持手机号登录（不需要假邮箱）
- ✅ 可以发送短信验证码（注册/登录/重置密码）
- ✅ 密码自动加密存储
- ✅ 可以用 `auth.uid()` 做 RLS
- ✅ 将来扩展性好（支持多种登录方式）

### 需要配置的服务
- **短信服务商：** 阿里云、腾讯云、Twilio 等
- **成本：** 约 0.03-0.05 元/条短信
- **配置位置：** Supabase Dashboard → Authentication → Providers → Phone

---

## 📝 需要修改的代码

### 1. 数据库改造（SQL脚本）

#### 1.1 添加 user_id 字段

```sql
-- 给 coaches 表添加 user_id 字段
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 给 members 表添加 user_id 字段
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
```

#### 1.2 创建安全的 RLS 策略

```sql
-- ==================== coaches 表 RLS 策略 ====================

-- 删除旧策略
DROP POLICY IF EXISTS "教练可以注册" ON coaches;
DROP POLICY IF EXISTS "允许教练注册" ON coaches;
DROP POLICY IF EXISTS "任何人可以查看已审核的教练" ON coaches;
DROP POLICY IF EXISTS "教练可以更新自己的信息" ON coaches;

-- 启用 RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- 1. 注册时可以插入（注册时还没有 auth.uid()，所以允许插入）
CREATE POLICY "coaches_insert_policy" ON coaches
  FOR INSERT
  WITH CHECK (true);

-- 2. 只能查看已审核的教练（会员查找教练时用）
CREATE POLICY "coaches_select_approved" ON coaches
  FOR SELECT
  USING (audit_status = 'approved');

-- 3. 教练可以查看和更新自己的信息
CREATE POLICY "coaches_select_own" ON coaches
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "coaches_update_own" ON coaches
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. 管理员可以查看和更新所有教练（后续实现）
-- CREATE POLICY "coaches_admin_all" ON coaches
--   FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');


-- ==================== members 表 RLS 策略 ====================

-- 删除旧策略
DROP POLICY IF EXISTS "会员可以注册" ON members;
DROP POLICY IF EXISTS "允许会员注册" ON members;
DROP POLICY IF EXISTS "任何人可以查看会员" ON members;
DROP POLICY IF EXISTS "会员可以更新自己的信息" ON members;

-- 启用 RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 1. 注册时可以插入
CREATE POLICY "members_insert_policy" ON members
  FOR INSERT
  WITH CHECK (true);

-- 2. 会员只能查看和更新自己的信息
CREATE POLICY "members_select_own" ON members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "members_update_own" ON members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. 教练可以查看自己的会员
CREATE POLICY "members_select_by_coach" ON members
  FOR SELECT
  USING (
    id IN (
      SELECT member_id FROM coach_member_relations
      WHERE coach_id IN (
        SELECT id FROM coaches WHERE user_id = auth.uid()
      )
      AND status = 'active'
    )
  );


-- ==================== coach_member_relations 表 RLS 策略 ====================

-- 删除旧策略
DROP POLICY IF EXISTS "允许插入关系" ON coach_member_relations;
DROP POLICY IF EXISTS "教练可以插入关系" ON coach_member_relations;
DROP POLICY IF EXISTS "会员可以插入关系" ON coach_member_relations;
DROP POLICY IF EXISTS "会员可以查看自己的关系" ON coach_member_relations;
DROP POLICY IF EXISTS "教练可以查看自己的关系" ON coach_member_relations;
DROP POLICY IF EXISTS "会员可以更新自己的关系" ON coach_member_relations;
DROP POLICY IF EXISTS "教练可以更新自己的关系" ON coach_member_relations;

-- 启用 RLS
ALTER TABLE coach_member_relations ENABLE ROW LEVEL SECURITY;

-- 1. 教练和会员都可以创建关系
CREATE POLICY "relations_insert_by_coach" ON coach_member_relations
  FOR INSERT
  WITH CHECK (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

CREATE POLICY "relations_insert_by_member" ON coach_member_relations
  FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 2. 教练可以查看和更新自己的关系
CREATE POLICY "relations_select_by_coach" ON coach_member_relations
  FOR SELECT
  USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

CREATE POLICY "relations_update_by_coach" ON coach_member_relations
  FOR UPDATE
  USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 3. 会员可以查看和更新自己的关系
CREATE POLICY "relations_select_by_member" ON coach_member_relations
  FOR SELECT
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "relations_update_by_member" ON coach_member_relations
  FOR UPDATE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );


-- ==================== invite_codes 表 RLS 策略 ====================

-- 删除旧策略
DROP POLICY IF EXISTS "允许插入邀请码" ON invite_codes;
DROP POLICY IF EXISTS "教练可以插入邀请码" ON invite_codes;
DROP POLICY IF EXISTS "任何人可以查看邀请码" ON invite_codes;
DROP POLICY IF EXISTS "教练可以查看自己的邀请码" ON invite_codes;
DROP POLICY IF EXISTS "教练可以更新自己的邀请码" ON invite_codes;

-- 启用 RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- 1. 教练可以创建邀请码
CREATE POLICY "invite_codes_insert_by_coach" ON invite_codes
  FOR INSERT
  WITH CHECK (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 2. 教练可以查看自己的邀请码
CREATE POLICY "invite_codes_select_by_coach" ON invite_codes
  FOR SELECT
  USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 3. 会员可以查看邀请码（用于验证）
CREATE POLICY "invite_codes_select_by_member" ON invite_codes
  FOR SELECT
  USING (is_active = true);

-- 4. 教练可以更新自己的邀请码
CREATE POLICY "invite_codes_update_by_coach" ON invite_codes
  FOR UPDATE
  USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );


-- ==================== notifications 表 RLS 策略 ====================

-- 删除旧策略
DROP POLICY IF EXISTS "允许插入通知" ON notifications;
DROP POLICY IF EXISTS "允许任何人插入通知" ON notifications;
DROP POLICY IF EXISTS "教练可以查看自己的通知" ON notifications;
DROP POLICY IF EXISTS "会员可以查看自己的通知" ON notifications;
DROP POLICY IF EXISTS "教练可以更新自己的通知" ON notifications;
DROP POLICY IF EXISTS "会员可以更新自己的通知" ON notifications;

-- 启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. 系统可以创建通知（暂时允许所有人，后续改为服务端函数）
CREATE POLICY "notifications_insert_policy" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- 2. 教练可以查看和更新自己的通知
CREATE POLICY "notifications_select_by_coach" ON notifications
  FOR SELECT
  USING (
    user_type = 'coach' AND user_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

CREATE POLICY "notifications_update_by_coach" ON notifications
  FOR UPDATE
  USING (
    user_type = 'coach' AND user_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_type = 'coach' AND user_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- 3. 会员可以查看和更新自己的通知
CREATE POLICY "notifications_select_by_member" ON notifications
  FOR SELECT
  USING (
    user_type = 'member' AND user_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "notifications_update_by_member" ON notifications
  FOR UPDATE
  USING (
    user_type = 'member' AND user_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_type = 'member' AND user_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );
```

---

### 2. 前端代码改造

#### 2.1 api.js - 教练注册（使用 Supabase Auth）

**当前代码（第13-50行）：**
```javascript
export async function registerCoach(coachData) {
  try {
    const { name, phone, password } = coachData

    // 检查手机号是否已注册
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingCoach) {
      return { success: false, error: '该手机号已注册' }
    }

    // 插入教练数据（状态为待审核）
    const { data, error } = await supabase
      .from('coaches')
      .insert([
        {
          name,
          phone,
          password, // 明文密码
          audit_status: 'pending'
        }
      ])
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

**改造后代码（使用 Phone Auth）：**
```javascript
export async function registerCoach(coachData) {
  try {
    const { name, phone, password } = coachData

    // 1. 使用 Supabase Phone Auth 注册用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: `+86${phone}`,  // 中国区号 +86
      password: password,
      options: {
        data: {
          user_type: 'coach',
          name: name
        }
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { success: false, error: '该手机号已注册' }
      }
      return { success: false, error: authError.message }
    }

    // 2. 在 coaches 表插入业务数据
    const { data, error } = await supabase
      .from('coaches')
      .insert([
        {
          user_id: authData.user.id,  // 关联 Supabase Auth 用户
          name,
          phone,
          audit_status: 'pending'
        }
      ])
      .select()
      .single()

    if (error) {
      // 如果插入失败，删除 Auth 用户（回滚）
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**说明：**
- 使用 `phone: '+86${phone}'` 代替 `email`
- 手机号需要加国际区号（中国是 +86）
- 例如：13800138000 → +8613800138000

#### 2.2 api.js - 教练登录（使用 Supabase Auth）

**当前代码（第58-87行）：**
```javascript
export async function loginCoach(phone, password) {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('phone', phone)
      .eq('password', password)
      .single()

    if (error || !data) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 检查审核状态
    if (data.audit_status === 'pending') {
      return { success: false, error: '账号审核中，请等待管理员审核' }
    }

    if (data.audit_status === 'rejected') {
      return {
        success: false,
        error: `账号审核未通过，原因：${data.reject_reason || '未说明'}`
      }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**改造后代码（使用 Phone Auth）：**
```javascript
export async function loginCoach(phone, password) {
  try {
    // 1. 使用 Supabase Phone Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      phone: `+86${phone}`,  // 中国区号 +86
      password: password
    })

    if (authError) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 2. 获取教练业务数据
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (error || !data) {
      return { success: false, error: '教练信息不存在' }
    }

    // 3. 检查审核状态
    if (data.audit_status === 'pending') {
      await supabase.auth.signOut()  // 登出
      return { success: false, error: '账号审核中，请等待管理员审核' }
    }

    if (data.audit_status === 'rejected') {
      await supabase.auth.signOut()  // 登出
      return {
        success: false,
        error: `账号审核未通过，原因：${data.reject_reason || '未说明'}`
      }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

#### 2.3 api.js - 会员注册（使用 Supabase Auth）

**当前代码（第168-220行）：**
```javascript
export async function registerMember(memberData) {
  try {
    const { name, phone, password, gender, initial_weight, invite_code } = memberData

    // 检查手机号是否已注册
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingMember) {
      return { success: false, error: '该手机号已注册' }
    }

    // 插入会员数据
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([
        {
          name,
          phone,
          password, // 明文密码
          gender,
          initial_weight,
          current_weight: initial_weight
        }
      ])
      .select()
      .single()

    if (memberError) {
      return { success: false, error: memberError.message }
    }

    // 如果有邀请码，自动建立会员-教练关系
    if (invite_code) {
      const relationResult = await useInviteCode(member.id, invite_code)
      if (!relationResult.success) {
        return {
          success: true,
          data: member,
          warning: `会员注册成功，但邀请码无效：${relationResult.error}`
        }
      }
    }

    return { success: true, data: member }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**改造后代码（使用 Phone Auth）：**
```javascript
export async function registerMember(memberData) {
  try {
    const { name, phone, password, gender, initial_weight, invite_code } = memberData

    // 1. 使用 Supabase Phone Auth 注册用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: `+86${phone}`,  // 中国区号 +86
      password: password,
      options: {
        data: {
          user_type: 'member',
          name: name
        }
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { success: false, error: '该手机号已注册' }
      }
      return { success: false, error: authError.message }
    }

    // 2. 在 members 表插入业务数据
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([
        {
          user_id: authData.user.id,  // 关联 Supabase Auth 用户
          name,
          phone,
          gender,
          initial_weight,
          current_weight: initial_weight
        }
      ])
      .select()
      .single()

    if (memberError) {
      // 如果插入失败，删除 Auth 用户（回滚）
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: memberError.message }
    }

    // 3. 如果有邀请码，自动建立会员-教练关系
    if (invite_code) {
      const relationResult = await useInviteCode(member.id, invite_code)
      if (!relationResult.success) {
        return {
          success: true,
          data: member,
          warning: `会员注册成功，但邀请码无效：${relationResult.error}`
        }
      }
    }

    return { success: true, data: member }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

#### 2.4 api.js - 会员登录（使用 Supabase Auth）

**当前代码（第228-245行）：**
```javascript
export async function loginMember(phone, password) {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .eq('password', password)
      .single()

    if (error || !data) {
      return { success: false, error: '手机号或密码错误' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**改造后代码（使用 Phone Auth）：**
```javascript
export async function loginMember(phone, password) {
  try {
    // 1. 使用 Supabase Phone Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      phone: `+86${phone}`,  // 中国区号 +86
      password: password
    })

    if (authError) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 2. 获取会员业务数据
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (error || !data) {
      return { success: false, error: '会员信息不存在' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

#### 2.5 CoachAuth.vue - 教练登录页面（localStorage 改造）

**当前代码（第149-161行）：**
```javascript
if (result.success) {
  // 保存教练信息到 localStorage
  localStorage.setItem('userType', 'coach')
  localStorage.setItem('userId', result.data.id)
  localStorage.setItem('userName', result.data.name)
  localStorage.setItem('coachData', JSON.stringify(result.data))

  successMessage.value = '登录成功！'

  // 跳转到教练端首页
  setTimeout(() => {
    router.push('/coach/invite-code')
  }, 1000)
}
```

**改造后代码：**
```javascript
if (result.success) {
  // Supabase Auth 会自动管理 session，不需要手动保存到 localStorage
  // 只保存业务数据
  localStorage.setItem('userType', 'coach')
  localStorage.setItem('userId', result.data.id)  // 这是 coaches 表的 id
  localStorage.setItem('userName', result.data.name)
  localStorage.setItem('coachData', JSON.stringify(result.data))

  successMessage.value = '登录成功！'

  // 跳转到教练端首页
  setTimeout(() => {
    router.push('/coach/invite-code')
  }, 1000)
}
```

**说明：** Supabase Auth 会自动管理 session，不需要手动保存 token。

#### 2.6 MemberAuth.vue - 会员登录页面（localStorage 改造）

**当前代码（第185-197行）：**
```javascript
if (result.success) {
  // 保存会员信息到 localStorage
  localStorage.setItem('userType', 'member')
  localStorage.setItem('userId', result.data.id)
  localStorage.setItem('userName', result.data.name)
  localStorage.setItem('userGender', result.data.gender)

  successMessage.value = '登录成功！'

  // 跳转到会员端首页
  setTimeout(() => {
    router.push('/member/home')
  }, 1000)
}
```

**改造后代码：**
```javascript
if (result.success) {
  // Supabase Auth 会自动管理 session，不需要手动保存到 localStorage
  // 只保存业务数据
  localStorage.setItem('userType', 'member')
  localStorage.setItem('userId', result.data.id)  // 这是 members 表的 id
  localStorage.setItem('userName', result.data.name)
  localStorage.setItem('userGender', result.data.gender)

  successMessage.value = '登录成功！'

  // 跳转到会员端首页
  setTimeout(() => {
    router.push('/member/home')
  }, 1000)
}
```

#### 2.7 退出登录（需要调用 Supabase Auth）

**所有退出登录的地方都需要改为：**
```javascript
// 旧代码
const handleLogout = () => {
  localStorage.removeItem('userType')
  localStorage.removeItem('userId')
  localStorage.removeItem('userName')
  localStorage.removeItem('userGender')
  localStorage.removeItem('memberData')
  router.push('/member/auth')
}

// 新代码
const handleLogout = async () => {
  // 1. 调用 Supabase Auth 登出
  await supabase.auth.signOut()

  // 2. 清除 localStorage
  localStorage.removeItem('userType')
  localStorage.removeItem('userId')
  localStorage.removeItem('userName')
  localStorage.removeItem('userGender')
  localStorage.removeItem('memberData')
  localStorage.removeItem('coachData')

  // 3. 跳转到登录页
  router.push('/member/auth')
}
```

---

## ⚠️ 重要注意事项

### 1. 配置 Supabase Phone Auth

**步骤：**
1. 登录 Supabase Dashboard
2. 进入 Authentication → Providers
3. 启用 Phone 认证
4. 配置短信服务商（推荐国内服务商）：
   - **阿里云短信服务**：https://www.aliyun.com/product/sms
   - **腾讯云短信服务**：https://cloud.tencent.com/product/sms
   - **Twilio**（国际）：https://www.twilio.com/

**配置示例（阿里云）：**
```
Provider: Aliyun SMS
Access Key ID: 你的AccessKeyId
Access Key Secret: 你的AccessKeySecret
Sign Name: 你的签名
Template Code: 你的模板代码
```

### 2. 手机号格式
- 必须加国际区号：`+86${phone}`
- 例如：13800138000 → +8613800138000
- 前端输入时只需要输入手机号，后端自动加 +86

### 3. 短信验证码（可选功能）

**注册时发送验证码：**
```javascript
// 发送验证码
const { data, error } = await supabase.auth.signInWithOtp({
  phone: `+86${phone}`
})

// 用户输入验证码后验证
const { data, error } = await supabase.auth.verifyOtp({
  phone: `+86${phone}`,
  token: '123456',  // 用户输入的验证码
  type: 'sms'
})
```

**说明：** 如果不想用验证码，可以继续用密码登录（就像现在这样）

### 4. 旧用户迁移
- 现有用户需要重新注册（因为旧密码是明文，无法迁移到 Supabase Auth）
- 或者提供"重置密码"功能，让旧用户设置新密码

### 5. 管理员账号
- 管理员账号（admin/admin123）需要单独处理
- 可以在 Supabase Auth 中设置特殊角色
- 或者继续用自定义认证（不用 Phone Auth）

### 6. 测试步骤
1. 先配置 Supabase Phone Auth（配置短信服务商）
2. 在测试环境执行 SQL 脚本
3. 修改前端代码
4. 清除浏览器缓存和 localStorage
5. 重新注册测试账号（会收到短信验证码，如果启用了的话）
6. 测试所有功能

### 7. 成本估算
- **短信费用：** 约 0.03-0.05 元/条
- **预估：** 1000 个用户注册 = 30-50 元
- **说明：** 如果只用密码登录（不用验证码），不会产生短信费用

---

## 📋 改造清单

### 第一步：配置 Supabase Phone Auth
- [ ] 登录 Supabase Dashboard
- [ ] 启用 Phone 认证
- [ ] 配置短信服务商（阿里云/腾讯云/Twilio）
- [ ] 测试短信发送是否正常

### 第二步：数据库改造
- [ ] 执行 SQL 脚本（添加 user_id 字段）
- [ ] 执行 SQL 脚本（创建 RLS 策略）
- [ ] 验证 RLS 策略是否生效

### 第三步：前端代码改造
- [ ] 修改 api.js - registerCoach（改用 Phone Auth）
- [ ] 修改 api.js - loginCoach（改用 Phone Auth）
- [ ] 修改 api.js - registerMember（改用 Phone Auth）
- [ ] 修改 api.js - loginMember（改用 Phone Auth）
- [ ] 修改 CoachAuth.vue - 登录逻辑
- [ ] 修改 MemberAuth.vue - 登录逻辑
- [ ] 修改所有退出登录的地方（调用 supabase.auth.signOut()）
- [ ] 检查所有使用 localStorage 的地方

### 第四步：测试验证
- [ ] 教练注册（测试手机号格式 +86）
- [ ] 教练登录
- [ ] 会员注册
- [ ] 会员登录
- [ ] 邀请码功能
- [ ] 教练-会员关系
- [ ] 权限控制（RLS）
- [ ] 退出登录
- [ ] 短信验证码（如果启用）

---

## 🎯 下一步

**东哥，这个方案已经更新为使用 Supabase Phone Auth：**

### 核心改动
1. ✅ 不再使用假邮箱（`${phone}@fitness.app`）
2. ✅ 改用 `phone: '+86${phone}'` 原生手机号认证
3. ✅ 支持短信验证码（可选）
4. ✅ 将来扩展性更好

### 需要你做的
1. **先配置短信服务商**（阿里云/腾讯云）
   - 注册账号
   - 开通短信服务
   - 获取 Access Key
   - 在 Supabase 配置

2. **确认方案没问题后，我开始：**
   - 创建 SQL 脚本
   - 修改前端代码
   - 提供测试步骤

你觉得这个方案怎么样？如果没问题，我就开始创建 SQL 脚本和修改代码。
