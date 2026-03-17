<template>
  <div class="assign-plan-container">
    <!-- 自定义导航栏 -->
    <div class="nav-header">
      <div class="nav-buttons">
        <button @click="$router.push('/coach/members')" class="nav-btn">
          会员管理
        </button>
        <button @click="$router.push('/coach/templates')" class="nav-btn">
          训练计划模板
        </button>
        <button class="nav-btn active">分配训练计划</button>
      </div>
    </div>

    <!-- 页面标题 -->
    <div class="page-header">
      <h1>分配训练计划</h1>
    </div>

    <div v-loading="loading" class="content-wrapper">
      <!-- 第一步：选择会员 -->
      <div class="section-card">
        <div class="section-header">
          <h3>第一步：选择会员</h3>
          <span class="selected-count">已选择 {{ selectedMembers.length }} 个会员</span>
        </div>
        <div class="section-body">

        <!-- 搜索框 -->
        <el-input
          v-model="memberSearchKeyword"
          placeholder="搜索会员（姓名或手机号）"
          clearable
          style="margin-bottom: 20px; max-width: 400px"
        />

        <!-- 会员列表 -->
        <el-table
          ref="memberTableRef"
          :data="filteredMembers"
          @selection-change="handleMemberSelectionChange"
          style="width: 100%"
          max-height="400"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="gender" label="性别" width="80">
            <template #default="{ row }">
              {{ row.gender === 'male' ? '男' : '女' }}
            </template>
          </el-table-column>
          <el-table-column prop="age" label="年龄" width="80" />
          <el-table-column prop="phone" label="电话" width="150" />
        </el-table>

        <el-empty v-if="filteredMembers.length === 0" description="没有找到会员" />
        </div>
      </div>

      <!-- 第二步：选择模板 -->
      <div class="section-card">
        <div class="section-header">
          <h3>第二步：选择训练模板</h3>
          <div style="display: flex; align-items: center; gap: 12px;">
            <el-button type="success" size="small" @click="showCreateTemplateDialog = true">
              + 快速创建模板
            </el-button>
            <span v-if="selectedTemplate" class="selected-info">
              已选择：{{ selectedTemplate.name }}
            </span>
          </div>
        </div>
        <div class="section-body">

        <!-- 搜索框 -->
        <el-input
          v-model="templateSearchKeyword"
          placeholder="搜索模板（名称或训练目标）"
          clearable
          style="margin-bottom: 20px; max-width: 400px"
        />

        <!-- 模板卡片网格 -->
        <el-row :gutter="20" v-if="filteredTemplates.length > 0">
          <el-col
            v-for="template in filteredTemplates"
            :key="template.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            style="margin-bottom: 20px"
          >
            <div class="template-card-wrap" @click="selectTemplate(template)">
              <el-card
                :class="['template-card', { 'selected': selectedTemplate?.id === template.id }]"
                shadow="hover"
              >
                <h4>{{ template.name }}</h4>
                <div class="template-tags">
                  <el-tag type="success" size="small">{{ template.target_goal }}</el-tag>
                  <el-tag type="warning" size="small">{{ getDifficultyLabel(template.difficulty_level) }}</el-tag>
                  <el-tag type="info" size="small">{{ template.exercise_count }} 个动作</el-tag>
                </div>
                <p class="template-description">{{ template.description || '暂无描述' }}</p>
              </el-card>
            </div>
          </el-col>
        </el-row>

        <el-empty v-else description="没有找到训练模板" />
        </div>
      </div>

      <!-- 第三步：设置参数 -->
      <div class="section-card">
        <div class="section-header">
          <h3>第三步：设置参数</h3>
        </div>
        <div class="section-body">

        <el-form :model="assignForm" label-width="100px" style="max-width: 600px">
          <el-form-item label="开始日期">
            <el-date-picker
              v-model="assignForm.startDate"
              type="date"
              placeholder="选择开始日期"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="备注说明">
            <el-input
              v-model="assignForm.notes"
              type="textarea"
              :rows="3"
              placeholder="可选，输入备注说明"
            />
          </el-form-item>
        </el-form>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          @click="handleAssign"
          :loading="assigning"
          :disabled="!canAssign"
        >
          分配给选中的会员
        </el-button>
      </div>
    </div>

    <!-- 快速创建模板对话框 -->
    <el-dialog
      v-model="showCreateTemplateDialog"
      title="快速创建训练模板"
      width="90%"
      :close-on-click-modal="false"
    >
      <el-alert
        title="提示"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        创建完成后，新模板会自动添加到模板列表中，您可以直接选择使用。
      </el-alert>

      <el-form :model="newTemplate" label-width="120px">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>

        <el-form-item label="模板名称" required>
          <el-input v-model="newTemplate.name" placeholder="例如：三分化训练" />
        </el-form-item>

        <el-form-item label="模板描述">
          <el-input
            v-model="newTemplate.description"
            type="textarea"
            :rows="2"
            placeholder="简要描述这个训练模板的特点"
          />
        </el-form-item>

        <el-form-item label="训练目标" required>
          <el-input v-model="newTemplate.target_goal" placeholder="例如：增肌、减脂、塑形" />
        </el-form-item>

        <el-form-item label="难度等级" required>
          <el-select v-model="newTemplate.difficulty_level" placeholder="请选择难度等级">
            <el-option label="初级" value="beginner" />
            <el-option label="中级" value="intermediate" />
            <el-option label="高级" value="advanced" />
          </el-select>
        </el-form-item>

        <el-form-item label="训练阶段" required>
          <el-select v-model="newTemplate.training_stage" placeholder="请选择训练阶段">
            <el-option label="基础期" value="基础期" />
            <el-option label="进阶期" value="进阶期" />
            <el-option label="突破期" value="突破期" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-alert
        title="注意"
        type="warning"
        :closable="false"
        style="margin-top: 20px"
      >
        快速创建只会保存模板基本信息，训练课次和动作需要稍后在"训练计划模板"页面中编辑添加。
      </el-alert>

      <template #footer>
        <el-button @click="showCreateTemplateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleQuickCreateTemplate" :loading="creating">
          创建模板
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAssignPlan } from '../../composables/useAssignPlan'
import { supabase } from '../../lib/supabase'
import { getCoachId } from '../../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { loading, members, templates, loadMembers, loadTemplates, assignPlan } = useAssignPlan()

// 表格引用
const memberTableRef = ref(null)

// 会员相关
const memberSearchKeyword = ref('')
const selectedMembers = ref([])

// 模板相关
const templateSearchKeyword = ref('')
const selectedTemplate = ref(null)

// 分配表单
const assignForm = ref({
  startDate: new Date(),
  notes: ''
})

// 分配状态
const assigning = ref(false)

// 快速创建模板相关
const showCreateTemplateDialog = ref(false)
const creating = ref(false)
const newTemplate = ref({
  name: '',
  description: '',
  target_goal: '',
  difficulty_level: '',
  training_stage: ''
})

// 初始化
onMounted(async () => {
  try {
    await Promise.all([
      loadMembers(),
      loadTemplates()
    ])

    // 如果 URL 中有 memberId 参数，自动勾选该会员
    const memberId = route.query.memberId
    if (memberId) {
      // 等待数据加载完成后勾选
      setTimeout(() => {
        const member = members.value.find(m => m.id === memberId)
        if (member) {
          selectedMembers.value = [member]
          // 使用表格的 toggleRowSelection 方法勾选行
          if (memberTableRef.value) {
            memberTableRef.value.toggleRowSelection(member, true)
          }
        }
      }, 100)
    }
  } catch (error) {
    ElMessage.error('加载数据失败：' + error.message)
  }
})

// 过滤会员列表
const filteredMembers = computed(() => {
  if (!memberSearchKeyword.value) return members.value

  const keyword = memberSearchKeyword.value.toLowerCase()
  return members.value.filter(member =>
    member.name.toLowerCase().includes(keyword) ||
    member.phone.includes(keyword)
  )
})

// 过滤模板列表
const filteredTemplates = computed(() => {
  if (!templateSearchKeyword.value) return templates.value

  const keyword = templateSearchKeyword.value.toLowerCase()
  return templates.value.filter(template =>
    template.name.toLowerCase().includes(keyword) ||
    template.target_goal.toLowerCase().includes(keyword)
  )
})

// 是否可以分配
const canAssign = computed(() => {
  return selectedMembers.value.length > 0 && selectedTemplate.value !== null
})

// 会员选择变化
const handleMemberSelectionChange = (selection) => {
  selectedMembers.value = selection
}

// 选择模板
const selectTemplate = (template) => {
  selectedTemplate.value = template
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

// 取消
const handleCancel = () => {
  router.back()
}

// 分配训练计划
const handleAssign = async () => {
  if (!canAssign.value) {
    ElMessage.warning('请选择会员和训练模板')
    return
  }

  try {
    assigning.value = true

    const memberIds = selectedMembers.value.map(m => m.id)
    const count = await assignPlan(
      memberIds,
      selectedTemplate.value.id,
      assignForm.value.startDate,
      assignForm.value.notes
    )

    // 检查是否有成功分配
    if (count === 0) {
      ElMessage.error('分配失败：0个成功，请查看控制台错误')
      return
    }

    ElMessage.success(`成功为 ${count} 个会员分配训练计划`)

    // 检查是否从会员详情页跳转过来
    const memberId = route.query.memberId
    if (memberId) {
      // 如果有 memberId，跳转回会员详情页
      router.push(`/coach/members/${memberId}`)
      return
    }

    // 如果没有 memberId，保持原来的行为：清空选择并刷新数据
    // 清空选择
    selectedMembers.value = []
    selectedTemplate.value = null
    assignForm.value.notes = ''
    assignForm.value.startDate = new Date()

    // 清空表格选中状态
    if (memberTableRef.value) {
      memberTableRef.value.clearSelection()
    }

    // 刷新数据
    try {
      await loadMembers()
    } catch (refreshError) {
      console.error('刷新会员列表失败:', refreshError)
      ElMessage.warning('已分配成功，但刷新列表失败')
    }
  } catch (error) {
    ElMessage.error('分配失败：' + error.message)
  } finally {
    assigning.value = false
  }
}

// 快速创建模板
const handleQuickCreateTemplate = async () => {
  // 验证必填字段
  if (!newTemplate.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (!newTemplate.value.target_goal) {
    ElMessage.warning('请输入训练目标')
    return
  }
  if (!newTemplate.value.difficulty_level) {
    ElMessage.warning('请选择难度等级')
    return
  }
  if (!newTemplate.value.training_stage) {
    ElMessage.warning('请选择训练阶段')
    return
  }

  try {
    creating.value = true

    // 获取教练ID
    const { coachId } = await getCoachId()
    if (!coachId) throw new Error('未绑定教练，无法创建模板')

    // 创建模板
    const { data, error } = await supabase
      .from('training_templates')
      .insert([{
        name: newTemplate.value.name,
        description: newTemplate.value.description,
        target_goal: newTemplate.value.target_goal,
        difficulty_level: newTemplate.value.difficulty_level,
        training_stage: newTemplate.value.training_stage,
        coach_id: coachId
      }])
      .select()
      .single()

    if (error) throw error

    ElMessage.success('模板创建成功！')

    // 关闭对话框
    showCreateTemplateDialog.value = false

    // 重置表单
    newTemplate.value = {
      name: '',
      description: '',
      target_goal: '',
      difficulty_level: '',
      training_stage: ''
    }

    // 刷新模板列表
    await loadTemplates()

    // 自动选中新创建的模板
    selectedTemplate.value = data

  } catch (error) {
    console.error('创建模板失败:', error)
    ElMessage.error('创建模板失败：' + error.message)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.assign-plan-container {
  padding: 20px 40px;
  width: 100%;
}

.page-header {
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

.section-card {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.selected-count,
.selected-info {
  color: #409eff;
  font-size: 14px;
}

.template-card {
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.template-card.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.template-card h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

.template-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.template-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-card-wrap {
  cursor: pointer;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

/* ========== 自定义导航栏样式 ========== */
.nav-header {
  background: white;
  border-radius: 12px;
  padding: 20px 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-buttons {
  display: flex;
  gap: 12px;
}

.nav-btn {
  padding: 10px 24px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.nav-btn:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
}

.nav-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* ========== 内容容器样式 ========== */
.content-wrapper {
  min-height: 400px;
}

/* ========== 自定义卡片样式 ========== */
.section-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f5f5f5;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.section-body {
  /* 内容区域 */
}

.selected-count,
.selected-info {
  color: #667eea;
  font-size: 14px;
  font-weight: 500;
}
</style>
