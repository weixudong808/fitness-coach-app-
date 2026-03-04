<template>
  <div class="add-session-container">
    <el-page-header @back="goBack" :title="`添加训练课次 - 第${nextSessionNumber}次课`">
    </el-page-header>

    <el-card style="margin-top: 20px">
      <el-form :model="sessionForm" label-width="120px">
        <!-- 课次基本信息 -->
        <el-form-item label="本节课核心重点" required>
          <el-input
            v-model="sessionForm.core_focus"
            placeholder="请输入本节课的核心重点，如：胸部训练、背部训练等"
          />
        </el-form-item>

        <el-form-item label="训练部位" required>
          <el-input
            v-model="sessionForm.training_part"
            placeholder="请输入训练部位，如：胸、背、腿等"
          />
        </el-form-item>

        <!-- 训练动作 -->
        <el-divider content-position="left">
          <span>训练动作</span>
          <el-button type="primary" size="small" style="margin-left: 10px" @click="showAddExerciseDialog = true">
            添加动作
          </el-button>
        </el-divider>

        <el-empty v-if="exercises.length === 0" description="还没有添加动作，点击上方按钮添加" />

        <!-- 动作列表表格 -->
        <el-table v-else :data="exercises" border style="width: 100%">
          <el-table-column prop="exercise_name" label="动作名称" width="150" />
          <el-table-column prop="equipment_notes" label="器械/握距" width="120" />
          <el-table-column prop="weight" label="重量" width="120" />
          <el-table-column prop="reps_standard" label="次数/标准" width="120" />
          <el-table-column prop="sets" label="组数" width="80" align="center" />
          <el-table-column prop="next_goal" label="下节进阶目标" min-width="150" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row, $index }">
              <el-button type="primary" size="small" @click="editExercise($index)">编辑</el-button>
              <el-button type="danger" size="small" @click="deleteExercise($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 操作按钮 -->
        <el-form-item style="margin-top: 30px">
          <el-button type="primary" @click="handleSave" :loading="saving">保存计划</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 添加/编辑动作对话框 -->
    <el-dialog
      v-model="showAddExerciseDialog"
      :title="editingExerciseIndex !== null ? '编辑动作' : '添加动作'"
      width="600px"
    >
      <el-form :model="exerciseForm" :rules="exerciseRules" ref="exerciseFormRef" label-width="120px">
        <el-form-item label="动作名称" prop="exercise_name">
          <el-input v-model="exerciseForm.exercise_name" placeholder="请输入动作名称" />
        </el-form-item>

        <el-form-item label="器械/握距" prop="equipment_notes">
          <el-input v-model="exerciseForm.equipment_notes" placeholder="请输入器械或握距说明" />
        </el-form-item>

        <el-form-item label="重量" prop="weight">
          <el-input v-model="exerciseForm.weight" placeholder="如：100kg、自重等" />
        </el-form-item>

        <el-form-item label="次数/标准" prop="reps_standard">
          <el-input v-model="exerciseForm.reps_standard" placeholder="如：8-10次、力竭等" />
        </el-form-item>

        <el-form-item label="组数" prop="sets">
          <el-input-number v-model="exerciseForm.sets" :min="1" :max="10" />
        </el-form-item>

        <el-form-item label="下节进阶目标" prop="next_goal">
          <el-input
            v-model="exerciseForm.next_goal"
            type="textarea"
            :rows="2"
            placeholder="请输入下节课的进阶目标"
          />
        </el-form-item>

        <el-form-item label="会员反馈" prop="member_feedback">
          <el-input
            v-model="exerciseForm.member_feedback"
            type="textarea"
            :rows="2"
            placeholder="请输入会员反馈"
          />
        </el-form-item>

        <el-form-item label="阶段进步记录" prop="progress_record">
          <el-input
            v-model="exerciseForm.progress_record"
            type="textarea"
            :rows="2"
            placeholder="请输入阶段进步记录"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddExerciseDialog = false">取消</el-button>
        <el-button type="primary" @click="handleExerciseSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { supabase } from '../../lib/supabase'

const route = useRoute()
const router = useRouter()

const planId = ref(null)
const templateId = ref(null)
const nextSessionNumber = ref(1)
const saving = ref(false)

// 课次表单
const sessionForm = ref({
  core_focus: '',
  training_part: ''
})

// 动作列表
const exercises = ref([])

// 添加动作对话框
const showAddExerciseDialog = ref(false)
const editingExerciseIndex = ref(null)
const exerciseFormRef = ref(null)

// 动作表单
const exerciseForm = ref({
  exercise_name: '',
  equipment_notes: '',
  weight: '',
  reps_standard: '',
  sets: 3,
  next_goal: '',
  member_feedback: '',
  progress_record: ''
})

// 动作表单验证规则
const exerciseRules = {
  exercise_name: [
    { required: true, message: '请输入动作名称', trigger: 'blur' }
  ],
  reps_standard: [
    { required: true, message: '请输入次数/完成标准', trigger: 'blur' }
  ],
  sets: [
    { required: true, message: '请输入组数', trigger: 'blur' }
  ]
}

// 查询下一个课次编号
const loadNextSessionNumber = async () => {
  try {
    const { data: existingSessions, error } = await supabase
      .from('training_sessions')
      .select('session_number')
      .eq('template_id', templateId.value)
      .order('session_number', { ascending: false })
      .limit(1)

    if (error) throw error

    if (existingSessions && existingSessions.length > 0) {
      nextSessionNumber.value = existingSessions[0].session_number + 1
    } else {
      nextSessionNumber.value = 1
    }
  } catch (error) {
    console.error('查询课次编号失败:', error)
    ElMessage.error('查询课次编号失败')
  }
}

// 编辑动作
const editExercise = (index) => {
  editingExerciseIndex.value = index
  const exercise = exercises.value[index]
  Object.assign(exerciseForm.value, exercise)
  showAddExerciseDialog.value = true
}

// 删除动作
const deleteExercise = (index) => {
  exercises.value.splice(index, 1)
  ElMessage.success('动作已删除')
}

// 提交动作表单
const handleExerciseSubmit = async () => {
  if (!exerciseFormRef.value) return

  await exerciseFormRef.value.validate((valid) => {
    if (valid) {
      if (editingExerciseIndex.value !== null) {
        // 编辑模式：更新动作
        exercises.value[editingExerciseIndex.value] = { ...exerciseForm.value }
        ElMessage.success('动作已更新')
      } else {
        // 添加模式：添加新动作
        exercises.value.push({ ...exerciseForm.value })
        ElMessage.success('动作已添加')
      }

      // 关闭对话框并重置表单
      showAddExerciseDialog.value = false
      editingExerciseIndex.value = null
      exerciseForm.value = {
        exercise_name: '',
        equipment_notes: '',
        weight: '',
        reps_standard: '',
        sets: 3,
        next_goal: '',
        member_feedback: '',
        progress_record: ''
      }
      exerciseFormRef.value?.resetFields()
    }
  })
}

// 保存课次
const handleSave = async () => {
  // 验证课次基本信息
  if (!sessionForm.value.core_focus) {
    ElMessage.warning('请输入本节课核心重点')
    return
  }

  if (!sessionForm.value.training_part) {
    ElMessage.warning('请输入训练部位')
    return
  }

  if (exercises.value.length === 0) {
    ElMessage.warning('请至少添加一个训练动作')
    return
  }

  saving.value = true
  try {
    // 1. 保存训练课次
    const { data: sessionData, error: sessionError } = await supabase
      .from('training_sessions')
      .insert([{
        template_id: templateId.value,
        session_number: nextSessionNumber.value,
        core_focus: sessionForm.value.core_focus,
        training_part: sessionForm.value.training_part,
        completed: false,
        completed_date: null
      }])
      .select()
      .single()

    if (sessionError) throw sessionError

    // 2. 保存训练动作
    const exercisesData = exercises.value.map((exercise, index) => ({
      session_id: sessionData.id,
      exercise_name: exercise.exercise_name,
      equipment_notes: exercise.equipment_notes,
      weight: exercise.weight,
      reps_standard: exercise.reps_standard,
      sets: exercise.sets,
      next_goal: exercise.next_goal,
      member_feedback: exercise.member_feedback,
      progress_record: exercise.progress_record,
      order_index: index
    }))

    const { error: exercisesError } = await supabase
      .from('session_exercises')
      .insert(exercisesData)

    if (exercisesError) throw exercisesError

    ElMessage.success('训练课次添加成功！')

    // 返回训练计划详情页
    router.push({
      name: 'coach-plan-detail',
      params: { planId: planId.value }
    })
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(`保存失败: ${error.message}`)
  } finally {
    saving.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(async () => {
  planId.value = route.params.planId
  templateId.value = route.query.templateId

  if (!planId.value || !templateId.value) {
    ElMessage.error('参数错误')
    router.back()
    return
  }

  // 查询下一个课次编号
  await loadNextSessionNumber()
})
</script>

<style scoped>
.add-session-container {
  padding: 20px;
}
</style>
