<template>
  <div class="dashboard-container">
    <el-card>
      <div v-if="loading">
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else>
        <h2>欢迎使用健身教练管理系统</h2>
        <p>正在跳转...</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { getCurrentUser, getUserRole } = useAuth()
const loading = ref(true)

onMounted(async () => {
  const user = await getCurrentUser()

  if (!user) {
    router.push('/login')
    return
  }

  const role = await getUserRole(user.id)

  if (role === 'coach') {
    router.push('/coach/members')
  } else {
    router.push('/member/plan')
  }

  loading.value = false
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}
</style>
