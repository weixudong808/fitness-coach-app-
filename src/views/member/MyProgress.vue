<template>
  <div class="my-progress-container">
    <!-- 顶部导航 -->
    <div class="header">
      <h1>会员中心</h1>
      <div class="nav-menu">
        <button @click="goToPage('/member/home')" class="nav-btn">首页</button>
        <button @click="goToPage('/member/plan')" class="nav-btn">训练计划</button>
        <button @click="goToPage('/member/progress')" class="nav-btn active">我的进步</button>
        <button @click="goToPage('/member/achievements')" class="nav-btn">我的认证</button>
        <button @click="goToPage('/member/coaches')" class="nav-btn">查找教练</button>
      </div>
      <button @click="handleLogout" class="logout-btn">退出登录</button>
    </div>

    <el-card v-loading="loading">
      <template #header>
        <h2>我的进步</h2>
      </template>

      <!-- 统计概览 -->
      <div v-if="!loading && trainingStats.totalSessions > 0" class="stats-overview">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="总训练次数" :value="trainingStats.totalSessions" suffix="次" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="本月训练" :value="trainingStats.monthSessions" suffix="次" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="完成率" :value="trainingStats.completionRate" suffix="%" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="最近训练" :value="trainingStats.lastTrainingDate" />
          </el-col>
        </el-row>
      </div>

      <!-- 训练频率趋势图 -->
      <div v-if="!loading && trainingStats.totalSessions > 0" style="margin-top: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h4 style="margin: 0;">训练频率趋势</h4>
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-select v-model="dateRangeType" @change="handleDateRangeChange" style="width: 150px;">
              <el-option label="本月" value="thisMonth" />
              <el-option label="上月" value="lastMonth" />
              <el-option label="最近30天" value="recent30" />
              <el-option label="自定义" value="custom" />
            </el-select>
            <el-date-picker
              v-if="dateRangeType === 'custom'"
              v-model="customDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="handleCustomDateChange"
              style="width: 280px;"
            />
          </div>
        </div>
        <v-chart :option="frequencyChartOption" style="height: 300px;" />
      </div>

      <!-- 动作进步趋势 -->
      <div v-if="!loading && exerciseProgressData.length > 0" style="margin-top: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h4 style="margin: 0;">动作进步趋势</h4>
          <el-select v-model="selectedExercise" style="width: 200px;">
            <el-option
              v-for="exercise in exerciseProgressData"
              :key="exercise.name"
              :label="exercise.name"
              :value="exercise.name"
            />
          </el-select>
        </div>
        <v-chart :option="progressChartOption" style="height: 400px;" />
      </div>

      <!-- 无数据提示 -->
      <el-empty v-if="!loading && trainingStats.totalSessions === 0" description="暂无训练数据" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../composables/useAuth'
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

const router = useRouter()
const { signOut } = useAuth()
const loading = ref(true)
const memberId = ref(null)
const activeMenu = ref('progress')

// 处理菜单选择
const handleMenuSelect = (index) => {
  if (index === 'progress') {
    router.push({ name: 'member-progress' })
  } else if (index === 'plan') {
    router.push({ name: 'member-plan' })
  } else if (index === 'achievements') {
    router.push({ name: 'member-achievements' })
  }
}

// 跳转到指定页面
const goToPage = (path) => {
  router.push(path)
}

// 退出登录
const handleLogout = async () => {
  await signOut()
  router.push('/login')
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

// 日期范围选择
const dateRangeType = ref('recent30')
const customDateRange = ref([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
])

// 获取当前登录会员ID
const getCurrentMemberId = async () => {
  try {
    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      ElMessage.error('请先登录')
      return null
    }

    // 2. 通过 user_id 查找会员记录
    const { data: memberData, error } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    return memberData.id
  } catch (error) {
    console.error('获取会员信息失败:', error)
    ElMessage.error('获取会员信息失败')
    return null
  }
}

// 计算日期范围
const getDateRange = () => {
  const today = new Date()
  let startDate, endDate

  switch (dateRangeType.value) {
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = today
      break

    case 'lastMonth':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      startDate = lastMonth
      endDate = new Date(today.getFullYear(), today.getMonth(), 0)
      break

    case 'recent30':
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      endDate = today
      break

    case 'custom':
      if (customDateRange.value && customDateRange.value.length === 2) {
        startDate = new Date(customDateRange.value[0])
        endDate = new Date(customDateRange.value[1])
      } else {
        startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
        endDate = today
      }
      break

    default:
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      endDate = today
  }

  return { startDate, endDate }
}

// 解析重量（支持自重格式）
const parseWeight = (weightStr) => {
  if (!weightStr) return 0

  // 处理"自重"格式
  if (weightStr.includes('自重')) {
    if (weightStr === '自重') return 0

    const plusMatch = weightStr.match(/自重\+(\d+(\.\d+)?)/)
    if (plusMatch) return parseFloat(plusMatch[1])

    const minusMatch = weightStr.match(/自重-(\d+(\.\d+)?)/)
    if (minusMatch) return -parseFloat(minusMatch[1])

    return 0
  }

  // 普通格式：80kg → 80
  const match = weightStr.match(/(\d+(\.\d+)?)/)
  return match ? parseFloat(match[1]) : 0
}

// 加载动作进步数据
const loadExerciseProgress = async (completedSessions) => {
  try {
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

    // 使用 Map 进行 O(1) 查找
    const sessionMap = new Map()
    completedSessions.forEach(session => {
      sessionMap.set(session.id, session)
    })

    // 按动作名称分组
    const progressByExercise = {}
    exercises.forEach(exercise => {
      const exerciseName = exercise.exercise_name
      if (!exerciseName) return

      if (!progressByExercise[exerciseName]) {
        progressByExercise[exerciseName] = []
      }

      const session = sessionMap.get(exercise.session_id)
      if (session && session.session_date) {
        const weight = parseWeight(exercise.weight)
        const repsMatch = exercise.reps_standard?.match(/(\d+)/)
        const reps = repsMatch ? parseInt(repsMatch[1]) : 0

        progressByExercise[exerciseName].push({
          date: session.session_date,
          weight: weight,
          reps: reps,
          sets: exercise.sets || 0,
          originalWeight: exercise.weight
        })
      }
    })

    // 转换为数组格式并排序
    exerciseProgressData.value = Object.keys(progressByExercise).map(name => ({
      name,
      data: progressByExercise[name].sort((a, b) => new Date(a.date) - new Date(b.date))
    }))

    if (exerciseProgressData.value.length > 0) {
      selectedExercise.value = exerciseProgressData.value[0].name
    }
  } catch (error) {
    console.error('加载动作进步数据失败:', error)
  }
}

// 加载训练统计
const loadTrainingStats = async () => {
  if (!memberId.value) return

  loadingStats.value = true
  try {
    // 1. 查询会员的训练计划
    const { data: plansData, error: plansError } = await supabase
      .from('member_plans')
      .select('template_id')
      .eq('member_id', memberId.value)

    if (plansError) throw plansError

    if (!plansData || plansData.length === 0) {
      trainingStats.value = {
        totalSessions: 0,
        monthSessions: 0,
        completionRate: 0,
        lastTrainingDate: '-'
      }
      frequencyData.value = []
      exerciseProgressData.value = []
      return
    }

    // 2. 查询所有已完成的训练课次
    const templateIds = plansData.map(p => p.template_id)
    const { data: completedSessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('id, template_id, completed, completed_date, session_date')
      .in('template_id', templateIds)
      .eq('completed', true)
      .order('session_date', { ascending: true })

    if (sessionsError) throw sessionsError

    if (!completedSessions || completedSessions.length === 0) {
      trainingStats.value = {
        totalSessions: 0,
        monthSessions: 0,
        completionRate: 0,
        lastTrainingDate: '-'
      }
      frequencyData.value = []
      exerciseProgressData.value = []
      return
    }

    // 3. 计算统计数据
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthSessions = completedSessions.filter(s => s.session_date && new Date(s.session_date) >= thisMonth)

    const lastSession = completedSessions[completedSessions.length - 1]
    const lastDate = new Date(lastSession.session_date || lastSession.completed_date)

    trainingStats.value = {
      totalSessions: completedSessions.length,
      monthSessions: monthSessions.length,
      completionRate: 100,
      lastTrainingDate: lastDate.toLocaleDateString('zh-CN')
    }

    // 4. 生成指定日期范围的训练频率数据
    const { startDate, endDate } = getDateRange()
    const frequencyDataArray = []

    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const count = completedSessions.filter(s => {
        const sessionDate = s.session_date ? s.session_date.split('T')[0] : ''
        return sessionDate === dateStr
      }).length

      frequencyDataArray.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count
      })
    }

    frequencyData.value = frequencyDataArray

    // 5. 查询动作进步数据
    await loadExerciseProgress(completedSessions)

  } catch (error) {
    console.error('加载训练统计失败:', error)
    ElMessage.error('加载训练统计失败')
  } finally {
    loadingStats.value = false
  }
}

// 处理日期范围变化
const handleDateRangeChange = () => {
  loadTrainingStats()
}

const handleCustomDateChange = () => {
  if (customDateRange.value && customDateRange.value.length === 2) {
    loadTrainingStats()
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

  // 检测是否包含"自重"格式
  const hasBodyweightFormat = exerciseData.data.some(d => d.originalWeight?.includes('自重'))

  const dates = exerciseData.data.map(d => new Date(d.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }))
  const weights = exerciseData.data.map(d => d.weight || 0)
  const reps = exerciseData.data.map(d => d.reps || 0)
  const sets = exerciseData.data.map(d => d.sets || 0)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = params[0].axisValue + '<br/>'
        params.forEach(param => {
          const dataIndex = param.dataIndex
          const value = param.value
          let displayValue = value

          if (param.seriesName === '重量' && hasBodyweightFormat) {
            const originalWeight = exerciseData.data[dataIndex]?.originalWeight
            if (originalWeight?.includes('自重')) {
              displayValue = originalWeight
            } else {
              displayValue = value + 'kg'
            }
          } else if (param.seriesName === '重量') {
            displayValue = value + 'kg'
          } else if (param.seriesName === '次数') {
            displayValue = value + '次'
          } else if (param.seriesName === '组数') {
            displayValue = value + '组'
          }

          result += param.marker + param.seriesName + ': ' + displayValue + '<br/>'
        })
        return result
      }
    },
    legend: {
      data: ['重量', '次数', '组数'],
      top: 0,
      left: 'center'
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: '重量 (kg)',
        position: 'left',
        axisLabel: {
          formatter: hasBodyweightFormat ? function(value) {
            if (value === 0) return '自重'
            if (value > 0) return '+' + value
            return value
          } : function(value) {
            return value
          }
        }
      },
      {
        type: 'value',
        name: '次数',
        position: 'right'
      },
      {
        type: 'value',
        name: '组数',
        position: 'right',
        offset: 60
      }
    ],
    series: [
      {
        name: '重量',
        type: 'line',
        data: weights,
        smooth: true,
        itemStyle: { color: '#67c23a' },
        yAxisIndex: 0
      },
      {
        name: '次数',
        type: 'line',
        data: reps,
        smooth: true,
        itemStyle: { color: '#e6a23c' },
        yAxisIndex: 1
      },
      {
        name: '组数',
        type: 'line',
        data: sets,
        smooth: true,
        itemStyle: { color: '#409eff' },
        yAxisIndex: 2
      }
    ],
    grid: {
      left: '3%',
      right: '15%',
      bottom: '3%',
      containLabel: true
    }
  }
})

// 页面加载
onMounted(async () => {
  loading.value = true
  memberId.value = await getCurrentMemberId()
  if (memberId.value) {
    await loadTrainingStats()
  }
  loading.value = false
})
</script>

<style scoped>
.my-progress-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  gap: 20px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.nav-menu {
  display: flex;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.nav-btn {
  padding: 8px 16px;
  background: #f5f7fa;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-btn:hover {
  background: #e8edf3;
}

.nav-btn.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.logout-btn {
  padding: 10px 20px;
  background: #f5576c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.logout-btn:hover {
  opacity: 0.8;
}

.stats-overview {
  margin-bottom: 20px;
}
</style>

