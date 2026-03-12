<template>
  <div class="invite-code-page">
    <div class="page-header">
      <h1>我的邀请码</h1>
      <p class="subtitle">分享邀请码给会员，会员注册时使用邀请码可自动建立关系</p>
    </div>

    <div class="invite-code-card" v-if="inviteCode">
      <div class="code-display">
        <div class="code-label">邀请码</div>
        <div class="code-value">{{ inviteCode.code }}</div>
        <button @click="copyCode" class="copy-btn">
          {{ copied ? '已复制！' : '复制邀请码' }}
        </button>
      </div>

      <div class="code-stats">
        <div class="stat-item">
          <div class="stat-label">使用次数</div>
          <div class="stat-value">{{ inviteCode.used_count || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">状态</div>
          <div class="stat-value" :class="inviteCode.is_active ? 'active' : 'inactive'">
            {{ inviteCode.is_active ? '有效' : '已失效' }}
          </div>
        </div>
      </div>

      <div class="code-actions">
        <button @click="regenerateCode" class="regenerate-btn" :disabled="loading">
          {{ loading ? '生成中...' : '重新生成邀请码' }}
        </button>
      </div>
    </div>

    <div class="empty-state" v-else-if="!loading">
      <p>您还没有邀请码</p>
      <button @click="generateCode" class="generate-btn" :disabled="loading">
        {{ loading ? '生成中...' : '生成邀请码' }}
      </button>
    </div>

    <div class="loading-state" v-if="loading && !inviteCode">
      <p>加载中...</p>
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <div class="usage-guide">
      <h2>使用说明</h2>
      <ol>
        <li>点击"复制邀请码"按钮复制您的专属邀请码</li>
        <li>将邀请码分享给您的会员（微信、短信等方式）</li>
        <li>会员注册时输入邀请码，即可自动建立师徒关系</li>
        <li>使用邀请码注册的会员无需审核，直接成为您的学员</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { generateInviteCode } from '@/lib/api'

const inviteCode = ref<any>(null)
const loading = ref(false)
const copied = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const loadInviteCode = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const coachId = localStorage.getItem('userId')
    if (!coachId) {
      errorMessage.value = '未找到教练信息，请重新登录'
      return
    }

    const result = await generateInviteCode(coachId)

    if (result.success) {
      inviteCode.value = result.data
    } else {
      errorMessage.value = result.error || '加载邀请码失败'
    }
  } catch (error: any) {
    errorMessage.value = error.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const generateCode = async () => {
  await loadInviteCode()
  if (inviteCode.value) {
    successMessage.value = '邀请码生成成功！'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
}

const regenerateCode = async () => {
  if (!confirm('重新生成邀请码后，旧的邀请码将失效。确定要继续吗？')) {
    return
  }

  // TODO: 实现重新生成邀请码的逻辑
  errorMessage.value = '重新生成功能暂未实现'
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(inviteCode.value.code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    errorMessage.value = '复制失败，请手动复制'
  }
}

onMounted(() => {
  loadInviteCode()
})
</script>

<style scoped>
.invite-code-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #666;
}

.invite-code-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.code-display {
  text-align: center;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 30px;
}

.code-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px;
}

.code-value {
  font-size: 32px;
  font-weight: bold;
  color: white;
  letter-spacing: 4px;
  margin-bottom: 20px;
  font-family: 'Courier New', monospace;
}

.copy-btn {
  padding: 10px 24px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.copy-btn:hover {
  transform: translateY(-2px);
}

.code-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
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

.stat-value.active {
  color: #4caf50;
}

.stat-value.inactive {
  color: #f44336;
}

.code-actions {
  text-align: center;
}

.regenerate-btn {
  padding: 12px 24px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.regenerate-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.empty-state p {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.generate-btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.error-message {
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
  font-size: 14px;
  margin-bottom: 20px;
}

.success-message {
  padding: 12px;
  background: #efe;
  border: 1px solid #cfc;
  border-radius: 8px;
  color: #3c3;
  font-size: 14px;
  margin-bottom: 20px;
}

.usage-guide {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.usage-guide h2 {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}

.usage-guide ol {
  padding-left: 20px;
}

.usage-guide li {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin-bottom: 8px;
}
</style>
