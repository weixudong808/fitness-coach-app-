<template>
  <div class="admin-coaches-container">
    <!-- 顶部导航 -->
    <div class="header-card">
      <h2>管理员中心</h2>
      <div class="nav-buttons">
        <button @click="$router.push('/admin/audit')" class="nav-btn">教练审核</button>
        <button class="nav-btn active">在册教练</button>
        <button @click="handleLogout" class="logout-btn">退出登录</button>
      </div>
    </div>

    <!-- 在册教练列表 -->
    <div class="content-card">
      <h3>在册教练列表</h3>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="coaches.length === 0" class="empty">
        暂无在册教练
      </div>

      <div v-else class="coach-list">
        <div v-for="coach in coaches" :key="coach.id" class="coach-item">
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
              <span class="label">审核时间：</span>
              <span class="value">{{ formatDate(coach.updated_at) }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button @click="handleTerminate(coach)" class="terminate-btn">
              解除合作
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示消息 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>

    <!-- 解除合作弹窗 -->
    <div v-if="showTerminateModal" class="modal-overlay">
      <div class="modal">
        <h3>解除合作</h3>
        <p>确定要与教练 <strong>{{ selectedCoach?.name }}</strong> 解除合作吗？</p>
        <div class="form-group">
          <label>解约原因（必填）</label>
          <textarea
            v-model="terminateReason"
            placeholder="请输入解约原因..."
            rows="4"
          ></textarea>
        </div>
        <div class="modal-buttons">
          <button @click="showTerminateModal = false" class="cancel-btn">取消</button>
          <button @click="confirmTerminate" class="confirm-btn" :disabled="!terminateReason.trim()">
            确认解约
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { adminTerminateCoach } from '@/lib/edge-functions'

const router = useRouter()
const loading = ref(false)
const coaches = ref([])
const message = ref('')
const messageType = ref('success')
const showTerminateModal = ref(false)
const selectedCoach = ref(null)
const terminateReason = ref('')

// 加载在册教练列表
// 条件：audit_status='approved' 且 cooperation_status='active'（或为空，默认视为在册）
const loadCoaches = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('id, name, phone, updated_at, cooperation_status')
      .eq('audit_status', 'approved')
      .or('cooperation_status.eq.active,cooperation_status.is.null')
      .order('updated_at', { ascending: false })

    if (error) throw error
    coaches.value = data || []
  } catch (error) {
    showMessage('加载失败：' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 点击解除合作按钮
const handleTerminate = (coach) => {
  selectedCoach.value = coach
  terminateReason.value = ''
  showTerminateModal.value = true
}

// 确认解约
const confirmTerminate = async () => {
  if (!terminateReason.value.trim()) {
    showMessage('请填写解约原因', 'error')
    return
  }

  try {
    const result = await adminTerminateCoach(selectedCoach.value.id, terminateReason.value.trim())
    if (result.success) {
      showMessage('已成功解除合作', 'success')
      showTerminateModal.value = false
      await loadCoaches()
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
const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/admin/login')
}

onMounted(() => {
  loadCoaches()
})
</script>

<style scoped>
.admin-coaches-container {
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

.terminate-btn {
  padding: 10px 24px;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.terminate-btn:hover {
  background: #ff3838;
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

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 20px;
}

.modal p {
  color: #666;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn {
  padding: 10px 24px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.confirm-btn {
  padding: 10px 24px;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.confirm-btn:hover:not(:disabled) {
  background: #ff3838;
  transform: translateY(-2px);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
