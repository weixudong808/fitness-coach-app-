<template>
  <div class="member-detail-container">
    <el-page-header @back="goBack" content="会员详情" />

    <el-card v-loading="loading" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <h3>{{ member?.name }}</h3>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="姓名">{{ member?.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">
          {{ member?.gender === 'male' ? '男' : '女' }}
        </el-descriptions-item>
        <el-descriptions-item label="年龄">{{ member?.age }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ member?.phone }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ member?.email }}</el-descriptions-item>
        <el-descriptions-item label="身高">{{ member?.height }} cm</el-descriptions-item>
        <el-descriptions-item label="初始体重">
          {{ member?.initial_weight }} kg
        </el-descriptions-item>
        <el-descriptions-item label="初始体脂率">
          {{ member?.initial_body_fat }}%
        </el-descriptions-item>
        <el-descriptions-item label="注册时间" :span="2">
          {{ formatDate(member?.created_at) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 训练计划 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <h3>训练计划</h3>
          <el-dropdown @command="handlePlanCommand" trigger="click">
            <el-button type="primary" size="small">
              分配新计划
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="from-template">
                  <el-icon><Document /></el-icon>
                  从模板选择
                </el-dropdown-item>
                <el-dropdown-item command="create-exclusive">
                  <el-icon><Edit /></el-icon>
                  创建专属计划
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>

      <el-table
        v-if="memberPlans.length > 0"
        :data="memberPlans"
        style="width: 100%"
      >
        <el-table-column prop="template_name" label="训练模板" width="200" />
        <el-table-column prop="target_goal" label="训练目标" width="120" />
        <el-table-column label="开始日期" width="120">
          <template #default="{ row }">
            {{ formatDateShort(row.start_date) }}
          </template>
        </el-table-column>
        <el-table-column label="结束日期" width="120">
          <template #default="{ row }">
            {{ row.end_date ? formatDateShort(row.end_date) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="goToPlanDetail(row.id)"
            >
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              type="warning"
              size="small"
              @click="handleCancelPlan(row.id)"
            >
              取消
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDeletePlan(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无训练计划" />
    </el-card>

    <!-- 进步统计 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <h3>进步统计</h3>
      </template>

      <div v-loading="loadingStats">
        <div v-if="trainingStats.totalSessions > 0">
          <!-- 统计概览 -->
          <el-row :gutter="20" style="margin-bottom: 30px;">
            <el-col :span="6">
              <el-statistic title="总训练次数" :value="trainingStats.totalSessions">
                <template #suffix>次</template>
              </el-statistic>
            </el-col>
            <el-col :span="6">
              <el-statistic title="本月训练次数" :value="trainingStats.monthSessions">
                <template #suffix>次</template>
              </el-statistic>
            </el-col>
            <el-col :span="6">
              <el-statistic title="训练完成率" :value="trainingStats.completionRate" :precision="1">
                <template #suffix>%</template>
              </el-statistic>
            </el-col>
            <el-col :span="6">
              <el-statistic title="最近训练" :value="trainingStats.lastTrainingDate" />
            </el-col>
          </el-row>

          <!-- 训练频率趋势图 -->
          <div style="margin-bottom: 30px;">
            <h4 style="margin-bottom: 15px;">训练频率趋势（最近30天）</h4>
            <v-chart :option="frequencyChartOption" style="height: 300px;" />
          </div>

          <!-- 动作进步趋势 -->
          <div v-if="exerciseProgressData.length > 0">
            <h4 style="margin-bottom: 15px;">动作进步趋势</h4>
            <el-select v-model="selectedExercise" placeholder="选择动作" style="width: 300px; margin-bottom: 15px;">
              <el-option
                v-for="exercise in exerciseProgressData"
                :key="exercise.name"
                :label="exercise.name"
                :value="exercise.name"
              />
            </el-select>
            <v-chart :option="progressChartOption" style="height: 350px;" />
          </div>
        </div>
        <el-empty v-else description="暂无训练数据" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Document, Edit } from '@element-plus/icons-vue'
import { supabase } from '../../lib/supabase'
import { useAssignPlan } from '../../composables/useAssignPlan'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const route = useRoute()
const router = useRouter()
const { getMemberPlans, cancelAssignment, deleteAssignment } = useAssignPlan()

const member = ref(null)
const memberPlans = ref([])
const loading = ref(false)

// 进步统计相关
const loadingStats = ref(false)
const trainingStats = ref({
  totalSessions: 0,
  monthSessions: 0,
  completionRate: 0,
  lastTrainingDate: '-'
})
const frequencyData = ref([])
const exerciseProgressData = ref([])
const selectedExercise = ref('')

const loadMemberDetail = async () => {
  loading.value = true
  try {
    // 并行加载会员信息和训练计划
    const [memberResult, plansResult] = await Promise.all([
      supabase
        .from('members')
        .select('*')
        .eq('id', route.params.id)
        .single(),
      getMemberPlans(route.params.id)
    ])

    if (memberResult.error) throw memberResult.error
    member.value = memberResult.data
    memberPlans.value = plansResult

    // 加载进步统计
    await loadTrainingStats()
  } catch (error) {
    console.error('加载会员详情失败:', error)
    ElMessage.error('加载会员详情失败')
  } finally {
    loading.value = false
  }
}

// 加载训练统计数据
const loadTrainingStats = async () => {
  loadingStats.value = true
  try {
    const memberId = route.params.id

    // 1. 查询所有训练记录
    const { data: records, error: recordsError } = await supabase
      .from('member_session_records')
      .select('*, session_id')
      .eq('member_id', memberId)
      .order('session_date', { ascending: true })

    if (recordsError) throw recordsError

    if (!records || records.length === 0) {
      trainingStats.value = {
        totalSessions: 0,
        monthSessions: 0,
        completionRate: 0,
        lastTrainingDate: '-'
      }
      return
    }

    // 2. 计算统计数据
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthRecords = records.filter(r => new Date(r.session_date) >= thisMonth)

    const lastRecord = records[records.length - 1]
    const lastDate = new Date(lastRecord.session_date)

    trainingStats.value = {
      totalSessions: records.length,
      monthSessions: monthRecords.length,
      completionRate: 100, // 所有记录都是已完成的
      lastTrainingDate: lastDate.toLocaleDateString('zh-CN')
    }

    // 3. 生成最近30天的训练频率数据
    const last30Days = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count = records.filter(r => r.session_date === dateStr).length
      last30Days.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count
      })
    }
    frequencyData.value = last30Days

    // 4. 查询动作进步数据
    await loadExerciseProgress(records)

  } catch (error) {
    console.error('加载训练统计失败:', error)
    ElMessage.error('加载训练统计失败')
  } finally {
    loadingStats.value = false
  }
}

// 加载动作进步数据
const loadExerciseProgress = async (sessionRecords) => {
  try {
    // 获取所有动作记录
    const sessionRecordIds = sessionRecords.map(r => r.id)

    const { data: exerciseRecords, error } = await supabase
      .from('member_exercise_records')
      .select('*, exercise_id')
      .in('session_record_id', sessionRecordIds)

    if (error) throw error

    // 获取动作信息
    const exerciseIds = [...new Set(exerciseRecords.map(r => r.exercise_id))]
    const { data: exercises, error: exercisesError } = await supabase
      .from('session_exercises')
      .select('id, exercise_name')
      .in('id', exerciseIds)

    if (exercisesError) throw exercisesError

    // 按动作分组并整理进步数据
    const exerciseMap = {}
    exercises.forEach(ex => {
      exerciseMap[ex.id] = ex.exercise_name
    })

    const progressByExercise = {}
    exerciseRecords.forEach(record => {
      const exerciseName = exerciseMap[record.exercise_id]
      if (!exerciseName) return

      if (!progressByExercise[exerciseName]) {
        progressByExercise[exerciseName] = []
      }

      // 找到对应的训练日期
      const sessionRecord = sessionRecords.find(sr => sr.id === record.session_record_id)
      if (sessionRecord) {
        progressByExercise[exerciseName].push({
          date: sessionRecord.session_date,
          weight: record.actual_weight,
          reps: record.actual_reps,
          sets: record.actual_sets
        })
      }
    })

    // 转换为数组格式
    exerciseProgressData.value = Object.keys(progressByExercise).map(name => ({
      name,
      data: progressByExercise[name].sort((a, b) => new Date(a.date) - new Date(b.date))
    }))

    // 默认选择第一个动作
    if (exerciseProgressData.value.length > 0) {
      selectedExercise.value = exerciseProgressData.value[0].name
    }

  } catch (error) {
    console.error('加载动作进步数据失败:', error)
  }
}

// 训练频率图表配置
const frequencyChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: frequencyData.value.map(d => d.date),
    axisLabel: {
      rotate: 45
    }
  },
  yAxis: {
    type: 'value',
    name: '训练次数',
    minInterval: 1
  },
  series: [
    {
      name: '训练次数',
      type: 'bar',
      data: frequencyData.value.map(d => d.count),
      itemStyle: {
        color: '#409eff'
      }
    }
  ],
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    containLabel: true
  }
}))

// 动作进步图表配置
const progressChartOption = computed(() => {
  const exerciseData = exerciseProgressData.value.find(e => e.name === selectedExercise.value)
  if (!exerciseData) {
    return {}
  }

  const dates = exerciseData.data.map(d => new Date(d.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }))
  const weights = exerciseData.data.map(d => {
    // 尝试从字符串中提取数字
    const match = d.weight?.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null
  })
  const reps = exerciseData.data.map(d => {
    const match = d.reps?.match(/(\d+)/);
    return match ? parseInt(match[1]) : null
  })

  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['重量', '次数']
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: '重量 (kg)',
        position: 'left'
      },
      {
        type: 'value',
        name: '次数',
        position: 'right'
      }
    ],
    series: [
      {
        name: '重量',
        type: 'line',
        data: weights,
        smooth: true,
        itemStyle: {
          color: '#67c23a'
        },
        yAxisIndex: 0
      },
      {
        name: '次数',
        type: 'line',
        data: reps,
        smooth: true,
        itemStyle: {
          color: '#e6a23c'
        },
        yAxisIndex: 1
      }
    ],
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      containLabel: true
    }
  }
})

const loadMemberPlans = async () => {
  try {
    const plans = await getMemberPlans(route.params.id)
    memberPlans.value = plans
  } catch (error) {
    console.error('加载训练计划失败:', error)
    ElMessage.error('加载训练计划失败')
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const formatDateShort = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const getStatusLabel = (status) => {
  const statusMap = {
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    active: 'success',
    completed: 'info',
    cancelled: 'warning'
  }
  return typeMap[status] || ''
}

// 处理分配计划命令
const handlePlanCommand = (command) => {
  const memberId = route.params.id

  if (command === 'from-template') {
    // 从模板选择
    console.log('跳转到分配计划页面，会员ID:', memberId)
    router.push({
      name: 'coach-assign-plan',
      query: { memberId }
    })
  } else if (command === 'create-exclusive') {
    // 创建专属计划
    console.log('跳转到创建专属计划页面，会员ID:', memberId)
    router.push({
      name: 'coach-template-edit',
      params: { id: 'new' },
      query: {
        memberId,
        mode: 'exclusive'
      }
    })
  }
}

const goToPlanDetail = (planId) => {
  console.log('跳转到计划详情:', planId)
  router.push({
    name: 'coach-plan-detail',
    params: { planId }
  })
}

const handleCancelPlan = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要取消这个训练计划吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await cancelAssignment(planId)
    ElMessage.success('已取消训练计划')
    await loadMemberPlans()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败：' + error.message)
    }
  }
}

const handleDeletePlan = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个训练计划吗？删除后无法恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })

    await deleteAssignment(planId)
    ElMessage.success('已删除训练计划')
    await loadMemberPlans()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

const goBack = () => {
  router.back()
}

// 监听选择的动作变化
watch(selectedExercise, () => {
  // 图表会自动更新，因为使用了 computed
})

onMounted(() => {
  loadMemberDetail()
})
</script>

<style scoped>
.member-detail-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}
</style>
