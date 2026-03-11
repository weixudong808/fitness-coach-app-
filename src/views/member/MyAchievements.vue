<template>
  <div class="my-achievements-container">
    <!-- 顶部导航菜单 -->
    <el-menu
      :default-active="activeMenu"
      mode="horizontal"
      @select="handleMenuSelect"
      style="margin-bottom: 20px;"
    >
      <el-menu-item index="plan">我的训练计划</el-menu-item>
      <el-menu-item index="progress">我的进步</el-menu-item>
      <el-menu-item index="achievements">我的认证</el-menu-item>
      <div style="flex: 1;"></div>
      <el-button type="danger" @click="handleLogout" style="margin: 12px;">退出登录</el-button>
    </el-menu>

    <!-- 整体等级卡片 -->
    <el-card class="level-card" v-loading="loading">
      <div class="level-header">
        <div class="level-info">
          <div class="level-badge">Lv.{{ calculatedLevel.level }}</div>
          <div class="level-details">
            <h2>{{ calculatedLevel.name }}</h2>
            <p>已点亮 {{ achievedBadgeCount }} 个徽章</p>
          </div>
        </div>
        <div class="experience-info">
          <span class="exp-text">经验值: {{ calculatedExperience }}</span>
        </div>
      </div>

      <!-- 整体进度条 -->
      <div class="level-progress">
        <el-progress
          :percentage="overallProgress"
          :color="getProgressColor(overallProgress)"
          :stroke-width="20"
        >
          <template #default="{ percentage }">
            <span class="progress-text">{{ percentage }}%</span>
          </template>
        </el-progress>
        <p class="progress-hint">{{ getProgressHint() }}</p>
      </div>
    </el-card>

    <!-- 认证分类展示 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <h3>认证进度</h3>
      </template>

      <!-- 打卡认证 -->
      <div class="achievement-category">
        <h4>🏃 打卡认证</h4>
        <div class="achievement-list">
          <div
            v-for="achievement in checkInAchievements"
            :key="achievement.code"
            class="achievement-item"
          >
            <div class="achievement-info">
              <span class="achievement-badge">{{ achievement.reward_badge }}</span>
              <div class="achievement-details">
                <span class="achievement-name">{{ achievement.name }}</span>
                <span class="achievement-desc">{{ achievement.progress?.current_value || 0 }} / {{ achievement.progress?.target_value || 0 }}</span>
              </div>
            </div>
            <div class="achievement-progress">
              <el-progress
                :percentage="achievement.progress?.progress_percent || 0"
                :color="achievement.progress?.is_completed ? undefined : getProgressColor(achievement.progress?.progress_percent || 0)"
                :status="achievement.progress?.is_completed ? 'success' : undefined"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 影响力认证 -->
      <div class="achievement-category">
        <h4>✨ 影响力认证</h4>
        <div class="achievement-list">
          <div
            v-for="achievement in influenceAchievements"
            :key="achievement.code"
            class="achievement-item"
          >
            <div class="achievement-info">
              <span class="achievement-badge">{{ achievement.reward_badge }}</span>
              <div class="achievement-details">
                <span class="achievement-name">{{ achievement.name }}</span>
                <span class="achievement-desc">已转介绍 {{ achievement.progress?.current_value || 0 }} 人</span>
              </div>
            </div>
            <div class="achievement-progress">
              <el-progress
                :percentage="achievement.progress?.progress_percent || 0"
                :color="achievement.progress?.is_completed ? undefined : getProgressColor(achievement.progress?.progress_percent || 0)"
                :status="achievement.progress?.is_completed ? 'success' : undefined"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 基础体能认证 -->
      <div class="achievement-category">
        <h4>💪 基础体能认证</h4>
        <div class="achievement-list">
          <div
            v-for="achievement in basicFitnessAchievements"
            :key="achievement.code"
            class="achievement-item"
          >
            <div class="achievement-info">
              <span class="achievement-badge">{{ achievement.reward_badge }}</span>
              <div class="achievement-details">
                <span class="achievement-name">{{ achievement.name }}</span>
                <span class="achievement-desc">{{ achievement.description }}</span>
              </div>
            </div>
            <div class="achievement-progress">
              <el-progress
                :percentage="achievement.progress?.progress_percent || 0"
                :color="achievement.progress?.is_completed ? undefined : getProgressColor(achievement.progress?.progress_percent || 0)"
                :status="achievement.progress?.is_completed ? 'success' : undefined"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 高级体能认证 -->
      <div class="achievement-category">
        <h4>🏆 高级体能认证</h4>
        <div class="achievement-list">
          <div
            v-for="achievement in advancedFitnessAchievements"
            :key="achievement.code"
            class="achievement-item"
            :class="{ 'locked': !achievement.is_active }"
          >
            <div class="achievement-info">
              <span class="achievement-badge">{{ achievement.reward_badge }}</span>
              <div class="achievement-details">
                <span class="achievement-name">{{ achievement.name }}</span>
                <span class="achievement-desc">{{ achievement.description }}</span>
                <span v-if="!achievement.is_active" class="locked-hint">🔒 暂未开放</span>
              </div>
            </div>
            <div class="achievement-progress">
              <el-progress
                :percentage="achievement.progress?.progress_percent || 0"
                :color="achievement.progress?.is_completed ? undefined : getProgressColor(achievement.progress?.progress_percent || 0)"
                :status="achievement.progress?.is_completed ? 'success' : undefined"
              />
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 徽章墙 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <h3>🎖️ 我的徽章墙</h3>
      </template>
      <div class="badge-wall">
        <div
          v-for="achievement in allAchievements"
          :key="achievement.code"
          class="badge-item"
          :class="{ 'achieved': isAchieved(achievement.code), 'locked': !achievement.is_active }"
          @click="showAchievementDetail(achievement)"
        >
          <div class="badge-icon">{{ achievement.reward_badge }}</div>
          <div class="badge-name">{{ achievement.name }}</div>
          <div v-if="isAchieved(achievement.code)" class="badge-date">
            {{ formatDate(getAchievedDate(achievement.code)) }}
          </div>
          <div v-else-if="!achievement.is_active" class="badge-locked">🔒</div>
        </div>
      </div>
      <el-empty v-if="allAchievements.length === 0" description="暂无认证数据" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAchievements } from '../../composables/useAchievements'
import { supabase } from '../../lib/supabase'

const router = useRouter()
const activeMenu = ref('achievements')

const {
  loading,
  memberLevel,
  getCurrentMemberId,
  getMemberGender,
  getMemberLevel,
  getAchievementsByCategory,
  getAllProgress,
  getAchievedList,
  calculateProgress
} = useAchievements()

const checkInAchievements = ref([])
const influenceAchievements = ref([])
const basicFitnessAchievements = ref([])
const advancedFitnessAchievements = ref([])
const allAchievements = ref([])
const achievedList = ref([])

// 统计已点亮的徽章数量
const achievedBadgeCount = computed(() => {
  const activeAchievements = allAchievements.value.filter(a => a.is_active)
  return activeAchievements.filter(a => a.progress?.is_completed === true).length
})

// 统计激活的徽章总数
const totalBadgeCount = computed(() => {
  return allAchievements.value.filter(a => a.is_active).length
})

// 整体进度（基于徽章墙中已点亮的徽章数量）
const overallProgress = computed(() => {
  const total = totalBadgeCount.value
  const achieved = achievedBadgeCount.value
  return total > 0 ? Math.round((achieved / total) * 100) : 0
})

// 根据已点亮徽章数计算等级
const calculatedLevel = computed(() => {
  const count = achievedBadgeCount.value

  if (count >= 20) return { level: 9, name: '自主训练者' }
  if (count >= 15) return { level: 8, name: '高级训练者' }
  if (count >= 10) return { level: 7, name: '进阶训练者' }
  if (count >= 7) return { level: 6, name: '中级训练者' }
  if (count >= 5) return { level: 5, name: '基础训练者' }
  if (count >= 3) return { level: 4, name: '初级训练者' }
  if (count >= 2) return { level: 3, name: '入门训练者' }
  if (count >= 1) return { level: 2, name: '新手训练者' }
  return { level: 1, name: '新手' }
})

// 根据已点亮徽章数计算经验值
const calculatedExperience = computed(() => {
  return achievedBadgeCount.value * 100
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const memberId = await getCurrentMemberId()
    if (!memberId) {
      ElMessage.error('获取会员信息失败')
      return
    }

    // 先检查是否有进度数据
    const { data: existingProgress } = await supabase
      .from('member_achievement_progress')
      .select('id')
      .eq('member_id', memberId)
      .limit(1)

    // 如果没有进度数据，才计算进度
    if (!existingProgress || existingProgress.length === 0) {
      console.log('首次加载，开始计算进度...')
      await calculateProgress(memberId)
    }

    // 加载等级信息
    await getMemberLevel(memberId)

    // 加载各类别认证
    const newbieAchievements = await getAchievementsByCategory(memberId, 'newbie')
    checkInAchievements.value = await getAchievementsByCategory(memberId, 'check_in')
    influenceAchievements.value = await getAchievementsByCategory(memberId, 'influence')
    basicFitnessAchievements.value = await getAchievementsByCategory(memberId, 'basic_fitness')
    advancedFitnessAchievements.value = await getAchievementsByCategory(memberId, 'advanced_fitness')

    // 合并所有认证数据（用于徽章墙）
    allAchievements.value = [
      ...newbieAchievements,
      ...checkInAchievements.value,
      ...influenceAchievements.value,
      ...basicFitnessAchievements.value,
      ...advancedFitnessAchievements.value
    ]

    // 加载已获得的认证
    achievedList.value = await getAchievedList(memberId)
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 判断是否已获得认证
const isAchieved = (code) => {
  // 从 allAchievements 中查找认证（已包含进度数据）
  const achievement = allAchievements.value.find(a => a.code === code)
  return achievement?.progress?.is_completed === true
}

// 获取认证获得日期
const getAchievedDate = (code) => {
  // 从 allAchievements 中查找认证（已包含进度数据）
  const achievement = allAchievements.value.find(a => a.code === code)
  return achievement?.progress?.completed_at
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 获取进度条颜色
const getProgressColor = (percent) => {
  if (percent >= 100) return '#F59E0B' // 金色
  if (percent >= 71) return '#67C23A'  // 绿色
  if (percent >= 31) return '#409EFF'  // 蓝色
  return '#E0E0E0'                     // 灰色
}

// 获取进度提示
const getProgressHint = () => {
  const level = calculatedLevel.value.level
  const achieved = achievedBadgeCount.value

  if (level >= 9) {
    return '🎉 恭喜你已经是自主训练者！'
  } else if (level >= 6) {
    return '💪 继续努力，向自主训练者进发！'
  } else if (level >= 3) {
    return '🔥 你已经入门了，继续保持！'
  } else {
    return '🚀 开始你的健身之旅吧！'
  }
}

// 显示认证详情
const showAchievementDetail = (achievement) => {
  if (!achievement.is_active) {
    ElMessage.info('该认证暂未开放')
    return
  }

  const isAchievedFlag = isAchieved(achievement.code)
  const progress = achievement.progress || {}

  ElMessage({
    message: isAchievedFlag
      ? `✅ ${achievement.name}\n${achievement.reward_text || '恭喜你获得该认证！'}`
      : `${achievement.name}\n${achievement.description}\n进度：${progress.current_value || 0} / ${progress.target_value || 0}`,
    type: isAchievedFlag ? 'success' : 'info',
    duration: 3000,
    showClose: true
  })
}

// 导航菜单选择
const handleMenuSelect = (index) => {
  if (index === 'plan') {
    router.push('/member/plan')
  } else if (index === 'progress') {
    router.push('/member/progress')
  }
}

// 退出登录
const handleLogout = async () => {
  try {
    await supabase.auth.signOut()
    router.push('/login')
  } catch (error) {
    ElMessage.error('退出登录失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.my-achievements-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 等级卡片 */
.level-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.level-card :deep(.el-card__body) {
  padding: 30px;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.level-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.level-badge {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  border: 3px solid rgba(255, 255, 255, 0.5);
}

.level-details h2 {
  margin: 0 0 5px 0;
  font-size: 28px;
}

.level-details p {
  margin: 0;
  opacity: 0.9;
}

.experience-info {
  text-align: right;
}

.exp-text {
  font-size: 18px;
  font-weight: bold;
}

.level-progress {
  margin-top: 20px;
}

.level-progress :deep(.el-progress__text) {
  color: white !important;
}

.progress-text {
  color: white;
  font-weight: bold;
}

.progress-hint {
  text-align: center;
  margin-top: 10px;
  font-size: 16px;
  opacity: 0.9;
}

/* 认证分类 */
.achievement-category {
  margin-bottom: 30px;
}

.achievement-category:last-child {
  margin-bottom: 0;
}

.achievement-category h4 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.3s;
}

.achievement-item:hover {
  background: #e8edf3;
  transform: translateX(5px);
}

.achievement-item.locked {
  opacity: 0.5;
}

.achievement-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 300px;
}

.achievement-badge {
  font-size: 32px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
}

.achievement-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.achievement-name {
  font-weight: bold;
  color: #333;
}

.achievement-desc {
  font-size: 12px;
  color: #666;
}

.locked-hint {
  font-size: 12px;
  color: #999;
}

.achievement-progress {
  flex: 1;
}

/* 徽章墙 */
.badge-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 20px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.badge-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.badge-item.achieved {
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
}

.badge-item.locked {
  opacity: 0.3;
  cursor: not-allowed;
}

.badge-item.locked:hover {
  transform: none;
}

.badge-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.badge-name {
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  color: #333;
}

.badge-date {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.badge-locked {
  font-size: 24px;
  margin-top: 5px;
}
</style>
