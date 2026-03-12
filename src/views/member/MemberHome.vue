<template>
  <div class="my-achievements-container">
    <!-- 顶部导航 -->
    <div class="header">
      <h1>会员中心</h1>
      <div class="nav-menu">
        <button @click="goToPage('/member/home')" class="nav-btn active">首页</button>
        <button @click="goToPage('/member/plan')" class="nav-btn">训练计划</button>
        <button @click="goToPage('/member/progress')" class="nav-btn">我的进步</button>
        <button @click="goToPage('/member/achievements')" class="nav-btn">我的认证</button>
        <button @click="goToPage('/member/coaches')" class="nav-btn">查找教练</button>
      </div>
      <button @click="handleLogout" class="logout-btn">退出登录</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="content">
      <!-- 会员基本信息 -->
      <div class="info-card">
        <h2>基本信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">姓名：</span>
            <span class="value">{{ memberInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">性别：</span>
            <span class="value">{{ memberInfo.gender === 'male' ? '男' : '女' }}</span>
          </div>
          <div class="info-item">
            <span class="label">手机号：</span>
            <span class="value">{{ memberInfo.phone }}</span>
          </div>
        </div>
      </div>

      <!-- 体重变化 -->
      <div class="weight-card">
        <h2>体重变化</h2>
        <div class="weight-stats">
          <div class="stat-item">
            <div class="stat-label">初始体重</div>
            <div class="stat-value">{{ memberInfo.initial_weight }} kg</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">当前体重</div>
            <div class="stat-value">{{ memberInfo.current_weight || memberInfo.initial_weight }} kg</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">体重变化</div>
            <div class="stat-value" :class="weightChangeClass">
              {{ weightChange > 0 ? '+' : '' }}{{ weightChange }} kg
            </div>
          </div>
        </div>
      </div>

      <!-- 我的教练 -->
      <div class="coaches-card">
        <h2>我的教练</h2>
        <div v-if="coaches.length === 0" class="empty-state">
          <p>还没有关联教练</p>
          <button @click="goToCoachList" class="primary-btn">查找教练</button>
        </div>
        <div v-else class="coach-list">
          <div v-for="coach in coaches" :key="coach.id" class="coach-item">
            <div class="coach-info">
              <div class="coach-name">{{ coach.name }}</div>
              <div class="coach-phone">{{ coach.phone }}</div>
            </div>
            <div class="coach-status">
              <span class="status-badge">已关联</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="actions-card">
        <h2>快捷操作</h2>
        <div class="action-buttons">
          <button @click="goToCoachList" class="action-btn">
            <span class="action-icon">👥</span>
            <span class="action-text">查找教练</span>
          </button>
          <button @click="updateWeight" class="action-btn">
            <span class="action-icon">⚖️</span>
            <span class="action-text">更新体重</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { getMemberCoaches } from '@/lib/api-relations'

const router = useRouter()
const loading = ref(false)
const memberInfo = ref({
  id: '',
  name: '',
  phone: '',
  gender: '',
  initial_weight: 0,
  current_weight: 0
})
const coaches = ref<any[]>([])

// 体重变化
const weightChange = computed(() => {
  const current = memberInfo.value.current_weight || memberInfo.value.initial_weight
  return Number((current - memberInfo.value.initial_weight).toFixed(1))
})

const weightChangeClass = computed(() => {
  if (weightChange.value > 0) return 'weight-up'
  if (weightChange.value < 0) return 'weight-down'
  return ''
})

// 加载会员信息
const loadMemberInfo = async () => {
  const userId = localStorage.getItem('userId')
  if (!userId) {
    alert('请先登录')
    router.push('/member/auth')
    return
  }

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('加载会员信息失败:', error)
    alert('加载信息失败')
    return
  }

  memberInfo.value = data
}

// 加载关联的教练
const loadCoaches = async () => {
  const userId = localStorage.getItem('userId')
  if (!userId) return

  const result = await getMemberCoaches(userId)
  if (result.success) {
    // 提取教练信息
    coaches.value = result.data.map((item: any) => item.coaches)
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    await loadMemberInfo()
    await loadCoaches()
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 跳转到教练列表
const goToCoachList = () => {
  alert('教练列表页面开发中...')
}

// 跳转到指定页面
const goToPage = (path: string) => {
  router.push(path)
}

// 更新体重
const updateWeight = () => {
  const newWeight = prompt('请输入当前体重（kg）：', String(memberInfo.value.current_weight || memberInfo.value.initial_weight))
  if (newWeight && !isNaN(Number(newWeight))) {
    // TODO: 调用更新体重的 API
    alert('体重更新功能开发中...')
  }
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('userType')
  localStorage.removeItem('userId')
  localStorage.removeItem('userName')
  localStorage.removeItem('userGender')
  router.push('/member/auth')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.my-achievements-container {
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

.loading {
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #666;
}

.content {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card,
.weight-card,
.coaches-card,
.actions-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-card h2,
.weight-card h2,
.coaches-card h2,
.actions-card h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  color: #333;
}

.weight-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-value.weight-up {
  color: #f5576c;
}

.stat-value.weight-down {
  color: #67c23a;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #666;
}

.primary-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.primary-btn:hover {
  transform: translateY(-2px);
}

.coach-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coach-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.coach-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coach-name {
  font-weight: 500;
  color: #333;
}

.coach-phone {
  font-size: 14px;
  color: #666;
}

.status-badge {
  padding: 6px 12px;
  background: #67c23a;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  background: #f5f7fa;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #e8edf3;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 32px;
}

.action-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
</style>
