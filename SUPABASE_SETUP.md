# Supabase 数据库设置指南

## 第一步：注册Supabase账号

1. 访问 https://supabase.com
2. 点击 "Start your project" 或 "Sign Up"
3. 使用GitHub账号或邮箱注册（推荐使用GitHub，更方便）
4. 验证邮箱（如果使用邮箱注册）

## 第二步：创建新项目

1. 登录后，点击 "New Project"
2. 填写项目信息：
   - **Organization**: 选择或创建一个组织
   - **Name**: 输入项目名称，例如 "fitness-coach"
   - **Database Password**: 设置一个强密码（请记住这个密码）
   - **Region**: 选择 "Northeast Asia (Tokyo)" 或 "Southeast Asia (Singapore)"（离中国较近）
3. 点击 "Create new project"
4. 等待项目创建完成（大约1-2分钟）

## 第三步：获取API密钥

1. 项目创建完成后，点击左侧菜单的 "Settings"（设置图标）
2. 点击 "API"
3. 找到以下两个值：
   - **Project URL**: 类似 `https://xxxxx.supabase.co`
   - **anon public**: 一串很长的密钥

4. 在项目根目录创建 `.env` 文件，填入这些值：

```
VITE_SUPABASE_URL=你的Project URL
VITE_SUPABASE_ANON_KEY=你的anon public密钥
```

## 第四步：创建数据库表

### 方法1：使用SQL编辑器（推荐）

1. 点击左侧菜单的 "SQL Editor"
2. 点击 "New query"
3. 复制下面的SQL代码，粘贴到编辑器中
4. 点击 "Run" 执行

```sql
-- 1. 创建会员信息表
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  age INTEGER NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  height NUMERIC(5,2),
  initial_weight NUMERIC(5,2),
  initial_body_fat NUMERIC(4,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建用户角色表
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建训练计划模板表
CREATE TABLE training_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建训练阶段表
CREATE TABLE training_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES training_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  duration_weeks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建训练日表
CREATE TABLE training_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID REFERENCES training_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建动作库表
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 创建训练日动作表
CREATE TABLE training_day_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  training_day_id UUID REFERENCES training_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  weight_suggestion TEXT,
  rest_seconds INTEGER,
  notes TEXT,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 创建会员训练计划表
CREATE TABLE member_training_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  template_id UUID REFERENCES training_templates(id),
  start_date DATE NOT NULL,
  current_phase_id UUID REFERENCES training_phases(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 创建训练记录表
CREATE TABLE training_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  training_day_id UUID REFERENCES training_days(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 10. 创建动作完成记录表
CREATE TABLE exercise_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  training_record_id UUID REFERENCES training_records(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  actual_weight NUMERIC(6,2),
  actual_reps INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. 创建身体数据表
CREATE TABLE body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  weight NUMERIC(5,2),
  body_fat NUMERIC(4,2),
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_training_phases_template_id ON training_phases(template_id);
CREATE INDEX idx_training_days_phase_id ON training_days(phase_id);
CREATE INDEX idx_training_day_exercises_training_day_id ON training_day_exercises(training_day_id);
CREATE INDEX idx_member_training_plans_member_id ON member_training_plans(member_id);
CREATE INDEX idx_training_records_member_id ON training_records(member_id);
CREATE INDEX idx_exercise_records_training_record_id ON exercise_records(training_record_id);
CREATE INDEX idx_body_measurements_member_id ON body_measurements(member_id);
```

### 方法2：使用Table Editor（可视化方式）

如果你不熟悉SQL，也可以使用可视化界面创建表：

1. 点击左侧菜单的 "Table Editor"
2. 点击 "New table"
3. 根据上面的表结构，逐个创建表和字段

## 第五步：设置行级安全策略（RLS）

为了保护数据安全，需要设置访问权限：

1. 在 SQL Editor 中执行以下代码：

```sql
-- 启用行级安全
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- 会员表策略：教练可以查看所有，会员只能查看自己
CREATE POLICY "教练可以查看所有会员" ON members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

CREATE POLICY "会员可以查看自己的信息" ON members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "教练可以插入会员" ON members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

CREATE POLICY "教练可以更新会员" ON members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

CREATE POLICY "教练可以删除会员" ON members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

-- 用户角色表策略：所有人都可以查看
CREATE POLICY "所有人可以查看角色" ON user_roles
  FOR SELECT
  USING (true);

-- 训练模板策略：教练可以管理
CREATE POLICY "教练可以管理训练模板" ON training_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'coach'
    )
  );

-- 其他表的策略（简化版，允许认证用户访问）
CREATE POLICY "认证用户可以访问训练阶段" ON training_phases FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "认证用户可以访问训练日" ON training_days FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "认证用户可以访问动作库" ON exercises FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "认证用户可以访问训练日动作" ON training_day_exercises FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "认证用户可以访问会员训练计划" ON member_training_plans FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "认证用户可以访问训练记录" ON training_records FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "认证用户可以访问动作记录" ON exercise_records FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "认证用户可以访问身体数据" ON body_measurements FOR ALL USING (auth.uid() IS NOT NULL);
```

## 第六步：创建测试用户

1. 点击左侧菜单的 "Authentication"
2. 点击 "Users"
3. 点击 "Add user" -> "Create new user"
4. 填写：
   - Email: 你的邮箱（例如 coach@test.com）
   - Password: 设置密码（至少6位）
   - Auto Confirm User: 勾选（这样不需要邮箱验证）
5. 点击 "Create user"

6. 创建用户后，需要在 `user_roles` 表中添加角色：
   - 在 SQL Editor 中执行：

```sql
-- 将用户设置为教练（替换 'user_id' 为实际的用户ID）
INSERT INTO user_roles (user_id, role)
VALUES ('你的用户ID', 'coach');
```

用户ID可以在 Authentication -> Users 页面找到。

## 第七步：测试连接

1. 确保 `.env` 文件已经创建并填写了正确的值
2. 重启开发服务器：
   ```bash
   npm run dev
   ```
3. 打开浏览器访问 http://localhost:5173
4. 使用刚才创建的测试账号登录

## 常见问题

### Q: 找不到 Project URL 和 API Key？
A: 在项目页面，点击左侧的 Settings（齿轮图标）-> API，就能看到。

### Q: 执行SQL时报错？
A: 确保按顺序执行，因为有些表依赖其他表。如果出错，可以删除所有表后重新执行。

### Q: 登录时提示"Invalid login credentials"？
A: 检查：
1. 用户是否已创建
2. 密码是否正确
3. 是否勾选了"Auto Confirm User"

### Q: 数据库免费版有什么限制？
A:
- 500MB 数据库存储
- 50,000 行数据
- 2GB 文件存储
- 对于个人使用完全足够

## 下一步

数据库设置完成后，你就可以：
1. 启动项目：`npm run dev`
2. 访问 http://localhost:5173
3. 使用测试账号登录
4. 开始添加会员和管理训练计划

## 需要帮助？

如果遇到问题，可以：
1. 查看 Supabase 官方文档：https://supabase.com/docs
2. 查看项目的 README.md 文件
3. 向我提问
