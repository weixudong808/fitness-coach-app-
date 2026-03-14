<template>
  <div class="coach-members-container">
    <!-- 顶部导航 -->
    <div class="header-card">
      <h2>教练中心</h2>
      <div class="nav-buttons">
        <button @click="$router.push('/coach/invite-code')" class="nav-btn">
          邀请码管理
        </button>
        <button class="nav-btn active">会员管理</button>
        <button @click="handleLogout" class="logout-btn">退出登录</button>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tabs-card">
      <button
        :class="['tab-btn', { active: activeTab === 'members' }]"
        @click="activeTab = 'members'"
      >
        我的会员
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'pending' }]"
        @click="activeTab = 'pending'"
      >
        待处理申请
        <span v-if="pendingRequests.length > 0" class="badge">
          {{ pendingRequests.length }}
        </span>
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'unclaimed' }]"
        @click="activeTab = 'unclaimed'"
      >
        待认领会员
      </button>
    </div>

    <!-- 我的会员列表 -->
    <div v-if="activeTab === 'members'" class="content-card">
      <h3>我的会员列表</h3>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="members.length === 0" class="empty">
        暂无会员，快去邀请会员加入吧！
      </div>

      <div v-else class="member-list">
        <div v-for="member in members" :key="member.id" class="member-item">
          <div class="member-info">
            <div class="info-row">
              <span class="label">姓名：</span>
              <span class="value">{{ member.name }}</span>
            </div>
            <div class="info-row">
              <span class="label">性别：</span>
              <span class="value">{{ member.gender === 'male' ? '男' : '女' }}</span>
            </div>
            <div class="info-row">
              <span class="label">手机号：</span>
              <span class="value">{{ member.phone }}</span>
            </div>
            <div class="info-row">
              <span class="label">初始体重：</span>
              <span class="value">{{ member.initial_weight }}kg</span>
            </div>
            <div class="info-row">
              <span class="label">当前体重：</span>
              <span class="value">{{ member.current_weight }}kg</span>
            </div>
          </div>

          <div class="action-buttons">
            <button @click="handleDeleteMember(member.relationId)" class="delete-btn">
              删除会员
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 待处理申请 -->
    <div v-if="activeTab === 'pending'" class="content-card">
      <h3>待处理申请</h3>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="pendingRequests.length === 0" class="empty">
        暂无待处理的申请
      </div>

      <div v-else class="request-list">
        <div v-for="request in pendingRequests" :key="request.id" class="request-item">
          <div class="request-info">
            <div class="info-row">
              <span class="label">会员姓名：</span>
              <span class="value">{{ request.members?.name || request.member_name || '未知' }}</span>
            </div>
            <div class="info-row">
              <span class="label">申请时间：</span>
              <span class="value">{{ formatDate(request.created_at) }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button @click="handleApproveRequest(request.id)" class="approve-btn">
              通过
            </button>
            <button @click="handleRejectRequest(request.id)" class="reject-btn">
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 待认领会员 -->
    <div v-if="activeTab === 'unclaimed'" class="content-card">
      <h3>待认领会员</h3>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="unclaimedMembers.length === 0" class="empty">
        暂无待认领的会员
      </div>

      <div v-else class="member-list">
        <div v-for="member in unclaimedMembers" :key="member.id" class="member-item">
          <div class="member-info">
            <div class="info-row">
              <span class="label">姓名：</span>
              <span class="value">{{ member.name }}</span>
            </div>
            <div class="info-row">
              <span class="label">性别：</span>
              <span class="value">{{ member.gender === 'male' ? '男' : '女' }}</span>
            </div>
            <div class="info-row">
              <span class="label">手机号：</span>
              <span class="value">{{ member.phone }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button @click="handleAddMember(member.id)" class="add-btn">
              添加为我的会员
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
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getUnclaimedMembers,
  coachAuditMemberApply,
  coachAddMember
} from '@/lib/api'
import {
  getCoachMembers,
  getCoachPendingRequests,
  coachDeleteMember
} from '@/lib/api-relations'

const router = useRouter()
const activeTab = ref('members')
const loading = ref(false)
const members = ref([])
const pendingRequests = ref([])
const unclaimedMembers = ref([])
const message = ref('')
const messageType = ref('success')

// 获取教练ID（兼容新老用户）
const getCoachId = () => {
  const coachData = localStorage.getItem('coachData')
  if (coachData) {
    try {
      const parsed = JSON.parse(coachData)
      if (parsed.id) return parsed.id
    } catch (e) {
      console.error('解析coachData失败:', e)
    }
  }
  // 兜底：老用户的 userId 直接就是 coaches.id
  const userId = localStorage.getItem('userId')
  if (userId) return userId
  return null
}

// 加载我的会员列表
const loadMembers = async () => {
  loading.value = true
  try {
    const coachId = getCoachId()
    if (!coachId) {
      showMessage('请先登录', 'error')
      router.push('/coach/auth')
      return
    }
    const result = await getCoachMembers(coachId)
    if (result.success) {
      // 提取会员信息，同时保留关系ID（用于删除会员时使用）
      members.value = result.data.map(item => ({
        ...item.members,
        relationId: item.id  // 保留关系ID，删除时必须用这个
      }))
    } else {
      showMessage('加载失败：' + result.error, 'error')
    }
  } catch (error) {
    showMessage('加载失败：' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 加载待处理申请
const loadPendingRequests = async () => {
  loading.value = true
  try {
    const coachId = getCoachId()
    if (!coachId) return
    const result = await getCoachPendingRequests(coachId)
    if (result.success) {
      pendingRequests.value = result.data
    } else {
      showMessage('加载失败：' + result.error, 'error')
    }
  } catch (error) {
    showMessage('加载失败：' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 加载待认领会员
const loadUnclaimedMembers = async () => {
  loading.value = true
  try {
    const result = await getUnclaimedMembers()
    if (result.success) {
      unclaimedMembers.value = result.data
    } else {
      showMessage('加载失败：' + result.error, 'error')
    }
  } catch (error) {
    showMessage('加载失败：' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 通过申请
const handleApproveRequest = async (relationId) => {
  try {
    await coachAuditMemberApply(relationId, 'approved')
    showMessage('已通过申请', 'success')
    await loadPendingRequests()
    await loadMembers()
  } catch (error) {
    showMessage('操作失败：' + error.message, 'error')
  }
}

// 拒绝申请
const handleRejectRequest = async (relationId) => {
  try {
    await coachAuditMemberApply(relationId, 'rejected')
    showMessage('已拒绝申请', 'success')
    await loadPendingRequests()
  } catch (error) {
    showMessage('操作失败：' + error.message, 'error')
  }
}

// 添加会员
const handleAddMember = async (memberId) => {
  try {
    const coachId = getCoachId()
    if (!coachId) return
    await coachAddMember(coachId, memberId)
    showMessage('已发送添加请求，等待会员确认', 'success')
    await loadUnclaimedMembers()
  } catch (error) {
    showMessage('操作失败：' + error.message, 'error')
  }
}

// 删除会员
const handleDeleteMember = async (relationId) => {
  if (!confirm('确定要删除这个会员吗？')) return

  try {
    await coachDeleteMember(relationId)  // 只传关系ID
    showMessage('已删除会员', 'success')
    await loadMembers()
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
  localStorage.removeItem('coachData')
  router.push('/coach/auth')
}

// 监听tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'members') {
    loadMembers()
  } else if (newTab === 'pending') {
    loadPendingRequests()
  } else if (newTab === 'unclaimed') {
    loadUnclaimedMembers()
  }
})

onMounted(() => {
  loadMembers()
})
</script>

<style scoped>
.coach-members-container {
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

.tabs-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  position: relative;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tab-btn:hover:not(.active) {
  background: #e0e0e0;
}

.badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4757;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
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

.member-list, .request-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.member-item, .request-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.member-item:hover, .request-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.member-info, .request-info {
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

.approve-btn, .add-btn, .delete-btn, .reject-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.approve-btn, .add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.approve-btn:hover, .add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.delete-btn {
  background: #ff4757;
  color: white;
}

.delete-btn:hover {
  background: #ff3838;
  transform: translateY(-2px);
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
