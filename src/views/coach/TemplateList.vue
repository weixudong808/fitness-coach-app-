<template>
  <div class="template-list-container">
    <!-- 导航菜单 -->
    <el-menu
      mode="horizontal"
      :default-active="activeMenu"
      @select="handleMenuSelect"
      style="margin-bottom: 20px"
    >
      <el-menu-item index="/coach/members">会员管理</el-menu-item>
      <el-menu-item index="/coach/templates">训练计划模板</el-menu-item>
      <el-menu-item index="/coach/assign-plan">分配训练计划</el-menu-item>
    </el-menu>

    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <h1>训练计划模板</h1>
      <el-button type="primary" size="large" @click="createTemplate">创建模板</el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" v-loading="loading" style="min-height: 400px"></div>

    <!-- 空状态 -->
    <el-empty v-else-if="templates.length === 0" description="还没有训练模板，点击上方按钮创建第一个模板吧！" />

    <!-- 模板卡片列表 -->
    <el-row v-else :gutter="24" class="template-grid">
      <el-col
        v-for="template in templates"
        :key="template.id"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="6"
        style="margin-bottom: 24px"
      >
          <el-card
            class="template-card"
            shadow="hover"
            @click="editTemplate(template.id)"
          >
            <template #header>
              <div class="template-card-header">
                <h3>{{ template.name }}</h3>
                <div class="template-actions" @click.stop>
                  <el-button
                    type="primary"
                    size="small"
                    @click="editTemplate(template.id)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    @click="handleDelete(template)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </template>

            <div class="template-content">
              <!-- 标签 -->
              <div class="template-tags">
                <el-tag type="success" size="small">{{ template.target_goal }}</el-tag>
                <el-tag type="warning" size="small">{{ getDifficultyLabel(template.difficulty_level) }}</el-tag>
                <el-tag type="info" size="small">{{ template.exercise_count }} 个动作</el-tag>
              </div>

              <!-- 描述 -->
              <p class="template-description">
                {{ template.description || '暂无描述' }}
              </p>

              <!-- 创建时间 -->
              <div class="template-footer">
                <span class="template-time">{{ formatDate(template.created_at) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useTemplates } from '../../composables/useTemplates'

const router = useRouter()
const { templates, loading, loadTemplates, deleteTemplate } = useTemplates()

// 当前激活的菜单
const activeMenu = ref('/coach/templates')

// 菜单选择处理
const handleMenuSelect = (index) => {
  console.log('菜单跳转:', index)
  router.push(index)
}

// 加载模板列表
onMounted(() => {
  loadTemplates()
})

// 创建模板
const createTemplate = () => {
  router.push('/coach/templates/new')
}

// 编辑模板
const editTemplate = (id) => {
  router.push(`/coach/templates/${id}/edit`)
}

// 删除模板
const handleDelete = async (template) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${template.name}"吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteTemplate(template.id)
    ElMessage.success('删除成功')
    loadTemplates() // 重新加载列表
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

// 获取难度标签
const getDifficultyLabel = (level) => {
  const levelMap = {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级'
  }
  return levelMap[level] || level
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.template-list-container {
  padding: 20px 40px;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e4e7ed;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.template-grid {
  margin-top: 20px;
}

.template-card {
  cursor: pointer;
  transition: all 0.3s;
  height: 100%;
  min-height: 260px;
  border-radius: 8px;
}

.template-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.template-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.template-card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
  flex: 1;
  word-break: break-word;
}

.template-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.template-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}

.template-time {
  color: #909399;
  font-size: 12px;
}
</style>
