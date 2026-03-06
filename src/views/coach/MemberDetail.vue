<template>
  <div class="member-detail-container">
    <el-page-header @back="goBack" content="会员详情" />

    <el-card v-loading="loading" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <h3>会员信息</h3>
          <el-button type="primary" size="small" @click="handleEditMember">
            编辑
          </el-button>
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

    <!-- 编辑会员对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑会员信息"
      width="600px"
    >
      <el-form :model="memberForm" :rules="memberRules" ref="memberFormRef" label-width="120px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="memberForm.name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="memberForm.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="memberForm.age" :min="1" :max="120" />
        </el-form-item>

        <el-form-item label="电话" prop="phone">
          <el-input v-model="memberForm.phone" placeholder="请输入电话" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="memberForm.email" placeholder="请输入邮箱（选填）" />
        </el-form-item>

        <el-form-item label="身高(cm)" prop="height">
          <el-input-number v-model="memberForm.height" :min="100" :max="250" />
        </el-form-item>

        <el-form-item label="初始体重(kg)" prop="initial_weight">
          <el-input-number v-model="memberForm.initial_weight" :min="30" :max="300" :precision="1" />
        </el-form-item>

        <el-form-item label="初始体脂率(%)" prop="initial_body_fat">
          <el-input-number v-model="memberForm.initial_body_fat" :min="5" :max="60" :precision="1" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveMember" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, reactive } from 'vue'
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

// 编辑会员相关
const showEditDialog = ref(false)
const saving = ref(false)
const memberFormRef = ref(null)
const memberForm = reactive({
  name: '',
  gender: 'male',
  age: null,
  phone: '',
  email: '',
  height: null,
  initial_weight: null,
  initial_body_fat: null
})

const memberRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  height: [{ required: true, message: '请输入身高', trigger: 'blur' }],
  initial_weight: [{ required: true, message: '请输入初始体重', trigger: 'blur' }]
}

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
    // 1. 使用已加载的训练计划数据，避免重复查询
    if (!memberPlans.value || memberPlans.value.length === 0) {
      trainingStats.value = {
        totalSessions: 0,
        monthSessions: 0,
        completionRate: 0,
        lastTrainingDate: '-'
      }
      return
    }

    // 2. 查询所有已完成的训练课次
    const templateIds = memberPlans.value.map(p => p.template_id)
    const { data: completedSessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('id, template_id, completed, completed_date, session_date')
      .in('template_id', templateIds)
      .eq('completed', true)
      .order('completed_date', { ascending: true })

    if (sessionsError) throw sessionsError

    if (!completedSessions || completedSessions.length === 0) {
      trainingStats.value = {
        totalSessions: 0,
        monthSessions: 0,
        completionRate: 0,
        lastTrainingDate: '-'
      }
      return
    }

    // 3. 计算统计数据
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthSessions = completedSessions.filter(s => new Date(s.completed_date) >= thisMonth)

    const lastSession = completedSessions[completedSessions.length - 1]
    const lastDate = new Date(lastSession.completed_date)

    trainingStats.value = {
      totalSessions: completedSessions.length,
      monthSessions: monthSessions.length,
      completionRate: 100, // 所有记录都是已完成的
      lastTrainingDate: lastDate.toLocaleDateString('zh-CN')
    }

    // 4. 生成最近30天的训练频率数据
    const last30Days = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      // 修复：比较日期时只取日期部分，忽略时间
      const count = completedSessions.filter(s => {
        const sessionDate = s.completed_date ? s.completed_date.split('T')[0] : ''
        return sessionDate === dateStr
      }).length
      last30Days.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count
      })
    }
    frequencyData.value = last30Days

    // 5. 查询动作进步数据
    await loadExerciseProgress(completedSessions)

  } catch (error) {
    console.error('加载训练统计失败:', error)
    ElMessage.error('加载训练统计失败')
  } finally {
    loadingStats.value = false
  }
}

// 加载动作进步数据
const loadExerciseProgress = async (completedSessions) => {
  try {
    // 获取所有已完成课次的动作记录
    const sessionIds = completedSessions.map(s => s.id)

    const { data: exercises, error } = await supabase
      .from('session_exercises')
      .select('session_id, exercise_name, weight, reps_standard, sets')
      .in('session_id', sessionIds)

    if (error) throw error

    if (!exercises || exercises.length === 0) {
      exerciseProgressData.value = []
      return
    }

    // 优化：使用 Map 进行 O(1) 查找，而不是 O(n) 的 find
    const sessionMap = new Map()
    completedSessions.forEach(session => {
      sessionMap.set(session.id, session)
    })

    // 按动作名称分组并整理进步数据
    const progressByExercise = {}
    exercises.forEach(exercise => {
      const exerciseName = exercise.exercise_name
      if (!exerciseName) return

      if (!progressByExercise[exerciseName]) {
        progressByExercise[exerciseName] = []
      }

      // 使用 Map 进行 O(1) 查找
      const session = sessionMap.get(exercise.session_id)
      if (session && session.completed_date) {
        // 提取重量数值（去除单位）
        const weightMatch = exercise.weight?.match(/(\d+(\.\d+)?)/)
        const weight = weightMatch ? parseFloat(weightMatch[1]) : 0

        // 提取次数数值
        const repsMatch = exercise.reps_standard?.match(/(\d+)/)
        const reps = repsMatch ? parseInt(repsMatch[1]) : 0

        progressByExercise[exerciseName].push({
          date: session.completed_date,
          weight: weight,
          reps: reps,
          sets: exercise.sets || 0
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
    // weight 已经是数字类型，直接使用
    return d.weight || 0
  })
  const reps = exerciseData.data.map(d => {
    // reps 已经是数字类型，直接使用
    return d.reps || 0
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
  // 返回到会员管理页
  router.push('/coach/members')
}

// 编辑会员
const handleEditMember = () => {
  if (!member.value) {
    ElMessage.warning('会员信息加载中，请稍后再试')
    return
  }

  // 填充表单数据
  Object.assign(memberForm, {
    name: member.value.name,
    gender: member.value.gender,
    age: member.value.age,
    phone: member.value.phone,
    email: member.value.email || '',
    height: member.value.height,
    initial_weight: member.value.initial_weight,
    initial_body_fat: member.value.initial_body_fat
  })
  showEditDialog.value = true
}

// 保存会员信息
const saveMember = async () => {
  if (!memberFormRef.value) return

  await memberFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        const { error } = await supabase
          .from('members')
          .update(memberForm)
          .eq('id', route.params.id)

        if (error) throw error

        ElMessage.success('更新成功')
        showEditDialog.value = false

        // 刷新会员信息
        await loadMemberDetail()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error(`保存失败: ${error.message || JSON.stringify(error)}`)
      } finally {
        saving.value = false
      }
    }
  })
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
