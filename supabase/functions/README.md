# Supabase Edge Functions 部署指南

## 📋 已创建的 Edge Functions

### 1. admin-audit-coach
**功能：** 管理员审核教练
**路径：** `supabase/functions/admin-audit-coach/index.ts`
**权限：** 使用 service_role，绕过 RLS

**请求示例：**
```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/admin-audit-coach', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer admin-secret-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    coachId: 'coach-uuid',
    status: 'approved', // 或 'rejected'
    rejectReason: '拒绝原因'  // 可选
  })
})
```

### 2. create-notification
**功能：** 创建通知
**路径：** `supabase/functions/create-notification/index.ts`
**权限：** 使用 service_role，绕过 RLS

**请求示例：**
```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/create-notification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_type: 'coach',  // 或 'member'
    user_id: 'user-uuid',
    type: 'member_apply',
    content: '通知内容',
    related_id: 'relation-uuid'  // 可选
  })
})
```

### 3. delete-auth-user
**功能：** 删除认证用户（用于注册失败回滚）
**路径：** `supabase/functions/delete-auth-user/index.ts`
**权限：** 使用 service_role

**请求示例：**
```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/delete-auth-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'auth-user-uuid'
  })
})
```

---

## 🚀 部署步骤

### 前置条件
1. 安装 Supabase CLI
   ```bash
   npm install -g supabase
   ```

2. 登录 Supabase
   ```bash
   supabase login
   ```

3. 关联项目
   ```bash
   supabase link --project-ref your-project-ref
   ```

### 部署所有函数
```bash
# 进入项目目录
cd /Users/quhongfei/Documents/code/闲聊/fitness-coach-app

# 部署所有函数
supabase functions deploy admin-audit-coach
supabase functions deploy create-notification
supabase functions deploy delete-auth-user
```

### 设置环境变量

**必须设置的环境变量：**

```bash
# 内部密钥（用于 create-notification 和 delete-auth-user）
# 用于服务端内部调用，不要暴露给前端
supabase secrets set INTERNAL_SECRET=your-strong-internal-secret
```

**说明：**
- `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 会自动注入，不需要手动设置
- `INTERNAL_SECRET` 只在服务端使用，不要暴露给前端
- 管理员认证已改用 Supabase Auth + JWT，不再需要 `ADMIN_TOKEN`

---

## 🔧 本地测试

### 启动本地 Supabase
```bash
supabase start
```

### 本地运行函数
```bash
# 运行单个函数
supabase functions serve admin-audit-coach --env-file ./supabase/.env.local

# 运行所有函数
supabase functions serve
```

### 测试函数
```bash
# 测试 admin-audit-coach
curl -i --location --request POST 'http://localhost:54321/functions/v1/admin-audit-coach' \
  --header 'Authorization: Bearer admin-secret-token' \
  --header 'Content-Type: application/json' \
  --data '{"coachId":"xxx","status":"approved"}'

# 测试 create-notification
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-notification' \
  --header 'Content-Type: application/json' \
  --data '{"user_type":"coach","user_id":"xxx","type":"test","content":"测试通知"}'

# 测试 delete-auth-user
curl -i --location --request POST 'http://localhost:54321/functions/v1/delete-auth-user' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"xxx"}'
```

---

## 📝 前端调用示例

### 创建 API 辅助函数

在 `src/lib/edge-functions.js` 中：

```javascript
// 获取 Supabase 项目 URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// 管理员审核教练
export async function adminAuditCoach(coachId, status, rejectReason = '') {
  try {
    const adminToken = localStorage.getItem('adminToken') || 'admin-secret-token'

    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-audit-coach`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coachId, status, rejectReason })
    })

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// 创建通知
export async function createNotification(notificationData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationData)
    })

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// 删除认证用户（内部使用，用于注册失败回滚）
export async function deleteAuthUser(userId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    })

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

---

## ⚠️ 注意事项

### 1. 安全性（重要！）
- **管理员认证已改用 Supabase Auth + JWT**
  - 管理员必须在 Supabase Auth 中注册
  - 在 `user_metadata` 或 `app_metadata` 中设置 `role: 'admin'`
  - Edge Function 会校验 JWT 中的 admin 角色
  - 不再使用共享静态 token

- **INTERNAL_SECRET 必须设置**
  - 用于服务端内部调用（create-notification、delete-auth-user）
  - 不要暴露给前端
  - 不要在前端代码中硬编码

- **service_role key 只在服务端使用**
  - 不要暴露给前端
  - 不要在前端代码中使用

- **前端只能调用 admin-audit-coach**
  - `create-notification` 和 `delete-auth-user` 只能在服务端调用
  - 前端不应该有这两个函数的调用权限

### 2. 管理员账号设置
**如何创建管理员账号：**

1. 在 Supabase Dashboard 创建用户
   - 进入 Authentication → Users
   - 点击 "Add user"
   - 输入邮箱和密码（例如：admin@fitness.app）

2. 设置 admin 角色
   - 点击用户进入详情页
   - 在 "User Metadata" 或 "App Metadata" 中添加：
     ```json
     {
       "role": "admin"
     }
     ```

3. 前端登录
   - 使用邮箱和密码登录
   - 系统会自动校验 admin 角色

### 3. CORS
- 所有函数已配置 CORS，允许跨域请求
- 生产环境建议限制 `Access-Control-Allow-Origin` 到你的域名

### 4. 错误处理
- 所有函数都返回统一格式：`{ success: boolean, data?: any, error?: string }`
- 前端调用时要检查 `success` 字段
- 401 错误表示未认证，403 错误表示无权限，500 错误表示服务未配置

### 5. 环境变量
- 本地测试：在 `supabase/.env.local` 设置
- 生产环境：用 `supabase secrets set` 设置

---

## 🎯 下一步

1. **创建管理员账号**
   - 在 Supabase Dashboard → Authentication → Users 创建用户
   - 邮箱：admin@fitness.app（或其他邮箱）
   - 在 User Metadata 中添加：`{ "role": "admin" }`

2. **部署函数到 Supabase**
   ```bash
   supabase functions deploy admin-audit-coach
   supabase functions deploy create-notification
   supabase functions deploy delete-auth-user
   ```

3. **设置环境变量**
   ```bash
   supabase secrets set INTERNAL_SECRET=your-strong-internal-secret
   ```

4. **测试功能**
   - 用管理员账号登录
   - 测试审核教练功能
   - 测试通知创建功能
