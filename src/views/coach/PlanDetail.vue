<template>
  <div class="plan-detail-container">
    <!-- 返回按钮 -->
    <el-page-header @back="goBack" content="训练计划详情" />

    <div v-loading="loading" style="min-height: 400px">
      <!-- 计划基本信息 -->
      <el-card style="margin-top: 20px">
        <template #header>
          <h3>计划信息</h3>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ planDetail.template_name }}</el-descriptions-item>
          <el-descriptions-item label="训练目标">{{ planDetail.target_goal }}</el-descriptions-item>
          <el-descriptions-item label="难度等级">{{ getDifficultyLabel(planDetail.difficulty_level) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(planDetail.status)">
              {{ getStatusLabel(planDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ formatDate(planDetail.start_date) }}</el-descriptions-item>
          <el-descriptions-item label="结束日期">{{ planDetail.end_date ? formatDate(planDetail.end_date) : '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ planDetail.notes || '无' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 训练课次列表 -->
      <el-card style="margin-top: 20px">
        <template #header>
          <h3>训练课次</h3>
        </template>
        <div v-if="trainingSessions.length > 0">
          <el-collapse v-model="activeSession" accordion>
            <el-collapse-item
              v-for="session in trainingSessions"
              :key="session.id"
              :name="session.id"
            >
              <template #title>
                <div class="session-title">
                  <div>
                    <el-tag type="primary" size="small">第{{ session.session_number }}次课</el-tag>
                    <span style="margin-left: 10px; font-weight: bold;">{{ session.core_focus }}</span>
                    <el-tag v-if="session.completed" type="success" size="small" style="margin-left: 10px;">
                      已完成 {{ formatDate(session.completed_date) }}
                    </el-tag>
                    <el-tag v-else type="info" size="small" style="margin-left: 10px;">
                      待训练
                    </el-tag>
                  </div>
                </div>
              </template>

              <!-- 课次基本信息 -->
              <el-descriptions :column="2" border style="margin-bottom: 20px">
                <el-descriptions-item label="训练部位">
                  {{ session.training_area || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="训练日期">
                  {{ formatDate(session.training_date) || '待安排' }}
                </el-descriptions-item>
              </el-descriptions>

              <!-- 训练动作列表 -->
              <div v-if="session.exercises && session.exercises.length > 0">
                <h5 style="margin-bottom: 15px">训练动作</h5>
                <el-table :data="session.exercises" border style="width: 100%">
                  <el-table-column prop="exercise_name" label="动作名称" width="150" />
                  <el-table-column prop="equipment_notes" label="器械/握距" width="120" />
                  <el-table-column prop="weight" label="重量" width="120" />
                  <el-table-column prop="reps_standard" label="次数/标准" width="120" />
                  <el-table-column prop="sets" label="组数" width="80" align="center" />
                  <el-table-column prop="next_goal" label="下节进阶目标" min-width="150" />
                  <el-table-column prop="member_feedback" label="会员反馈" min-width="150">
                    <template #default="{ row }">
                      {{ row.member_feedback || '-' }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="progress_record" label="阶段进步记录" min-width="150">
                    <template #default="{ row }">
                      {{ row.progress_record || '-' }}
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <el-empty v-else description="暂无训练动作" />
            </el-collapse-item>
          </el-collapse>
        </div>
        <el-empty v-else description="暂无训练安排" />
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="goBack">返回</el-button>
        <el-button
          type="primary"
          @click="handleEditPlan"
        >
          编辑计划
        </el-button>
        <el-button
          v-if="planDetail.status === 'active'"
          type="warning"
          @click="handleCancelPlan"
        >
          取消计划
        </el-button>
        <el-button type="danger" @click="handleDeletePlan">删除计划</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { supabase } from '../../lib/supabase'
import { useTemplates } from '../../composables/useTemplates'
import { useAssignPlan } from '../../composables/useAssignPlan'

const route = useRoute()
const router = useRouter()
const { getTemplateById } = useTemplates()
const { cancelAssignment, deleteAssignment } = useAssignPlan()

const loading = ref(false)
const planDetail = ref({})
const trainingSessions = ref([])
const activeSession = ref(null)

// 加载计划详情
const loadPlanDetail = async () => {
  loading.value = true
  try {
    const planId = route.params.planId

    // 1. 查询计划基本信息
    const { data: planData, error: planError } = await supabase
      .from('member_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError) throw planError

    // 2. 查询模板基本信息
    const { data: templateData, error: templateError } = await supabase
      .from('training_templates')
      .select('*')
      .eq('id', planData.template_id)
      .single()

    if (templateError) throw templateError

    // 合并数据
    planDetail.value = {
      ...planData,
      template_name: templateData.name,
      target_goal: templateData.target_goal,
      difficulty_level: templateData.difficulty_level,
      description: templateData.description
    }

    // 3. 加载训练课次（使用新表 training_sessions）
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('template_id', planData.template_id)
      .order('session_number', { ascending: true })

    if (sessionsError) throw sessionsError

    // 4. 为每个课次加载训练动作（使用新表 session_exercises）
    const sessionsWithExercises = await Promise.all(
      sessionsData.map(async (session) => {
        const { data: exercises, error: exercisesError } = await supabase
          .from('session_exercises')
          .select('*')
          .eq('session_id', session.id)
          .order('order_index', { ascending: true })

        if (exercisesError) {
          console.error('加载训练动作失败:', exercisesError)
          return { ...session, exercises: [] }
        }

        return { ...session, exercises: exercises || [] }
      })
    )

    trainingSessions.value = sessionsWithExercises
  } catch (error) {
    console.error('加载计划详情失败:', error)
    ElMessage.error('加载计划详情失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 获取状态标签
const getStatusLabel = (status) => {
  const statusMap = {
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    active: 'success',
    completed: 'info',
    cancelled: 'warning'
  }
  return typeMap[status] || ''
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

// 返回
const goBack = () => {
  router.back()
}

// 编辑计划
const handleEditPlan = () => {
  // 跳转到训练模板编辑器，传递模板ID和来源标记
  router.push({
    name: 'coach-template-edit',
    params: { id: planDetail.value.template_id },
    query: { from: 'plan-detail' }
  })
}

// 取消计划
const handleCancelPlan = async () => {
  try {
    await ElMessageBox.confirm('确定要取消这个训练计划吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await cancelAssignment(route.params.planId)
    ElMessage.success('已取消训练计划')
    await loadPlanDetail()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败：' + error.message)
    }
  }
}

// 删除计划
const handleDeletePlan = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个训练计划吗？删除后无法恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })

    await deleteAssignment(route.params.planId)
    ElMessage.success('已删除训练计划')
    router.back()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

onMounted(() => {
  loadPlanDetail()
})
</script>

<style scoped>
.plan-detail-container {
  padding: 20px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

.session-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 20px;
}

h5 {
  color: #333;
  font-size: 14px;
  font-weight: bold;
}
</style>
