<template>
  <div class="notifications-container">
    <div class="notifications-header">
      <h3>通知中心</h3>
      <button
        v-if="unreadCount > 0"
        @click="markAllAsRead"
        class="mark-all-btn"
      >
        全部标记为已读
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="notifications.length === 0" class="empty">
      暂无通知
    </div>

    <div v-else class="notifications-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification-item', { unread: !notification.is_read }]"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-content">
          <div class="notification-message">
            {{ notification.message }}
          </div>
          <div class="notification-time">
            {{ formatTime(notification.created_at) }}
          </div>
        </div>
        <div v-if="!notification.is_read" class="unread-dot"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api'

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  userType: {
    type: String, // 'coach' or 'member'
    required: true
  }
})

const emit = defineEmits(['notification-click'])

const loading = ref(false)
const notifications = ref([])

// 未读通知数量
const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.is_read).length
})

// 加载通知列表
const loadNotifications = async () => {
  loading.value = true
  try {
    notifications.value = await getNotifications(props.userId, props.userType)
  } catch (error) {
    console.error('加载通知失败：', error)
  } finally {
    loading.value = false
  }
}

// 标记单个通知为已读
const handleNotificationClick = async (notification) => {
  if (!notification.is_read) {
    try {
      await markNotificationAsRead(notification.id)
      notification.is_read = true
    } catch (error) {
      console.error('标记已读失败：', error)
    }
  }
  emit('notification-click', notification)
}

// 标记全部为已读
const markAllAsRead = async () => {
  try {
    await markAllNotificationsAsRead(props.userId, props.userType)
    notifications.value.forEach(n => n.is_read = true)
  } catch (error) {
    console.error('标记全部已读失败：', error)
  }
}

// 格式化时间
const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadNotifications()
})

// 暴露刷新方法
defineExpose({
  refresh: loadNotifications,
  unreadCount
})
</script>

<style scoped>
.notifications-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.notifications-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.mark-all-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.mark-all-btn:hover {
  background: #e0e0e0;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.notification-item:hover {
  background: #f9f9f9;
  transform: translateX(5px);
}

.notification-item.unread {
  background: #f0f7ff;
  border-color: #667eea;
}

.notification-content {
  flex: 1;
}

.notification-message {
  color: #333;
  font-size: 14px;
  margin-bottom: 5px;
}

.notification-time {
  color: #999;
  font-size: 12px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  margin-left: 10px;
}
</style>
