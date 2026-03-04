<template>
  <div class="plan-detail-container">
    <el-page-header @back="goBack" content="训练计划详情" />

    <el-card v-loading="loading" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <div>
            <h3>{{ planInfo?.template_name }}</h3>
            <p class="plan-meta">
              <el-tag :type="getStatusType(planInfo?.status)">
                {{ getStatusLabel(planInfo?.status) }}
              </el-tag>
              <span style="margin-left: 10px">开始日期：{{ formatDate(planInfo?.start_date) }}</span>
            </p>
          </div>
        </div>
      </template>

      <!-- 训练目标和备注 -->
      <el-descriptions :column="1" border style="margin-bottom: 20px">
        <el-descriptions-item label="训练目标">
          {{ planInfo?.target_goal || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" v-if="planInfo?.notes">
          {{ planInfo.notes }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 训练课次列表 -->
      <div v-if="trainingSessions.length > 0">
        <h4>训练课次</h4>
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
                </div>
                <el-tag v-if="session.completed" type="success" size="small">已完成</el-tag>
                <el-tag v-else type="info" size="small">未完成</el-tag>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { supabase } from '../../lib/supabase'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const planInfo = ref(null)
const trainingSessions = ref([])
const activeSession = ref(null)

// 加载训练计划详情
const loadPlanDetail = async () => {
  loading.value = true
  try {
    const planId = route.params.planId

    // 1. 加载训练计划基本信息
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
    planInfo.value = {
      ...planData,
      template_name: templateData.name,
      target_goal: templateData.target_goal,
      difficulty_level: templateData.difficulty_level,
      description: templateData.description
    }

    // 3. 加载训练模板的课次安排（使用新表 training_sessions）
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

        return { ...session, exercises: exercises || [], completed: false }
      })
    )

    trainingSessions.value = sessionsWithExercises
  } catch (error) {
    console.error('加载训练计划详情失败:', error)
    ElMessage.error('加载训练计划详情失败')
  } finally {
    loading.value = false
  }
}

// 查看某一天的训练详情
const viewDayDetail = (day) => {
  console.log('查看训练日详情:', day)
  router.push({
    name: 'member-training',
    params: { dayId: day.id }
  })
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

// 返回上一页
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadPlanDetail()
})
</script>

<style scoped>
.plan-detail-container {
  padding: 20px;
}

.card-header h3 {
  margin: 0 0 10px 0;
}

.plan-meta {
  margin: 0;
  color: #666;
  font-size: 14px;
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
