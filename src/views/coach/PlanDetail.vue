<template>
  <div class="plan-detail-container">
    <!-- 返回按钮 -->
    <el-page-header @back="goBack" content="训练计划详情" />

    <div v-loading="loading" style="min-height: 400px">
      <!-- 计划基本信息 -->
      <el-card style="margin-top: 20px">
        <template #header>
          <div class="card-header">
            <h3>计划信息</h3>
            <el-button type="primary" size="small" @click="showEditPlanInfoDialog = true">
              编辑
            </el-button>
          </div>
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
          <div class="card-header">
            <h3>训练课次</h3>
            <el-button type="primary" size="small" @click="handleAddSession">
              添加训练课次
            </el-button>
          </div>
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

                <!-- 编辑课次按钮 -->
                <div style="margin-top: 15px; text-align: right;">
                  <el-button type="primary" size="small" @click="handleEditSession(session)">
                    编辑课次
                  </el-button>
                </div>
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

    <!-- 编辑计划信息对话框 -->
    <el-dialog
      v-model="showEditPlanInfoDialog"
      title="编辑计划信息"
      width="600px"
    >
      <el-form :model="editPlanForm" label-width="100px">
        <el-form-item label="模板名称">
          <el-input v-model="editPlanForm.template_name" placeholder="请输入模板名称" />
        </el-form-item>

        <el-form-item label="训练目标">
          <el-input v-model="editPlanForm.target_goal" placeholder="请输入训练目标" />
        </el-form-item>

        <el-form-item label="难度等级">
          <el-select v-model="editPlanForm.difficulty_level" placeholder="请选择难度等级">
            <el-option label="初级" value="beginner" />
            <el-option label="中级" value="intermediate" />
            <el-option label="高级" value="advanced" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="editPlanForm.status" placeholder="请选择状态">
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>

        <el-form-item label="开始日期">
          <el-date-picker
            v-model="editPlanForm.start_date"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="结束日期">
          <el-date-picker
            v-model="editPlanForm.end_date"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="editPlanForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showEditPlanInfoDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSavePlanInfo" :loading="savingPlanInfo">
          保存
        </el-button>
      </template>
    </el-dialog>
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

// 编辑计划信息相关
const showEditPlanInfoDialog = ref(false)
const savingPlanInfo = ref(false)
const editPlanForm = ref({
  template_name: '',
  target_goal: '',
  difficulty_level: '',
  status: '',
  start_date: null,
  end_date: null,
  notes: ''
})

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

    // 5. 初始化编辑表单
    editPlanForm.value = {
      template_name: templateData.name,
      target_goal: templateData.target_goal,
      difficulty_level: templateData.difficulty_level,
      status: planData.status,
      start_date: planData.start_date ? new Date(planData.start_date) : null,
      end_date: planData.end_date ? new Date(planData.end_date) : null,
      notes: planData.notes || ''
    }
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

// 编辑课次（记录训练）
const handleEditSession = (session) => {
  // 跳转到训练模板编辑器，传递模板ID、课次ID和来源标记
  router.push({
    name: 'coach-template-edit',
    params: { id: planDetail.value.template_id },
    query: {
      from: 'plan-detail',
      sessionId: session.id
    }
  })
}

// 添加训练课次
const handleAddSession = () => {
  // 跳转到添加课次页面，传递模板ID和计划ID
  router.push({
    name: 'coach-template-edit',
    params: { id: planDetail.value.template_id },
    query: {
      from: 'plan-detail',
      mode: 'add-session',
      planId: planDetail.value.id
    }
  })
}

// 保存计划信息
const handleSavePlanInfo = async () => {
  savingPlanInfo.value = true
  try {
    // 1. 更新模板信息
    const { error: templateError } = await supabase
      .from('training_templates')
      .update({
        name: editPlanForm.value.template_name,
        target_goal: editPlanForm.value.target_goal,
        difficulty_level: editPlanForm.value.difficulty_level
      })
      .eq('id', planDetail.value.template_id)

    if (templateError) throw templateError

    // 2. 更新计划信息
    const { error: planError } = await supabase
      .from('member_plans')
      .update({
        status: editPlanForm.value.status,
        start_date: editPlanForm.value.start_date ? new Date(editPlanForm.value.start_date).toISOString().split('T')[0] : null,
        end_date: editPlanForm.value.end_date ? new Date(editPlanForm.value.end_date).toISOString().split('T')[0] : null,
        notes: editPlanForm.value.notes
      })
      .eq('id', planDetail.value.id)

    if (planError) throw planError

    ElMessage.success('计划信息保存成功！')
    showEditPlanInfoDialog.value = false

    // 重新加载计划详情
    await loadPlanDetail()

  } catch (error) {
    console.error('保存计划信息失败:', error)
    ElMessage.error('保存失败：' + error.message)
  } finally {
    savingPlanInfo.value = false
  }
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
