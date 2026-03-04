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
                    <el-tag v-if="session.record_count > 0" type="info" size="small" style="margin-left: 10px;">
                      已记录{{ session.record_count }}次
                    </el-tag>
                  </div>
                  <div style="margin-left: auto; display: flex; gap: 10px;">
                    <el-button
                      v-if="session.record_count > 0"
                      type="primary"
                      size="small"
                      @click.stop="handleViewHistory(session)"
                    >
                      查看历史记录
                    </el-button>
                    <el-button
                      type="success"
                      size="small"
                      @click.stop="handleRecordTraining(session)"
                    >
                      记录训练
                    </el-button>
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

    <!-- 记录训练对话框 -->
    <el-dialog
      v-model="showRecordDialog"
      title="记录训练"
      width="90%"
      :close-on-click-modal="false"
    >
      <div v-if="currentSession">
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #title>
            <strong>第{{ currentSession.session_number }}次课 - {{ currentSession.core_focus }}</strong>
          </template>
          记录会员完成该课次的实际训练数据
        </el-alert>

        <!-- 训练日期 -->
        <el-form label-width="100px" style="margin-bottom: 20px">
          <el-form-item label="训练日期">
            <el-date-picker
              v-model="recordForm.training_date"
              type="date"
              placeholder="选择训练日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="教练备注">
            <el-input
              v-model="recordForm.coach_notes"
              type="textarea"
              :rows="2"
              placeholder="填写本次训练的整体情况、会员状态等"
            />
          </el-form-item>
        </el-form>

        <!-- 训练动作记录 -->
        <h4 style="margin-bottom: 15px">训练动作记录</h4>
        <el-table :data="recordForm.exercises" border style="width: 100%">
          <el-table-column prop="exercise_name" label="动作名称" width="150" fixed />
          <el-table-column label="计划重量" width="100">
            <template #default="{ row }">
              {{ row.planned_weight }}
            </template>
          </el-table-column>
          <el-table-column label="实际重量" width="120">
            <template #default="{ row, $index }">
              <el-input
                v-model="recordForm.exercises[$index].actual_weight"
                placeholder="如：20kg"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="计划次数" width="100">
            <template #default="{ row }">
              {{ row.planned_reps }}
            </template>
          </el-table-column>
          <el-table-column label="实际次数" width="120">
            <template #default="{ row, $index }">
              <el-input
                v-model="recordForm.exercises[$index].actual_reps"
                placeholder="如：12次"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="计划组数" width="100">
            <template #default="{ row }">
              {{ row.planned_sets }}
            </template>
          </el-table-column>
          <el-table-column label="实际组数" width="120">
            <template #default="{ row, $index }">
              <el-input
                v-model="recordForm.exercises[$index].actual_sets"
                placeholder="如：3"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="会员反馈" min-width="200">
            <template #default="{ row, $index }">
              <el-input
                v-model="recordForm.exercises[$index].member_feedback"
                placeholder="填写会员的感受、难度等"
                size="small"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="showRecordDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRecord" :loading="saving">
          保存记录
        </el-button>
      </template>
    </el-dialog>

    <!-- 历史记录对话框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="训练历史记录"
      width="95%"
      :close-on-click-modal="false"
    >
      <div v-if="currentSession">
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #title>
            <strong>第{{ currentSession.session_number }}次课 - {{ currentSession.core_focus }}</strong>
          </template>
          查看该课次的所有训练记录
        </el-alert>

        <div v-loading="loadingHistory">
          <div v-if="historyRecords.length > 0">
            <el-timeline>
              <el-timeline-item
                v-for="record in historyRecords"
                :key="record.id"
                :timestamp="formatDate(record.session_date)"
                placement="top"
              >
                <el-card>
                  <template #header>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span><strong>训练日期：{{ formatDate(record.session_date) }}</strong></span>
                      <el-tag type="success">已完成</el-tag>
                    </div>
                  </template>

                  <!-- 教练备注 -->
                  <div v-if="record.coach_notes" style="margin-bottom: 15px;">
                    <strong>教练备注：</strong>
                    <p style="margin: 5px 0; color: #606266;">{{ record.coach_notes }}</p>
                  </div>

                  <!-- 训练动作记录 -->
                  <h5 style="margin-bottom: 10px;">训练动作完成情况</h5>
                  <el-table :data="record.exercises" border style="width: 100%">
                    <el-table-column prop="exercise_name" label="动作名称" width="150" fixed />
                    <el-table-column label="计划重量" width="100">
                      <template #default="{ row }">
                        {{ row.planned_weight || '-' }}
                      </template>
                    </el-table-column>
                    <el-table-column label="实际重量" width="100">
                      <template #default="{ row }">
                        <el-tag v-if="row.actual_weight" type="success">{{ row.actual_weight }}</el-tag>
                        <span v-else>-</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="计划次数" width="100">
                      <template #default="{ row }">
                        {{ row.planned_reps || '-' }}
                      </template>
                    </el-table-column>
                    <el-table-column label="实际次数" width="100">
                      <template #default="{ row }">
                        <el-tag v-if="row.actual_reps" type="success">{{ row.actual_reps }}</el-tag>
                        <span v-else>-</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="计划组数" width="100">
                      <template #default="{ row }">
                        {{ row.planned_sets || '-' }}
                      </template>
                    </el-table-column>
                    <el-table-column label="实际组数" width="100">
                      <template #default="{ row }">
                        <el-tag v-if="row.actual_sets" type="success">{{ row.actual_sets }}</el-tag>
                        <span v-else>-</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="会员反馈" min-width="200">
                      <template #default="{ row }">
                        {{ row.member_feedback || '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
          <el-empty v-else description="暂无训练记录" />
        </div>
      </div>

      <template #footer>
        <el-button @click="showHistoryDialog = false">关闭</el-button>
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

// 记录训练相关
const showRecordDialog = ref(false)
const saving = ref(false)
const currentSession = ref(null)
const recordForm = ref({
  training_date: new Date(),
  coach_notes: '',
  exercises: []
})

// 历史记录相关
const showHistoryDialog = ref(false)
const loadingHistory = ref(false)
const historyRecords = ref([])

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
          return { ...session, exercises: [], record_count: 0 }
        }

        // 5. 查询该课次的训练记录数量
        const { count, error: countError } = await supabase
          .from('member_session_records')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('plan_id', planData.id)

        if (countError) {
          console.error('查询记录数量失败:', countError)
        }

        return { ...session, exercises: exercises || [], record_count: count || 0 }
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

// 记录训练
const handleRecordTraining = (session) => {
  currentSession.value = session

  // 初始化记录表单
  recordForm.value = {
    training_date: new Date(),
    coach_notes: '',
    exercises: session.exercises.map(exercise => ({
      exercise_id: exercise.id,
      exercise_name: exercise.exercise_name,
      planned_weight: exercise.weight,
      planned_reps: exercise.reps_standard,
      planned_sets: exercise.sets,
      actual_weight: '',
      actual_reps: '',
      actual_sets: '',
      member_feedback: ''
    }))
  }

  showRecordDialog.value = true
}

// 保存训练记录
const handleSaveRecord = async () => {
  try {
    saving.value = true

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    // 1. 创建课次记录
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('member_session_records')
      .insert([{
        member_id: planDetail.value.member_id,
        plan_id: planDetail.value.id,
        session_id: currentSession.value.id,
        session_date: recordForm.value.training_date.toISOString().split('T')[0],
        coach_notes: recordForm.value.coach_notes,
        completed: true
      }])
      .select()
      .single()

    if (sessionError) throw sessionError

    // 2. 创建动作记录
    const exerciseRecords = recordForm.value.exercises.map(exercise => ({
      session_record_id: sessionRecord.id,
      exercise_id: exercise.exercise_id,
      actual_weight: exercise.actual_weight,
      actual_reps: exercise.actual_reps,
      actual_sets: exercise.actual_sets ? parseInt(exercise.actual_sets) : null,
      member_feedback: exercise.member_feedback,
      completed: true
    }))

    const { error: exercisesError } = await supabase
      .from('member_exercise_records')
      .insert(exerciseRecords)

    if (exercisesError) throw exercisesError

    ElMessage.success('训练记录保存成功！')
    showRecordDialog.value = false

    // 重新加载计划详情以更新记录数量
    await loadPlanDetail()

  } catch (error) {
    console.error('保存训练记录失败:', error)
    ElMessage.error('保存失败：' + error.message)
  } finally {
    saving.value = false
  }
}

// 查看历史记录
const handleViewHistory = async (session) => {
  currentSession.value = session
  showHistoryDialog.value = true
  loadingHistory.value = true

  try {
    // 1. 查询该课次的所有训练记录
    const { data: records, error: recordsError } = await supabase
      .from('member_session_records')
      .select('*')
      .eq('session_id', session.id)
      .eq('plan_id', planDetail.value.id)
      .order('session_date', { ascending: false })

    if (recordsError) throw recordsError

    // 2. 为每条记录加载动作详情
    const recordsWithExercises = await Promise.all(
      records.map(async (record) => {
        // 查询动作记录
        const { data: exerciseRecords, error: exercisesError } = await supabase
          .from('member_exercise_records')
          .select('*')
          .eq('session_record_id', record.id)

        if (exercisesError) {
          console.error('加载动作记录失败:', exercisesError)
          return { ...record, exercises: [] }
        }

        // 为每个动作记录补充计划数据
        const exercisesWithPlan = await Promise.all(
          exerciseRecords.map(async (exRecord) => {
            const { data: exercise, error: exerciseError } = await supabase
              .from('session_exercises')
              .select('*')
              .eq('id', exRecord.exercise_id)
              .single()

            if (exerciseError) {
              console.error('加载动作信息失败:', exerciseError)
              return {
                ...exRecord,
                exercise_name: '未知动作',
                planned_weight: '-',
                planned_reps: '-',
                planned_sets: '-'
              }
            }

            return {
              ...exRecord,
              exercise_name: exercise.exercise_name,
              planned_weight: exercise.weight,
              planned_reps: exercise.reps_standard,
              planned_sets: exercise.sets
            }
          })
        )

        return { ...record, exercises: exercisesWithPlan }
      })
    )

    historyRecords.value = recordsWithExercises

  } catch (error) {
    console.error('加载历史记录失败:', error)
    ElMessage.error('加载历史记录失败')
  } finally {
    loadingHistory.value = false
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
