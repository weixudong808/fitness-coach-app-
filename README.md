# 健身教练会员管理系统

一个专为健身私人教练设计的会员管理系统，帮助教练管理会员信息、制定训练计划、跟踪会员进步。

## 功能特点

### 教练端
- ✅ 会员管理（添加、编辑、查看会员信息）
- 🚧 训练计划模板管理（创建和编辑训练计划）
- 🚧 为会员分配训练计划
- 🚧 查看会员训练记录和进步数据

### 会员端
- 🚧 查看个人训练计划
- 🚧 训练打卡与记录
- 🚧 查看个人进步数据（体重、体脂、力量提升等）
- 🚧 更新身体数据

> ✅ 已完成 | 🚧 开发中

## 技术栈

- **前端框架**: Vue 3 + Vite
- **UI组件库**: Element Plus
- **路由管理**: Vue Router
- **状态管理**: Pinia
- **后端服务**: Supabase（云数据库 + 用户认证）
- **部署**: Vercel（计划中）

## 快速开始

### 1. 环境要求

- Node.js 18+
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 配置Supabase

请按照 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 文档完成以下步骤：

1. 注册Supabase账号
2. 创建新项目
3. 获取API密钥
4. 创建数据库表
5. 设置访问权限
6. 创建测试用户

### 4. 配置环境变量

复制 `.env.example` 文件为 `.env`：

```bash
cp .env.example .env
```

然后编辑 `.env` 文件，填入你的Supabase配置：

```
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可看到登录页面。

### 6. 登录测试

使用在Supabase中创建的测试账号登录：
- 教练账号：可以管理会员和训练计划
- 会员账号：只能查看自己的信息

## 项目结构

```
fitness-coach-app/
├── public/                  # 静态资源
├── src/
│   ├── assets/             # 样式和图片资源
│   ├── components/         # 可复用组件
│   ├── composables/        # 组合式函数
│   │   └── useAuth.js     # 用户认证逻辑
│   ├── lib/
│   │   └── supabase.js    # Supabase客户端配置
│   ├── router/            # 路由配置
│   ├── stores/            # 状态管理
│   ├── views/             # 页面组件
│   │   ├── coach/         # 教练端页面
│   │   └── member/        # 会员端页面
│   ├── App.vue            # 根组件
│   └── main.ts            # 应用入口
├── .env.example           # 环境变量示例
├── SUPABASE_SETUP.md      # Supabase设置指南
└── README.md             # 项目说明
```

## 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 学习资源

如果你是编程新手，推荐以下学习资源：

- **Vue.js官方教程**: https://cn.vuejs.org/guide/introduction.html
- **Element Plus文档**: https://element-plus.org/zh-CN/
- **Supabase文档**: https://supabase.com/docs
- **菜鸟教程（HTML/CSS/JS）**: https://www.runoob.com

## 常见问题

### 启动项目时报错？

1. 确保Node.js版本 >= 18
2. 删除 `node_modules` 文件夹和 `package-lock.json`，重新运行 `npm install`
3. 检查 `.env` 文件是否正确配置

### 登录失败？

1. 检查Supabase项目是否正常运行
2. 确认 `.env` 文件中的配置正确
3. 确认用户已在Supabase中创建并设置了角色

## 后续计划

1. **完善核心功能**：完成训练计划管理和会员端功能
2. **优化用户体验**：改进界面设计，增加动画效果
3. **数据分析**：添加更多数据可视化图表
4. **移动端适配**：优化移动设备上的显示效果
5. **微信小程序**：将Web版转换为微信小程序

---

**注意**：这是一个正在开发中的项目，部分功能尚未完成。
