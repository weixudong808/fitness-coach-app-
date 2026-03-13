<template>
  <div class="coach-audit-container">
    <!-- 顶部导航 -->
    <div class="header-card">
      <h2>管理员中心 - 教练审核</h2>
      <button @click="handleLogout" class="logout-btn">退出登录</button>
    </div>

    <!-- 待审核教练列表 -->
    <div class="content-card">
      <h3>待审核教练列表</h3>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="pendingCoaches.length === 0" class="empty">
        暂无待审核的教练
      </div>

      <div v-else class="coach-list">
        <div v-for="coach in pendingCoaches" :key="coach.id" class="coach-item">
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
              <span class="label">申请时间：</span>
              <span class="value">{{ formatDate(coach.created_at) }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button @click="handleApprove(coach.id)" class="approve-btn">
              通过
            </button>
            <button @click="handleReject(coach.id)" class="reject-btn">
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示消息 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPendingCoaches } from '@/lib/api'
import { adminAuditCoach } from '@/lib/edge-functions'

const router = useRouter()
const loading = ref(false)
const pendingCoaches = ref([])
const message = ref('')
const messageType = ref('success')

// 加载待审核教练列表
const loadPendingCoaches = async () => {
  loading.value = true
  try {
    const result = await getPendingCoaches()
    if (result.success) {
      pendingCoaches.value = result.data
    } else {
      showMessage('加载失败：' + result.error, 'error')
    }
  } catch (error) {
    showMessage('加载失败：' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 通过审核
const handleApprove = async (coachId) => {
  try {
    const result = await adminAuditCoach(coachId, 'approved')
    if (result.success) {
      showMessage('审核通过！', 'success')
      await loadPendingCoaches()
    } else {
      showMessage('操作失败：' + result.error, 'error')
    }
  } catch (error) {
    showMessage('操作失败：' + error.message, 'error')
  }
}

// 拒绝审核
const handleReject = async (coachId) => {
  const reason = prompt('请输入拒绝原因：')
  if (!reason) {
    showMessage('请输入拒绝原因', 'error')
    return
  }

  try {
    const result = await adminAuditCoach(coachId, 'rejected', reason)
    if (result.success) {
      showMessage('已拒绝该教练申请', 'success')
      await loadPendingCoaches()
    } else {
      showMessage('操作失败：' + result.error, 'error')
    }
  } catch (error) {
    showMessage('操作失败：' + error.message, 'error')
  }
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
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
  localStorage.removeItem('adminToken')
  router.push('/admin/login')
}

onMounted(() => {
  loadPendingCoaches()
})
</script>

<style scoped>
.coach-audit-container {
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

.content-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
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

.action-buttons {
  display: flex;
  gap: 10px;
}

.approve-btn, .reject-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.approve-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.approve-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.reject-btn {
  background: #f5f5f5;
  color: #666;
}

.reject-btn:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
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
