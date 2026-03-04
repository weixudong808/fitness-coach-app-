<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>健身教练管理系统</h2>
        </div>
      </template>

      <!-- 登录/注册切换标签 -->
      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" label-width="80px">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="loginForm.phone" placeholder="请输入手机号" />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleLogin" :loading="loading" style="width: 100%">
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" :rules="registerRules" ref="registerFormRef" label-width="100px">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="registerForm.phone" placeholder="请输入手机号" />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码（至少6位）"
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
              />
            </el-form-item>

            <el-form-item label="角色" prop="role">
              <el-radio-group v-model="registerForm.role" @change="handleRoleChange">
                <el-radio value="coach">教练</el-radio>
                <el-radio value="member">会员</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 会员专属信息 -->
            <template v-if="registerForm.role === 'member'">
              <el-divider content-position="left">会员基本信息</el-divider>

              <el-form-item label="姓名" prop="name">
                <el-input v-model="registerForm.name" placeholder="请输入姓名" />
              </el-form-item>

              <el-form-item label="性别" prop="gender">
                <el-radio-group v-model="registerForm.gender">
                  <el-radio value="male">男</el-radio>
                  <el-radio value="female">女</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="年龄" prop="age">
                <el-input-number v-model="registerForm.age" :min="1" :max="120" />
              </el-form-item>

              <el-form-item label="身高(cm)" prop="height">
                <el-input-number v-model="registerForm.height" :min="100" :max="250" />
              </el-form-item>

              <el-form-item label="体重(kg)" prop="initial_weight">
                <el-input-number v-model="registerForm.initial_weight" :min="30" :max="300" :precision="1" />
              </el-form-item>

              <el-form-item label="体脂率(%)" prop="initial_body_fat">
                <el-input-number v-model="registerForm.initial_body_fat" :min="5" :max="60" :precision="1" />
              </el-form-item>
            </template>

            <el-form-item>
              <el-button type="primary" @click="handleRegister" :loading="loading" style="width: 100%">
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="tips">
        <p>提示：注册后请使用手机号和密码登录</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { signIn, signUp, getUserRole, loading } = useAuth()

const activeTab = ref('login')
const loginFormRef = ref(null)
const registerFormRef = ref(null)

const loginForm = reactive({
  phone: '',
  password: ''
})

const registerForm = reactive({
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'member',
  // 会员专属字段
  name: '',
  gender: 'male',
  age: null,
  height: null,
  initial_weight: null,
  initial_body_fat: null
})

const loginRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  // 会员专属验证规则
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' }
  ],
  height: [
    { required: true, message: '请输入身高', trigger: 'blur' }
  ],
  initial_weight: [
    { required: true, message: '请输入体重', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      const result = await signIn(loginForm.phone, loginForm.password)

      if (result.success) {
        ElMessage.success('登录成功')

        // 获取用户角色
        const role = await getUserRole(result.user.id)

        // 调试信息
        console.log('用户ID:', result.user.id)
        console.log('用户角色:', role)

        // 根据角色跳转到不同页面
        if (role === 'coach') {
          router.push('/coach/members')
        } else {
          router.push('/member/plan')
        }
      } else {
        ElMessage.error(result.error || '登录失败')
      }
    }
  })
}

// 角色切换处理
const handleRoleChange = () => {
  // 清空会员专属字段
  if (registerForm.role === 'coach') {
    registerForm.name = ''
    registerForm.gender = 'male'
    registerForm.age = null
    registerForm.height = null
    registerForm.initial_weight = null
    registerForm.initial_body_fat = null
  }
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      const result = await signUp(
        registerForm.phone,
        registerForm.password,
        registerForm.role,
        // 如果是会员，传递会员信息
        registerForm.role === 'member' ? {
          name: registerForm.name,
          gender: registerForm.gender,
          age: registerForm.age,
          phone: registerForm.phone,
          height: registerForm.height,
          initial_weight: registerForm.initial_weight,
          initial_body_fat: registerForm.initial_body_fat
        } : null
      )

      if (result.success) {
        ElMessage.success('注册成功！请登录')
        // 切换到登录标签
        activeTab.value = 'login'
        // 清空注册表单
        resetRegisterForm()
      } else {
        ElMessage.error(result.error || '注册失败')
      }
    }
  })
}

// 重置注册表单
const resetRegisterForm = () => {
  registerForm.phone = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
  registerForm.role = 'member'
  registerForm.name = ''
  registerForm.gender = 'male'
  registerForm.age = null
  registerForm.height = null
  registerForm.initial_weight = null
  registerForm.initial_body_fat = null
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #333;
}

.login-tabs {
  margin-top: 20px;
}

.tips {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f9ff;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}
</style>
