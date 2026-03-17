<template>
  <div class="member-detail-container">
    <!-- 返回按钮 -->
    <div class="back-header">
      <button @click="goBack" class="back-btn">
        <span>←</span>
        <span>返回</span>
      </button>
      <div class="page-title">会员详情</div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误状态 -->
    <div v-else-if="errorMessage" class="error-state">
      <div class="error-icon">⚠️</div>
      <div class="error-text">{{ errorMessage }}</div>
      <button @click="loadMemberDetail" class="retry-btn">重试</button>
    </div>

    <template v-else>
      <!-- 会员信息卡片 -->
      <div class="info-card">
        <div class="card-header">
          <div class="card-title">会员信息</div>
          <button @click="handleEditMember" class="edit-btn">编辑</button>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">姓名</div>
            <div class="info-value">{{ member?.name }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">性别</div>
            <div class="info-value">{{ member?.gender === 'male' ? '男' : '女' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">年龄</div>
            <div class="info-value">{{ member?.age }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">电话</div>
            <div class="info-value">{{ member?.phone }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">邮箱</div>
            <div class="info-value">{{ member?.email || '-' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">身高</div>
            <div class="info-value">{{ member?.height }} cm</div>
          </div>
          <div class="info-item">
            <div class="info-label">初始体重</div>
            <div class="info-value">{{ member?.initial_weight }} kg</div>
          </div>
          <div class="info-item">
            <div class="info-label">初始体脂率</div>
            <div class="info-value">{{ member?.initial_body_fat }}%</div>
          </div>
          <div class="info-item info-item-full">
            <div class="info-label">注册时间</div>
            <div class="info-value">{{ formatDate(member?.created_at) }}</div>
          </div>
        </div>
      </div>

      <!-- 训练计划卡片 -->
      <div class="info-card">
        <div class="card-header">
          <div class="card-title">训练计划</div>
          <div class="plan-actions-header">
            <button @click="handlePlanCommand('from-template')" class="add-plan-btn">
              <span>📋</span>
              <span>从模板选择</span>
            </button>
            <button @click="handlePlanCommand('create-exclusive')" class="add-plan-btn">
              <span>✏️</span>
              <span>创建专属计划</span>
            </button>
          </div>
        </div>

        <div v-if="memberPlans.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <div>暂无训练计划</div>
        </div>

        <div v-else class="plan-list">
          <div v-for="plan in memberPlans" :key="plan.id" class="plan-item">
            <div class="plan-info">
              <div class="plan-name">{{ plan.template_name }}</div>
              <div class="plan-meta">
                <span>目标：{{ plan.target_goal }}</span>
                <span>开始：{{ formatDateShort(plan.start_date) }}</span>
                <span v-if="plan.end_date">结束：{{ formatDateShort(plan.end_date) }}</span>
                <span v-if="plan.notes">备注：{{ plan.notes }}</span>
              </div>
            </div>
            <div class="plan-actions">
              <span :class="['status-badge',
                plan.status === 'completed' ? 'completed' : '',
                plan.status === 'cancelled' ? 'cancelled' : '']">
                {{ getStatusLabel(plan.status) }}
              </span>
              <button @click="goToPlanDetail(plan.id)" class="view-detail-btn">查看详情</button>
              <button v-if="plan.status === 'active'" @click="handleCancelPlan(plan.id)" class="cancel-btn">
                取消
              </button>
              <button @click="handleDeletePlan(plan.id)" class="delete-btn">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 进步统计卡片 -->
      <div class="info-card">
        <div class="card-header">
          <div class="card-title">进步统计</div>
        </div>

        <div v-if="loadingStats" class="loading-stats">加载统计数据中...</div>

        <template v-else>
          <div v-if="trainingStats.totalSessions > 0">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ trainingStats.totalSessions }}</div>
                <div class="stat-label">总训练次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ trainingStats.monthSessions }}</div>
                <div class="stat-label">本月训练次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ trainingStats.completionRate }}%</div>
                <div class="stat-label">计划完成率</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ trainingStats.lastTrainingDate }}</div>
                <div class="stat-label">最近训练</div>
              </div>
            </div>

            <!-- 训练频率趋势 -->
            <div class="chart-section">
              <div class="chart-header">
                <div class="chart-title">训练频率趋势</div>
                <div class="date-filter">
                  <select v-model="dateRangeType" @change="handleDateRangeChange" class="date-select">
                    <option value="thisMonth">本月</option>
                    <option value="lastMonth">上月</option>
                    <option value="recent30">最近30天</option>
                    <option value="custom">自定义</option>
                  </select>
                  <div v-if="dateRangeType === 'custom'" class="custom-date-range">
                    <input type="date" v-model="customDateRange[0]" class="date-input" />
                    <span>至</span>
                    <input type="date" v-model="customDateRange[1]" class="date-input" />
                    <button @click="applyCustomDateRange" class="apply-btn">应用</button>
                  </div>
                </div>
              </div>
              <div class="chart-container">
                <v-chart :option="frequencyChartOption" style="height: 300px;" />
              </div>
            </div>

            <!-- 动作进步趋势 -->
            <div v-if="exerciseProgressData.length > 0" class="chart-section">
              <div class="chart-header">
                <div class="chart-title">动作进步趋势</div>
              </div>
              <div class="exercise-selector">
                <label>选择动作：</label>
                <select v-model="selectedExercise" class="exercise-select">
                  <option v-for="exercise in exerciseProgressData" :key="exercise.name" :value="exercise.name">
                    {{ exercise.name }}
                  </option>
                </select>
              </div>
              <div class="chart-container">
                <v-chart :option="progressChartOption" style="height: 350px;" />
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">📊</div>
            <div>暂无训练数据</div>
          </div>
        </template>
      </div>
    </template>

    <!-- 编辑会员对话框 - 保留Element Plus -->
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
          <input
            v-model.number="memberForm.age"
            type="number"
            :min="1"
            :max="120"
            :disabled="saving"
            class="custom-input"
            placeholder="请输入年龄"
            @blur="memberFormRef?.validateField('age')"
          />
        </el-form-item>

        <el-form-item label="电话" prop="phone">
          <el-input v-model="memberForm.phone" placeholder="请输入电话" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="memberForm.email" placeholder="请输入邮箱（选填）" />
        </el-form-item>

        <el-form-item label="身高(cm)" prop="height">
          <input
            v-model.number="memberForm.height"
            type="number"
            :min="100"
            :max="250"
            :disabled="saving"
            class="custom-input"
            placeholder="请输入身高"
            @blur="memberFormRef?.validateField('height')"
          />
        </el-form-item>

        <el-form-item label="初始体重(kg)" prop="initial_weight">
          <input
            v-model.number="memberForm.initial_weight"
            type="number"
            :min="30"
            :max="300"
            step="0.1"
            :disabled="saving"
            class="custom-input"
            placeholder="请输入初始体重"
            @blur="memberFormRef?.validateField('initial_weight')"
          />
        </el-form-item>

        <el-form-item label="初始体脂率(%)" prop="initial_body_fat">
          <input
            v-model.number="memberForm.initial_body_fat"
            type="number"
            :min="5"
            :max="60"
            step="0.1"
            :disabled="saving"
            class="custom-input"
            placeholder="请输入初始体脂率（选填）"
            @blur="memberFormRef?.validateField('initial_body_fat')"
          />
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
import { ref, onMounted, onUnmounted, computed, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
// 移除 Element Plus 图标导入（已不需要）
// import { ArrowDown, Document, Edit } from '@element-plus/icons-vue'
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
const errorMessage = ref('') // 新增错误状态

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
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' },
    { type: 'number', min: 1, max: 120, message: '年龄必须在1-120之间', trigger: 'blur' }
  ],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  height: [
    { required: true, message: '请输入身高', trigger: 'blur' },
    { type: 'number', min: 100, max: 250, message: '身高必须在100-250cm之间', trigger: 'blur' }
  ],
  initial_weight: [
    { required: true, message: '请输入初始体重', trigger: 'blur' },
    { type: 'number', min: 30, max: 300, message: '体重必须在30-300kg之间', trigger: 'blur' }
  ],
  initial_body_fat: [
    { type: 'number', min: 5, max: 60, message: '体脂率必须在5-60%之间', trigger: 'blur' }
  ]
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
const dateRangeType = ref('recent30') // 'thisMonth' | 'lastMonth' | 'recent30' | 'custom'
const customDateRange = ref([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
])

// 计算日期范围
const getDateRange = () => {
  const today = new Date()
  let startDate, endDate

  switch (dateRangeType.value) {
    case 'thisMonth':
      // 本月第一天到今天
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = today
      break

    case 'lastMonth':
      // 上月第一天到上月最后一天
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      startDate = lastMonth
      endDate = new Date(today.getFullYear(), today.getMonth(), 0) // 上月最后一天
      break

    case 'recent30':
      // 最近30天
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      endDate = today
      break

    case 'custom':
      // 自定义日期
      if (customDateRange.value && customDateRange.value.length === 2) {
        startDate = new Date(customDateRange.value[0])
        endDate = new Date(customDateRange.value[1])
      } else {
        // 默认最近30天
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

const loadMemberDetail = async () => {
  loading.value = true
  errorMessage.value = '' // 清空错误信息
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
    errorMessage.value = '加载会员详情失败，请重试' // 设置错误信息
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
      .order('session_date', { ascending: true })

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
    const monthSessions = completedSessions.filter(s => s.session_date && new Date(s.session_date) >= thisMonth)

    const lastSession = completedSessions[completedSessions.length - 1]
    const lastDate = new Date(lastSession.session_date || lastSession.completed_date)

    trainingStats.value = {
      totalSessions: completedSessions.length,
      monthSessions: monthSessions.length,
      completionRate: 100, // 所有记录都是已完成的
      lastTrainingDate: lastDate.toLocaleDateString('zh-CN')
    }

    // 4. 生成指定日期范围的训练频率数据
    const { startDate, endDate } = getDateRange()
    const frequencyDataArray = []

    // 计算日期范围内的天数
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      // 使用 session_date（实际训练日期）进行统计
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

// 处理日期范围类型变化
const handleDateRangeChange = () => {
  // 如果不是自定义模式，立即加载数据
  if (dateRangeType.value !== 'custom') {
    loadTrainingStats()
  }
}

// 应用自定义日期范围
const applyCustomDateRange = () => {
  const [start, end] = customDateRange.value

  // 校验：必填
  if (!start || !end) {
    ElMessage.warning('请选择开始和结束日期')
    return
  }

  // 校验：开始日期不能晚于结束日期
  if (new Date(start) > new Date(end)) {
    ElMessage.warning('开始日期不能晚于结束日期')
    return
  }

  loadTrainingStats()
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
      if (session && session.session_date) {
        // 解析重量（支持自重格式）
        const parseWeight = (weightStr) => {
          if (!weightStr) return 0

          // 处理"自重"格式
          if (weightStr.includes('自重')) {
            // 自重 → 0
            if (weightStr === '自重') return 0

            // 自重+10kg → 10
            const plusMatch = weightStr.match(/自重\+(\d+(\.\d+)?)/)
            if (plusMatch) return parseFloat(plusMatch[1])

            // 自重-10kg → -10
            const minusMatch = weightStr.match(/自重-(\d+(\.\d+)?)/)
            if (minusMatch) return -parseFloat(minusMatch[1])

            return 0
          }

          // 普通格式：80kg → 80
          const match = weightStr.match(/(\d+(\.\d+)?)/)
          return match ? parseFloat(match[1]) : 0
        }

        const weight = parseWeight(exercise.weight)

        // 提取次数数值
        const repsMatch = exercise.reps_standard?.match(/(\d+)/)
        const reps = repsMatch ? parseInt(repsMatch[1]) : 0

        progressByExercise[exerciseName].push({
          date: session.session_date,
          weight: weight,
          reps: reps,
          sets: exercise.sets || 0,
          originalWeight: exercise.weight // 保留原始重量字符串
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

  // 检测是否包含"自重"格式
  const hasBodyweightFormat = exerciseData.data.some(d => d.originalWeight?.includes('自重'))

  const dates = exerciseData.data.map(d => new Date(d.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }))
  const weights = exerciseData.data.map(d => {
    // weight 已经是数字类型，直接使用
    return d.weight || 0
  })
  const reps = exerciseData.data.map(d => {
    // reps 已经是数字类型，直接使用
    return d.reps || 0
  })
  const sets = exerciseData.data.map(d => {
    // sets 已经是数字类型，直接使用
    return d.sets || 0
  })

  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = params[0].axisValue + '<br/>'
        params.forEach(param => {
          const dataIndex = param.dataIndex
          const value = param.value
          let displayValue = value

          // 为重量添加特殊说明
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
      },
      {
        name: '组数',
        type: 'line',
        data: sets,
        smooth: true,
        itemStyle: {
          color: '#409eff'
        },
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
  background: #f5f7fa;
  padding: 20px;
  min-height: 100vh;
}

/* 返回按钮 */
.back-header {
  background: white;
  border-radius: 12px;
  padding: 20px 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.back-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.back-btn:hover {
  background: #e0e0e0;
  transform: translateX(-2px);
}

.page-title {
  font-size: 20px;
  color: #333;
  font-weight: 600;
}

/* 加载状态 */
.loading {
  text-align: center;
  padding: 60px;
  color: #999;
  font-size: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-stats {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.error-text {
  color: #ef4444;
  font-size: 16px;
  margin-bottom: 20px;
}

.retry-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 信息卡片 */
.info-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f5f5f5;
}

.card-title {
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

/* 编辑按钮 */
.edit-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.edit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.info-item-full {
  grid-column: 1 / -1;
}

.info-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
  min-width: 100px;
}

.info-value {
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

/* 计划操作按钮组 */
.plan-actions-header {
  display: flex;
  gap: 10px;
}

.add-plan-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.add-plan-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 训练计划列表 */
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.plan-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #667eea;
}

.plan-info {
  flex: 1;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.plan-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #666;
  flex-wrap: wrap;
}

.plan-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.view-detail-btn {
  padding: 8px 16px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.view-detail-btn:hover {
  background: #7c3aed;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.cancel-btn {
  padding: 8px 16px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.cancel-btn:hover {
  background: #d97706;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.delete-btn {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.delete-btn:hover {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* 状态标签 */
.status-badge {
  padding: 4px 12px;
  background: #dcfce7;
  color: #166534;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.completed {
  background: #e0e7ff;
  color: #4338ca;
}

.status-badge.cancelled {
  background: #fef3c7;
  color: #92400e;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 20px;
  color: white;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
}

/* 图表区域 */
.chart-section {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.date-filter label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.date-select {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.date-select:hover {
  border-color: #667eea;
}

.date-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-input {
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.date-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.custom-date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-date-range span {
  color: #666;
  font-size: 13px;
}

.apply-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.apply-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.date-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.date-separator {
  color: #666;
  font-size: 13px;
}

.chart-container {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
}

/* 动作选择器 */
.exercise-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.exercise-selector label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.exercise-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 200px;
}

.exercise-select:hover {
  border-color: #667eea;
}

.exercise-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .member-detail-container {
    padding: 10px;
  }

  .back-header {
    padding: 15px 20px;
  }

  .info-card {
    padding: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .plan-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .plan-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .plan-actions-header {
    flex-direction: column;
    width: 100%;
  }

  .add-plan-btn {
    width: 100%;
    justify-content: center;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

.card-header h3 {
  margin: 0;
}
</style>
