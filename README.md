# 健身教练管理系统

一个专为健身私人教练设计的会员管理系统，支持训练记录、训练计划管理、会员进度追踪。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.local.example .env.local
```
编辑 `.env.local`，填入你的 Supabase 配置和教练ID。

### 3. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173

## 📚 文档

- **[系统技术文档.md](./系统技术文档.md)** - 完整的技术文档，包含数据库结构、问题解决记录、快速恢复指南
- **[CLAUDE.md](../CLAUDE.md)** - AI训练记录助手使用指南

## 🎯 核心功能

### 训练记录功能
- 通过对话方式实时记录会员训练数据
- 文档暂存机制，稍后批量导入数据库
- 智能导入，自动查询会员信息、创建训练计划
- 支持重名会员识别

### 训练计划管理
- 创建训练模板
- 为会员分配训练计划
- 按课次组织训练内容
- 记录训练完成情况

## 🛠️ 技术栈

- **前端**: Vue 3 + Element Plus + Vite
- **后端**: Supabase (PostgreSQL + RLS)
- **脚本**: Node.js + ES Modules

## 📋 核心脚本

```bash
# 初始化测试数据
node init-test-data.js

# 导入训练记录
node import-training-record.js

# 验证训练数据
node verify-training-data.js 张三
```

## ⚙️ 配置说明

### .env.local 配置
```env
# Supabase Service Role Key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 教练 ID（每个教练配置自己的ID）
COACH_ID=your_coach_id
```

**如何获取教练ID：**
1. 登录前端系统
2. 打开浏览器控制台（F12）
3. 查看 localStorage 中的认证信息

详细配置说明请查看 `.env.local.example`

## 🔧 常见问题

### 导入的数据前端看不到？
检查 `.env.local` 中的 `COACH_ID` 是否正确。详见[系统技术文档.md](./系统技术文档.md)的"快速恢复指南"章节。

### 重名会员导入失败？
在训练记录文档中添加手机号后4位，例如：`**会员：** 张三 (8000)`

## 📞 技术支持

遇到问题请查看：
1. [系统技术文档.md](./系统技术文档.md) - 完整的技术文档和问题解决方案
2. [CLAUDE.md](../CLAUDE.md) - AI训练记录助手使用指南
3. `.env.local.example` - 配置说明

---

**当前版本**: 1.0
**最后更新**: 2026-03-05
