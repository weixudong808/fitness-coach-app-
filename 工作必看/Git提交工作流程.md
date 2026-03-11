# Git 提交工作流程

**文档目的：** 确保每次提交代码到 GitHub 都安全、规范、不出错

**使用方法：** 每次提交前，对照这个检查清单，一项一项检查

**最后更新：** 2026-03-11

---

## 📋 快速检查清单

**提交前必须检查的4项：**
- [ ] 代码能运行吗？
- [ ] 有没有敏感信息？
- [ ] 提交的文件对吗？
- [ ] 提交信息清楚吗？

---

## 🎯 什么时候提交？

**大白话：** 完成一个"有意义的小功能"就提交。

### 应该提交的场景

✅ **场景1：完成一个小功能**
- 例如：完成"俯卧撑考核功能"
- 代码能运行，功能正常
- 立即提交

✅ **场景2：修复一个 bug**
- 例如：修复"徽章日期不固定"
- 测试通过，bug 解决
- 立即提交

✅ **场景3：优化一个功能**
- 例如：优化"徽章图标"
- 优化完成，效果更好
- 立即提交

✅ **场景4：下班前**
- 即使功能没完成，也要提交当前进度
- 提交信息写"WIP: 正在开发 XXX 功能"
- WIP = Work In Progress（进行中）

✅ **场景5：修改配置文件**
- 例如：修改 .gitignore
- 立即提交

### 不需要提交的场景

❌ **场景1：修改数据库**
- 数据库修改不需要提交代码
- 只需要在工作总结中记录 SQL 语句

❌ **场景2：只改了一个空格**
- 修改太小，不用提交

❌ **场景3：代码还有 bug**
- 先修复 bug，再提交

---

## ✅ 提交前检查（4步）

### 第1步：代码能运行吗？

**大白话：** 确保代码没有错误，功能正常。

**检查方法：**
```bash
# 启动开发服务器，看看有没有报错
cd /Users/quhongfei/Documents/code/闲聊/fitness-coach-app
npm run dev
```

**检查项：**
- [ ] 没有语法错误
- [ ] 功能正常工作
- [ ] 没有明显的 bug

**如果有错误：**
- 先修复错误
- 测试通过后再提交

---

### 第2步：有没有敏感信息？

**大白话：** 确保没有密码、密钥等敏感信息。

**敏感信息包括：**
- [ ] .env 文件（数据库密钥）
- [ ] 测试脚本（包含真实密钥）
- [ ] 硬编码的密码、密钥
- [ ] 个人隐私信息

**检查方法：**
```bash
# 查看要提交的文件
git status

# 查看具体修改内容
git diff

# 搜索敏感关键词
grep -r "password" .
grep -r "secret" .
grep -r "key" .
grep -r "supabase" .
```

**如果发现敏感信息：**
- 删除或替换为环境变量
- 确保 .gitignore 排除了敏感文件

---

### 第3步：提交的文件对吗？

**大白话：** 确保只提交需要的文件，不提交临时文件。

**不应该提交的文件：**
- [ ] node_modules/（依赖包）
- [ ] .DS_Store（Mac 系统文件）
- [ ] *.log（日志文件）
- [ ] dist/、build/（编译后的文件）
- [ ] .env（环境变量）
- [ ] 临时文件、测试文件

**检查方法：**
```bash
# 查看要提交的文件列表
git status

# 如果有不该提交的文件，从暂存区移除
git reset HEAD 文件名
```

---

### 第4步：提交信息清楚吗？

**大白话：** 写清楚这次提交做了什么。

**好的提交信息格式：**
```
类型: 简短描述

详细描述（可选）

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

**类型：**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `chore`: 其他修改

**示例：**
```bash
git commit -m "feat: 添加俯卧撑考核功能

- 支持从训练计划提取俯卧撑数据
- 判断是否达到15次标准
- 自动点亮徽章

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 🚀 提交步骤（4步）

**大白话：** 就像寄快递的流程。

### 第1步：查看修改

```bash
# 查看修改了哪些文件
git status

# 查看具体修改内容
git diff
```

**大白话：** 看看要寄什么东西。

---

### 第2步：添加文件

```bash
# 添加单个文件（推荐）
git add 文件名

# 添加多个文件
git add 文件1 文件2 文件3

# 添加所有文件（小心！）
git add .
```

**大白话：** 选择要寄的东西。

**注意：** 尽量使用 `git add 文件名`，不要用 `git add .`，避免误提交。

---

### 第3步：创建提交

```bash
# 创建提交
git commit -m "feat: 添加XXX功能

详细描述

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

**大白话：** 打包快递。

---

### 第4步：推送到 GitHub

```bash
# 推送到 GitHub
git push
```

**大白话：** 寄出快递。

---

## 📊 提交后检查（3步）

### 第1步：查看 GitHub 仓库

**访问：** https://github.com/weixudong808/fitness-coach-app-

**检查：**
- [ ] 代码已经上传
- [ ] 提交信息正确
- [ ] 没有敏感信息

---

### 第2步：更新工作总结

**文件：** `fitness-coach-app/工作必看/工作总结-YYYY-MM-DD.md`

**记录：**
- 今天提交了什么
- 解决了什么问题
- 完成了什么功能

---

### 第3步：更新进度追踪

**文件：** `fitness-coach-app/工作必看/项目开发进度追踪.md`

**更新：**
- 完成度
- 开发里程碑

---

## 🚨 常见错误及解决方案

### 错误1：提交了敏感信息

**场景：** 不小心提交了 .env 文件

**解决方案：**
```bash
# 从 Git 中删除文件（但保留本地文件）
git rm --cached .env

# 创建新的提交
git commit -m "chore: 删除敏感文件"

# 推送到 GitHub
git push
```

**重要：** 如果已经推送到 GitHub，需要立即更换密钥！

---

### 错误2：提交了 node_modules

**场景：** 不小心提交了整个 node_modules 文件夹

**解决方案：**
```bash
# 从 Git 中删除
git rm -r --cached node_modules

# 确保 .gitignore 中有 node_modules
echo "node_modules/" >> .gitignore

# 提交
git commit -m "chore: 删除 node_modules"
git push
```

---

### 错误3：提交信息写错了

**场景：** 提交信息写错了，还没推送

**解决方案：**
```bash
# 修改最后一次提交的信息
git commit --amend -m "新的提交信息"
```

**注意：** 只能修改最后一次提交，且不能已经推送到 GitHub。

---

### 错误4：代码有 bug 就提交了

**场景：** 提交后发现代码有 bug

**解决方案：**
```bash
# 修复 bug
# 测试通过

# 提交修复
git add 文件名
git commit -m "fix: 修复XXX问题"
git push
```

---

### 错误5：忘记推送到 GitHub

**场景：** 只 commit 了，没有 push

**解决方案：**
```bash
# 推送到 GitHub
git push
```

---

### 错误6：推送失败

**场景：** 推送时提示"Updates were rejected"

**解决方案：**
```bash
# 先拉取 GitHub 上的最新代码
git pull

# 如果有冲突，解决冲突

# 再推送
git push
```

---

## 🔧 常用命令速查

### 查看状态
```bash
# 查看文件状态
git status

# 查看修改内容
git diff

# 查看提交历史
git log --oneline
```

---

### 添加和提交
```bash
# 添加文件
git add 文件名

# 创建提交
git commit -m "提交信息"

# 推送到 GitHub
git push
```

---

### 撤销操作
```bash
# 取消暂存
git reset HEAD 文件名

# 恢复文件
git checkout -- 文件名

# 回退到某个版本（保留修改）
git reset --soft 提交ID
```

---

### 分支操作
```bash
# 查看分支
git branch

# 创建并切换到新分支
git checkout -b 分支名

# 切换分支
git checkout 分支名

# 合并分支
git merge 分支名

# 删除分支
git branch -d 分支名
```

---

### 远程操作
```bash
# 拉取最新代码
git pull

# 推送到 GitHub
git push

# 查看远程仓库
git remote -v
```

---

## 📝 .gitignore 配置

**文件：** `.gitignore`

**内容：**
```
# 依赖包
node_modules/
package-lock.json

# 环境变量
.env
.env.local
.env.*.local

# 系统文件
.DS_Store
Thumbs.db

# 日志文件
*.log
logs/

# 编译后的文件
dist/
build/
.next/
out/

# 编辑器配置
.vscode/
.idea/
*.swp
*.swo

# 测试覆盖率
coverage/

# 临时文件
*.tmp
*.temp
.cache/

# 测试脚本
test-*.js
```

---

## 🎯 提交信息模板

### 新功能
```bash
git commit -m "feat: 添加XXX功能

- 功能点1
- 功能点2
- 功能点3

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### 修复 bug
```bash
git commit -m "fix: 修复XXX问题

- 问题描述
- 解决方案

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### 优化功能
```bash
git commit -m "refactor: 优化XXX功能

- 优化点1
- 优化点2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### 更新文档
```bash
git commit -m "docs: 更新XXX文档

- 更新内容

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 📅 每日工作流程

### 早上开始工作
```bash
# 1. 进入项目目录
cd /Users/quhongfei/Documents/code/闲聊/fitness-coach-app

# 2. 拉取最新代码
git pull

# 3. 开始开发
```

---

### 完成一个功能
```bash
# 1. 查看修改
git status
git diff

# 2. 检查代码（对照检查清单）
# - 代码能运行吗？
# - 有没有敏感信息？
# - 提交的文件对吗？
# - 提交信息清楚吗？

# 3. 添加文件
git add 文件名

# 4. 创建提交
git commit -m "feat: 添加XXX功能"

# 5. 推送到 GitHub
git push

# 6. 检查 GitHub 仓库
# 访问：https://github.com/weixudong808/fitness-coach-app-

# 7. 更新工作总结和进度追踪
```

---

### 下班前
```bash
# 1. 确保所有修改都已提交
git status

# 2. 如果有未提交的修改，提交
git add .
git commit -m "WIP: 正在开发XXX功能"
git push

# 3. 更新工作总结
# 文件：fitness-coach-app/工作必看/工作总结-YYYY-MM-DD.md

# 4. 更新进度追踪
# 文件：fitness-coach-app/工作必看/项目开发进度追踪.md

# 5. 备份代码到项目重要资料
# 文件：项目重要资料/完整系统备份/
```

---

## 🔒 安全提醒

### 永远不要提交的内容

❌ **密码和密钥**
- .env 文件
- API 密钥
- 数据库密码
- JWT 密钥

❌ **个人隐私信息**
- 身份证号
- 手机号
- 邮箱地址
- 真实姓名

❌ **临时文件**
- node_modules/
- .DS_Store
- *.log
- dist/、build/

---

### 如果不小心提交了敏感信息

**立即执行：**
1. 从 Git 中删除敏感文件
2. 推送到 GitHub
3. **立即更换密钥**（重新生成 Supabase 密钥、GitHub Token 等）
4. 检查 GitHub 仓库，确认敏感信息已删除

---

## 📞 遇到问题怎么办？

### 问题1：不知道该不该提交

**判断标准：**
- 完成了一个有意义的小功能 → 提交
- 只改了一个空格 → 不提交
- 代码还有 bug → 不提交

---

### 问题2：不知道提交信息怎么写

**参考模板：**
- 新功能：`feat: 添加XXX功能`
- 修复 bug：`fix: 修复XXX问题`
- 优化：`refactor: 优化XXX功能`
- 文档：`docs: 更新XXX文档`

---

### 问题3：推送失败

**常见原因：**
1. GitHub 上有新代码 → 先 `git pull`，再 `git push`
2. Token 过期 → 重新生成 Token
3. 网络问题 → 检查网络连接

---

## 🎯 总结

**提交代码的黄金法则：**
1. **经常提交** - 完成一个小功能就提交
2. **提交前测试** - 确保代码能运行
3. **检查敏感信息** - 不要提交密码、密钥
4. **写清楚提交信息** - 让自己知道做了什么
5. **一次提交只做一件事** - 方便回退

**大白话总结：**
- 提交 = 游戏存档
- 经常存档 = 不怕丢失进度
- 存档前测试 = 确保存档点是好的
- 写清楚存档名 = 知道这个存档是干什么的

---

**最后更新：** 2026-03-11
**更新人：** 小助理
**GitHub 仓库：** https://github.com/weixudong808/fitness-coach-app-
