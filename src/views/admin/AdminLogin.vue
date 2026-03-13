<template>
  <div class="admin-login-container">
    <div class="login-card">
      <h2>管理员登录</h2>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>管理员账号</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入管理员账号"
            required
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <div class="password-input">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              required
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="toggle-password"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    // 使用 Supabase Auth 登录（管理员用邮箱登录）
    const email = username.value.includes('@') ? username.value : `${username.value}@fitness.app`

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password.value
    })

    if (authError) {
      error.value = '账号或密码错误'
      loading.value = false
      return
    }

    // 检查用户是否有 admin 角色
    const userRole = data.user?.user_metadata?.role || data.user?.app_metadata?.role

    if (userRole !== 'admin') {
      error.value = '无管理员权限'
      await supabase.auth.signOut()
      loading.value = false
      return
    }

    // 登录成功，跳转到管理员审核页面
    router.push('/admin/audit')
  } catch (err) {
    error.value = '登录失败，请重试'
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-card h2 {
  margin: 0 0 30px 0;
  text-align: center;
  color: #333;
  font-size: 28px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-input {
  position: relative;
}

.password-input input {
  padding-right: 45px;
}

.toggle-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 5px;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 12px;
  background: #fee;
  color: #c33;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}
</style>
