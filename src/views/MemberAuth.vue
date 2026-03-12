<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">{{ isLogin ? '会员登录' : '会员注册' }}</h1>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group" v-if="!isLogin">
          <label for="name">姓名</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            placeholder="请输入姓名"
            required
          />
        </div>

        <div class="form-group">
          <label for="phone">手机号</label>
          <input
            id="phone"
            v-model="formData.phone"
            type="tel"
            placeholder="请输入手机号"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <div class="password-input-wrapper">
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              required
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="toggle-password-btn"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </div>

        <div class="form-group" v-if="!isLogin">
          <label for="confirmPassword">确认密码</label>
          <div class="password-input-wrapper">
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              required
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="toggle-password-btn"
            >
              {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <div v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" class="password-mismatch">
            两次密码不一致
          </div>
        </div>

        <div class="form-group" v-if="!isLogin">
          <label for="gender">性别</label>
          <select id="gender" v-model="formData.gender" required>
            <option value="">请选择性别</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>

        <div class="form-group" v-if="!isLogin">
          <label for="weight">初始体重（kg）</label>
          <input
            id="weight"
            v-model.number="formData.initial_weight"
            type="number"
            step="0.1"
            placeholder="请输入体重"
            required
          />
        </div>

        <div class="form-group" v-if="!isLogin">
          <label for="inviteCode">邀请码（可选）</label>
          <input
            id="inviteCode"
            v-model="formData.invite_code"
            type="text"
            placeholder="如有教练邀请码请输入"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
        </button>
      </form>

      <div class="auth-footer">
        <button @click="toggleMode" class="toggle-btn">
          {{ isLogin ? '还没有账号？去注册' : '已有账号？去登录' }}
        </button>
        <button @click="goToCoachAuth" class="switch-role-btn">
          切换到教练端
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { registerMember, loginMember } from '@/lib/api'

const router = useRouter()
const isLogin = ref(true)
const loading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formData = reactive({
  name: '',
  phone: '',
  password: '',
  confirmPassword: '',
  gender: '',
  initial_weight: 0,
  invite_code: ''
})

const toggleMode = () => {
  isLogin.value = !isLogin.value
  errorMessage.value = ''
  successMessage.value = ''
  formData.name = ''
  formData.phone = ''
  formData.password = ''
  formData.confirmPassword = ''
  formData.gender = ''
  formData.initial_weight = 0
  formData.invite_code = ''
}

const goToCoachAuth = () => {
  router.push('/coach/auth')
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  // 注册时验证两次密码是否一致
  if (!isLogin.value && formData.password !== formData.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致，请重新输入'
    return
  }

  loading.value = true

  try {
    if (isLogin.value) {
      // 登录
      const result = await loginMember(formData.phone, formData.password)

      if (result.success) {
        // 保存会员信息到 localStorage
        localStorage.setItem('userType', 'member')
        localStorage.setItem('userId', result.data.id)
        localStorage.setItem('userName', result.data.name)
        localStorage.setItem('userGender', result.data.gender)

        successMessage.value = '登录成功！'

        // 跳转到会员端首页
        setTimeout(() => {
          router.push('/member/home')
        }, 1000)
      } else {
        errorMessage.value = result.error || '登录失败'
      }
    } else {
      // 注册
      const result = await registerMember({
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        gender: formData.gender,
        initial_weight: formData.initial_weight,
        invite_code: formData.invite_code
      })

      if (result.success) {
        if (result.warning) {
          successMessage.value = result.warning
        } else {
          successMessage.value = '注册成功！'
        }

        // 3秒后切换到登录模式
        setTimeout(() => {
          toggleMode()
        }, 3000)
      } else {
        errorMessage.value = result.error || '注册失败'
      }
    }
  } catch (error: any) {
    errorMessage.value = error.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 20px;
}

.auth-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group select {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #f5576c;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  flex: 1;
  padding-right: 50px;
}

.toggle-password-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-password-btn:hover {
  opacity: 0.7;
}

.password-mismatch {
  font-size: 12px;
  color: #f44336;
  margin-top: 4px;
}

.error-message {
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
  font-size: 14px;
}

.success-message {
  padding: 12px;
  background: #efe;
  border: 1px solid #cfc;
  border-radius: 8px;
  color: #3c3;
  font-size: 14px;
}

.submit-btn {
  padding: 14px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.3s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggle-btn,
.switch-role-btn {
  padding: 10px;
  background: transparent;
  border: none;
  color: #f5576c;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.3s;
}

.toggle-btn:hover,
.switch-role-btn:hover {
  color: #f093fb;
  text-decoration: underline;
}
</style>
