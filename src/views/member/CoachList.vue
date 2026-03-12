<template>
  <div class="coach-list-container">
    <!-- 顶部导航 -->
    <div class="header-card">
      <h2>会员中心</h2>
      <div class="nav-buttons">
        <button @click="$router.push('/member/home')" class="nav-btn">
          首页
        </button>
        <button @click="$router.push('/member/plan')" class="nav-btn">
          训练计划
        </button>
        <button @click="$router.push('/member/progress')" class="nav-btn">
          我的进步
        </button>
        <button @click="$router.push('/member/achievements')" class="nav-btn">
          我的认证
        </button>
        <button class="nav-btn active">查找教练</button>
        <button @click="handleLogout" class="logout-btn">退出登录</button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-card">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索教练姓名或手机号..."
        @input="handleSearch"
        class="search-input"
      />
    </div>

    <!-- 教练列表 -->
    <div class="content-card">
      <h3>教练列表</h3>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="filteredCoaches.length === 0" class="empty">
        {{ searchKeyword ? '没有找到相关教练' : '暂无教练' }}
      </div>

      <div v-else class="coach-list">
        <div v-for="coach in filteredCoaches" :key="coach.id" class="coach-item">
          <div class="coach-info">
            <div class="info-row">
              <span class="label">姓名：</span>
              <span class="value">{{ coach.name }}</span>
            </div>
            <div class="info-row">
              <span class="label">手机号：</span>
              <span class="value">{{ coach.phone }}</span>
            </div>
            <div class="info-row">
              <span class="label">状态：</span>
              <span class="value status-approved">已认证</span>
            </div>
          </div>

          <div class="action-buttons">
            <button
              v-if="!isMyCoach(coach.id)"
              @click="handleApplyCoach(coach.id)"
              class="apply-btn"
            >
              申请跟随
            </button>
            <button v-else class="applied-btn" disabled>
              已跟随
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用邀请码 -->
    <div class="invite-card">
      <h3>使用邀请码</h3>
      <div class="invite-input-group">
        <input
          v-model="inviteCode"
          type="text"
          placeholder="请输入教练邀请码"
          class="invite-input"
        />
        <button @click="handleUseInviteCode" class="use-btn">
          使用
        </button>
      </div>
    </div>

    <!-- 提示消息 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getCoachList,
  memberApplyCoach,
  useInviteCode,
  getMemberCoaches
} from '@/lib/api'

const router = useRouter()
const loading = ref(false)
const coaches = ref([])
const myCoaches = ref([])
const searchKeyword = ref('')
const inviteCode = ref('')
const message = ref('')
const messageType = ref('success')

// 获取会员ID
const getMemberId = () => {
  const memberData = localStorage.getItem('memberData')
  if (memberData) {
    return JSON.parse(memberData).id
  }
  return null
}

// 过滤后的教练列表
const filteredCoaches = computed(() => {
  if (!searchKeyword.value) {
    return coaches.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return coaches.value.filter(coach =>
    coach.name.toLowerCase().includes(keyword) ||
    coach.phone.includes(keyword)
  )
})

// 判断是否已经是我的教练
const isMyCoach = (coachId) => {
  return myCoaches.value.some(coach => coach.id === coachId)
}

// 加载教练列表
const loadCoaches = async () => {
  loading.value = true
  try {
    coaches.value = await getCoachList()
  } catch (error) {
    showMessage('加载失败：' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 加载我的教练
const loadMyCoaches = async () => {
  try {
    const memberId = getMemberId()
    if (!memberId) return
    myCoaches.value = await getMemberCoaches(memberId)
  } catch (error) {
    console.error('加载我的教练失败：', error)
  }
}

// 申请跟随教练
const handleApplyCoach = async (coachId) => {
  try {
    const memberId = getMemberId()
    if (!memberId) {
      showMessage('请先登录', 'error')
      router.push('/member/auth')
      return
    }
    await memberApplyCoach(memberId, coachId)
    showMessage('申请已发送，等待教练审核', 'success')
    await loadMyCoaches()
  } catch (error) {
    showMessage('申请失败：' + error.message, 'error')
  }
}

// 使用邀请码
const handleUseInviteCode = async () => {
  if (!inviteCode.value.trim()) {
    showMessage('请输入邀请码', 'error')
    return
  }

  try {
    const memberId = getMemberId()
    if (!memberId) {
      showMessage('请先登录', 'error')
      router.push('/member/auth')
      return
    }
    await useInviteCode(inviteCode.value.trim(), memberId)
    showMessage('使用邀请码成功！已建立教练关系', 'success')
    inviteCode.value = ''
    await loadMyCoaches()
  } catch (error) {
    showMessage('使用失败：' + error.message, 'error')
  }
}

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
}

// 显示消息
const showMessage = (msg, type = 'success') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('memberData')
  router.push('/member/auth')
}

onMounted(() => {
  loadCoaches()
  loadMyCoaches()
})
</script>

<style scoped>
.coach-list-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.header-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-card h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.nav-buttons {
  display: flex;
  gap: 10px;
}

.nav-btn {
  padding: 10px 20px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.nav-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-btn:hover:not(.active) {
  background: #e0e0e0;
}

.logout-btn {
  padding: 10px 20px;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #ff3838;
  transform: translateY(-2px);
}

.search-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-card h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
}

.coach-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.coach-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.coach-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.coach-info {
  flex: 1;
}

.info-row {
  margin-bottom: 10px;
  font-size: 14px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  margin-left: 10px;
}

.status-approved {
  color: #10b981;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.apply-btn, .applied-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.apply-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.apply-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.applied-btn {
  background: #e0e0e0;
  color: #999;
  cursor: not-allowed;
}

.invite-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.invite-card h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
}

.invite-input-group {
  display: flex;
  gap: 10px;
}

.invite-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.invite-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.use-btn {
  padding: 12px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.use-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 25px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  z-index: 1000;
}

.message.success {
  background: #10b981;
}

.message.error {
  background: #ef4444;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
