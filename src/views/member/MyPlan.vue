<template>
  <div class="my-plan-container">
    <!-- 顶部导航菜单 -->
    <el-menu
      :default-active="activeMenu"
      mode="horizontal"
      @select="handleMenuSelect"
      style="margin-bottom: 20px;"
    >
      <el-menu-item index="plan">我的训练计划</el-menu-item>
      <el-menu-item index="progress">我的进步</el-menu-item>
      <el-menu-item index="achievements">我的认证</el-menu-item>
      <div style="flex: 1;"></div>
      <el-button type="danger" @click="handleLogout" style="margin: 12px 20px;">退出登录</el-button>
    </el-menu>

    <el-card>
      <template #header>
        <div class="card-header">
          <h2>我的训练计划</h2>
        </div>
      </template>

      <!-- 训练计划列表 -->
      <div v-loading="loading">
        <div v-if="activePlans.length > 0" class="plans-section">
          <h3>进行中的计划</h3>
          <el-row :gutter="20">
            <el-col :span="24" :md="12" v-for="plan in activePlans" :key="plan.id">
              <el-card class="plan-card" shadow="hover" @click="viewPlanDetail(plan)">
                <div class="plan-header">
                  <h4>{{ plan.template_name }}</h4>
                  <el-tag type="success">进行中</el-tag>
                </div>
                <div class="plan-info">
                  <p><strong>训练目标：</strong>{{ plan.target_goal }}</p>
                  <p><strong>开始日期：</strong>{{ formatDate(plan.start_date) }}</p>
                  <p v-if="plan.notes"><strong>备注：</strong>{{ plan.notes }}</p>
                </div>
                <el-button type="primary" size="small" style="width: 100%">
                  查看训练详情
                </el-button>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <div v-if="completedPlans.length > 0" class="plans-section" style="margin-top: 30px">
          <h3>已完成的计划</h3>
          <el-collapse>
            <el-collapse-item v-for="plan in completedPlans" :key="plan.id" :title="plan.template_name">
              <div class="plan-info">
                <p><strong>训练目标：</strong>{{ plan.target_goal }}</p>
                <p><strong>开始日期：</strong>{{ formatDate(plan.start_date) }}</p>
                <p><strong>结束日期：</strong>{{ formatDate(plan.end_date) }}</p>
                <p v-if="plan.notes"><strong>备注：</strong>{{ plan.notes }}</p>
              </div>
              <el-button type="primary" size="small" @click="viewPlanDetail(plan)">
                查看训练详情
              </el-button>
            </el-collapse-item>
          </el-collapse>
        </div>

        <el-empty v-if="activePlans.length === 0 && completedPlans.length === 0 && !loading"
                  description="暂无训练计划，请联系教练分配训练计划" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../lib/supabase'

const router = useRouter()
const { signOut, user, getCurrentUser } = useAuth()

const loading = ref(false)
const plans = ref([])
const activeMenu = ref('plan')

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

// 进行中的计划
const activePlans = computed(() => {
  return plans.value.filter(plan => plan.status === 'active')
})

// 已完成的计划
const completedPlans = computed(() => {
  return plans.value.filter(plan => plan.status === 'completed')
})

// 加载训练计划
const loadPlans = async () => {
  loading.value = true
  try {
    // 获取当前用户
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }

    // 通过 user_id 查找 member_id
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', currentUser.id)
      .single()

    if (memberError) throw memberError

    // 查询该会员的训练计划
    const { data: plansData, error: plansError } = await supabase
      .from('member_plans')
      .select('*')
      .eq('member_id', memberData.id)
      .order('created_at', { ascending: false })

    if (plansError) throw plansError

    if (!plansData || plansData.length === 0) {
      plans.value = []
      return
    }

    // 获取所有相关的模板信息
    const templateIds = [...new Set(plansData.map(plan => plan.template_id))]
    const { data: templatesData, error: templatesError } = await supabase
      .from('training_templates')
      .select('id, name, target_goal, difficulty_level')
      .in('id', templateIds)

    if (templatesError) throw templatesError

    // 创建模板映射
    const templateMap = {}
    templatesData?.forEach(template => {
      templateMap[template.id] = template
    })

    // 合并数据
    const formattedData = plansData.map(plan => {
      const template = templateMap[plan.template_id] || {}
      return {
        ...plan,
        template_name: template.name || '未知模板',
        target_goal: template.target_goal || '-',
        difficulty_level: template.difficulty_level || '-'
      }
    })

    plans.value = formattedData
  } catch (error) {
    console.error('加载训练计划失败:', error)
    ElMessage.error('加载训练计划失败')
  } finally {
    loading.value = false
  }
}

// 查看计划详情
const viewPlanDetail = (plan) => {
  console.log('查看计划详情:', plan)
  router.push({
    name: 'member-plan-detail',
    params: { planId: plan.id }
  })
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 退出登录
const handleLogout = async () => {
  const result = await signOut()
  if (result.success) {
    ElMessage.success('已退出登录')
    router.push('/login')
  } else {
    ElMessage.error('退出失败')
  }
}

onMounted(() => {
  loadPlans()
})
</script>

<style scoped>
.my-plan-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
}

.plans-section h3 {
  margin-bottom: 20px;
  color: #333;
}

.plan-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.2s;
}

.plan-card:hover {
  transform: translateY(-5px);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.plan-header h4 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.plan-info {
  margin-bottom: 15px;
}

.plan-info p {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}
</style>
