<template>
  <div class="template-editor-container">
    <el-page-header
      @back="goBack"
      :content="isExclusiveMode ? `为 ${targetMemberName} 创建专属计划` : (isEditMode ? '编辑训练模板' : '创建训练模板')"
    />

    <el-card style="margin-top: 20px" v-loading="loading">
      <!-- 专属计划提示 -->
      <el-alert
        v-if="isExclusiveMode"
        title="专属计划模式"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        您正在为会员 <strong>{{ targetMemberName }}</strong> 创建专属训练计划。此计划不会出现在模板库中，仅关联到该会员。
      </el-alert>

      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <!-- 基本信息 - 添加课次模式下不显示 -->
        <template v-if="!isAddSessionMode">
          <el-divider content-position="left">基本信息</el-divider>

          <el-form-item label="模板名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入模板名称" />
          </el-form-item>

          <el-form-item label="模板描述" prop="description">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="3"
              placeholder="请输入模板描述"
            />
          </el-form-item>

          <el-form-item label="训练目标" prop="target_goal">
            <el-input
              v-model="formData.target_goal"
              placeholder="请输入训练目标，如：增肌、减脂、塑形等"
              clearable
            >
              <template #append>
                <el-dropdown @command="handleGoalSelect">
                  <el-button>
                    常用选项
                    <el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="增肌">增肌</el-dropdown-item>
                      <el-dropdown-item command="减脂">减脂</el-dropdown-item>
                      <el-dropdown-item command="塑形">塑形</el-dropdown-item>
                      <el-dropdown-item command="力量">力量</el-dropdown-item>
                      <el-dropdown-item command="耐力">耐力</el-dropdown-item>
                      <el-dropdown-item command="综合">综合</el-dropdown-item>
                      <el-dropdown-item command="康复训练">康复训练</el-dropdown-item>
                      <el-dropdown-item command="体能提升">体能提升</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="训练阶段" prop="training_stage">
            <el-select v-model="formData.training_stage" placeholder="请选择训练阶段">
              <el-option label="基础期" value="基础期" />
              <el-option label="进阶期" value="进阶期" />
              <el-option label="突破期" value="突破期" />
            </el-select>
          </el-form-item>

          <el-form-item label="难度等级" prop="difficulty_level">
            <el-select v-model="formData.difficulty_level" placeholder="请选择难度等级">
              <el-option label="初级" value="beginner" />
              <el-option label="中级" value="intermediate" />
              <el-option label="高级" value="advanced" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 训练课次安排 -->
        <el-divider content-position="left">
          <span>训练课次安排</span>
          <el-button type="primary" size="small" style="margin-left: 10px" @click="addTrainingSession">
            添加课次
          </el-button>
        </el-divider>

        <el-empty v-if="trainingSessions.length === 0" description="还没有添加课次，点击上方按钮添加" />

        <!-- 课次列表 -->
        <div v-else class="training-sessions-list">
          <el-collapse v-model="activeSession">
            <el-collapse-item
              v-for="(session, sessionIndex) in trainingSessions"
              :key="sessionIndex"
              :name="sessionIndex"
            >
              <template #title>
                <div class="session-title">
                  <span><strong>第 {{ session.session_number }} 次课</strong> - {{ session.core_focus || '未设置核心重点' }}</span>
                  <el-button
                    type="danger"
                    size="small"
                    @click.stop="removeTrainingSession(sessionIndex)"
                    style="margin-left: 10px"
                  >
                    删除
                  </el-button>
                </div>
              </template>

              <!-- 课次基本信息 -->
              <el-form :model="session" label-width="120px" style="margin-bottom: 20px">
                <el-form-item label="本节课核心重点">
                  <el-input v-model="session.core_focus" placeholder="如：臀腿耐力提升、心肺功能提升" />
                </el-form-item>
                <el-form-item label="训练部位">
                  <el-input v-model="session.training_part" placeholder="如：臀腿、心肺、胸肩" />
                </el-form-item>
              </el-form>

              <!-- 训练动作列表 -->
              <div class="exercises-section">
                <div class="section-header">
                  <h4>训练动作</h4>
                  <el-button type="primary" size="small" @click="addExercise(sessionIndex)">
                    添加动作
                  </el-button>
                </div>

                <el-empty v-if="session.exercises.length === 0" description="还没有添加动作" />

                <el-table v-else :data="session.exercises" border style="width: 100%">
                  <el-table-column type="index" label="序号" width="60" />
                  <el-table-column prop="exercise_name" label="动作名称" min-width="120" />
                  <el-table-column prop="equipment_notes" label="器械/握距" width="120" />
                  <el-table-column prop="weight" label="重量" width="120" />
                  <el-table-column label="组数×次数" width="120">
                    <template #default="{ row }">
                      {{ row.sets }} × {{ row.reps_standard }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="next_goal" label="下节目标" width="120" show-overflow-tooltip />
                  <el-table-column label="操作" width="150" fixed="right">
                    <template #default="{ $index }">
                      <el-button size="small" type="primary" @click="editExercise(sessionIndex, $index)">
                        编辑
                      </el-button>
                      <el-button size="small" type="danger" @click="deleteExercise(sessionIndex, $index)">
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 操作按钮 -->
        <el-form-item style="margin-top: 30px">
          <el-button type="primary" @click="handleSubmit" :loading="saving">
            {{ isTrainingRecordMode ? '保存记录' : (isAddSessionMode ? '保存计划' : '保存模板') }}
          </el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 动作编辑对话框 -->
    <el-dialog
      v-model="showExerciseDialog"
      :title="editingExercise.sessionIndex !== null && editingExercise.exerciseIndex !== null ? '编辑动作' : '添加动作'"
      width="700px"
      draggable
    >
      <el-form :model="exerciseForm" :rules="exerciseRules" ref="exerciseFormRef" label-width="120px">
        <el-form-item label="动作名称" prop="exercise_name">
          <el-input v-model="exerciseForm.exercise_name" placeholder="如：哈克深蹲、划船机" />
        </el-form-item>

        <el-form-item label="器械/握距备注" prop="equipment_notes">
          <el-input v-model="exerciseForm.equipment_notes" placeholder="如：宽距、自重、03红箱" />
        </el-form-item>

        <el-form-item label="重量（标注单位）" prop="weight">
          <el-input v-model="exerciseForm.weight" placeholder="如：单边10kg、整体20kg、自重、弹力带X档" />
        </el-form-item>

        <el-form-item label="次数/完成标准" prop="reps_standard">
          <el-input v-model="exerciseForm.reps_standard" placeholder="如：15次、30秒、10卡路里" />
        </el-form-item>

        <el-form-item label="组数" prop="sets">
          <el-input-number v-model="exerciseForm.sets" :min="1" :max="10" />
        </el-form-item>

        <el-form-item label="下节进阶目标">
          <el-input v-model="exerciseForm.next_goal" placeholder="如：维持并加重、小目标/无" />
        </el-form-item>

        <el-form-item label="教练评语">
          <el-input
            v-model="exerciseForm.coach_comment"
            type="textarea"
            :rows="2"
            placeholder="发力/难度/感受"
          />
        </el-form-item>

        <el-form-item label="阶段进步记录">
          <el-input
            v-model="exerciseForm.progress_record"
            type="textarea"
            :rows="2"
            placeholder="重量/动作/耐力提升记录"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showExerciseDialog = false">取消</el-button>
        <el-button type="primary" @click="handleExerciseSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { supabase } from '../../lib/supabase'

const router = useRouter()
const route = useRoute()

const formRef = ref(null)
const exerciseFormRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const showExerciseDialog = ref(false)
const activeSession = ref([])

// 判断是否为编辑模式
const isEditMode = ref(false)
const templateId = ref(null)

// 专属计划模式
const isExclusiveMode = ref(false)
const targetMemberId = ref(null)
const targetMemberName = ref('')

// 训练记录模式（从训练计划详情页编辑课次）
const isTrainingRecordMode = ref(false)
const recordingSessionId = ref(null)

// 添加课次模式（从训练计划详情页添加新课次）
const isAddSessionMode = ref(false)
const targetPlanId = ref(null)

// 模板表单数据
const formData = reactive({
  name: '',
  description: '',
  target_goal: '',
  difficulty_level: '',
  training_stage: ''
})

// 训练课次列表
const trainingSessions = ref([])

// 动作表单数据
const exerciseForm = reactive({
  exercise_name: '',
  equipment_notes: '',
  weight: '',
  reps_standard: '',
  sets: 3,
  next_goal: '',
  coach_comment: '',
  progress_record: ''
})

// 正在编辑的动作
const editingExercise = reactive({
  sessionIndex: null,
  exerciseIndex: null
})

// 模板表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, message: '模板名称至少2个字符', trigger: 'blur' }
  ],
  target_goal: [
    { required: true, message: '请选择训练目标', trigger: 'change' }
  ],
  difficulty_level: [
    { required: true, message: '请选择难度等级', trigger: 'change' }
  ],
  training_stage: [
    { required: true, message: '请选择训练阶段', trigger: 'change' }
  ]
}

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

// 添加训练课次
const addTrainingSession = async () => {
  let nextSessionNumber = trainingSessions.value.length + 1

  // 如果是添加课次模式，需要查询现有课次的最大编号
  if (isAddSessionMode.value && templateId.value) {
    try {
      const { data: existingSessions, error } = await supabase
        .from('training_sessions')
        .select('session_number')
        .eq('template_id', templateId.value)
        .order('session_number', { ascending: false })
        .limit(1)

      if (error) throw error

      if (existingSessions && existingSessions.length > 0) {
        nextSessionNumber = existingSessions[0].session_number + 1
      }
    } catch (error) {
      console.error('查询现有课次失败:', error)
    }
  }

  trainingSessions.value.push({
    session_number: nextSessionNumber,
    core_focus: '',
    training_part: '',
    exercises: []
  })
  activeSession.value = trainingSessions.value.length - 1
}

// 删除训练课次
const removeTrainingSession = (sessionIndex) => {
  trainingSessions.value.splice(sessionIndex, 1)
  // 重新编号
  trainingSessions.value.forEach((session, index) => {
    session.session_number = index + 1
  })
}

// 添加动作
const addExercise = (sessionIndex) => {
  console.log('添加动作，sessionIndex:', sessionIndex, 'trainingSessions:', trainingSessions.value)
  editingExercise.sessionIndex = sessionIndex
  editingExercise.exerciseIndex = null
  // 重置表单但不重置 sessionIndex
  exerciseForm.exercise_name = ''
  exerciseForm.equipment_notes = ''
  exerciseForm.weight = ''
  exerciseForm.reps_standard = ''
  exerciseForm.sets = 3
  exerciseForm.next_goal = ''
  exerciseForm.coach_comment = ''
  exerciseForm.progress_record = ''
  exerciseFormRef.value?.resetFields()
  showExerciseDialog.value = true
}

// 编辑动作
const editExercise = (sessionIndex, exerciseIndex) => {
  editingExercise.sessionIndex = sessionIndex
  editingExercise.exerciseIndex = exerciseIndex
  const exercise = trainingSessions.value[sessionIndex].exercises[exerciseIndex]
  Object.assign(exerciseForm, exercise)
  showExerciseDialog.value = true
}

// 删除动作
const deleteExercise = (sessionIndex, exerciseIndex) => {
  trainingSessions.value[sessionIndex].exercises.splice(exerciseIndex, 1)
  ElMessage.success('动作已删除')
}

// 提交动作表单
const handleExerciseSubmit = async () => {
  if (!exerciseFormRef.value) return

  await exerciseFormRef.value.validate((valid) => {
    if (valid) {
      const sessionIndex = editingExercise.sessionIndex
      const exerciseIndex = editingExercise.exerciseIndex

      // 确保 sessionIndex 有效
      if (sessionIndex === null || !trainingSessions.value[sessionIndex]) {
        ElMessage.error('课次索引无效')
        return
      }

      if (exerciseIndex !== null) {
        // 编辑现有动作
        Object.assign(trainingSessions.value[sessionIndex].exercises[exerciseIndex], {
          exercise_name: exerciseForm.exercise_name,
          equipment_notes: exerciseForm.equipment_notes,
          weight: exerciseForm.weight,
          reps_standard: exerciseForm.reps_standard,
          sets: exerciseForm.sets,
          next_goal: exerciseForm.next_goal,
          coach_comment: exerciseForm.coach_comment,
          progress_record: exerciseForm.progress_record
        })
        ElMessage.success('动作已更新')
      } else {
        // 添加新动作
        trainingSessions.value[sessionIndex].exercises.push({
          exercise_name: exerciseForm.exercise_name,
          equipment_notes: exerciseForm.equipment_notes,
          weight: exerciseForm.weight,
          reps_standard: exerciseForm.reps_standard,
          sets: exerciseForm.sets,
          next_goal: exerciseForm.next_goal,
          coach_comment: exerciseForm.coach_comment,
          progress_record: exerciseForm.progress_record,
          order_index: trainingSessions.value[sessionIndex].exercises.length
        })
        ElMessage.success('动作已添加')
      }

      showExerciseDialog.value = false
      resetExerciseForm()
    }
  })
}

// 重置动作表单
const resetExerciseForm = () => {
  Object.assign(exerciseForm, {
    exercise_name: '',
    equipment_notes: '',
    weight: '',
    reps_standard: '',
    sets: 3,
    next_goal: '',
    coach_comment: '',
    progress_record: ''
  })
  editingExercise.sessionIndex = null
  editingExercise.exerciseIndex = null
  exerciseFormRef.value?.resetFields()
}

// 提交模板
const handleSubmit = async () => {
  if (!formRef.value) return

  // 添加课次模式下不需要验证基本信息
  if (isAddSessionMode.value) {
    if (trainingSessions.value.length === 0) {
      ElMessage.warning('请至少添加一个训练课次')
      return
    }

    saving.value = true
    try {
      // 保存新添加的课次和动作
      for (const session of trainingSessions.value) {
        // 保存训练课次
        const { data: sessionData, error: sessionError } = await supabase
          .from('training_sessions')
          .insert([{
            template_id: templateId.value,
            session_number: session.session_number,
            core_focus: session.core_focus,
            training_part: session.training_part,
            completed: false,
            completed_date: null
          }])
          .select()
          .single()

        if (sessionError) throw sessionError

        // 保存该课次的所有动作
        if (session.exercises.length > 0) {
          const exercisesData = session.exercises.map((exercise, index) => ({
            session_id: sessionData.id,
            exercise_name: exercise.exercise_name,
            equipment_notes: exercise.equipment_notes,
            weight: exercise.weight,
            reps_standard: exercise.reps_standard,
            sets: exercise.sets,
            next_goal: exercise.next_goal,
            coach_comment: exercise.coach_comment,
            progress_record: exercise.progress_record,
            order_index: index
          }))

          const { error: exercisesError } = await supabase
            .from('session_exercises')
            .insert(exercisesData)

          if (exercisesError) throw exercisesError
        }
      }

      ElMessage.success('训练课次添加成功！')
      // 返回训练计划详情页
      router.push({
        name: 'coach-plan-detail',
        params: { planId: targetPlanId.value }
      })
    } catch (error) {
      console.error('保存失败:', error)
      ElMessage.error(`保存失败: ${error.message}`)
    } finally {
      saving.value = false
    }
    return
  }

  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (trainingSessions.value.length === 0) {
        ElMessage.warning('请至少添加一个训练课次')
        return
      }

      saving.value = true
      try {
        // 获取当前教练的 user_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          ElMessage.error('请先登录')
          return
        }

        // 如果是训练记录模式，直接更新课次和动作，并标记为已完成
        if (isTrainingRecordMode.value) {
          // 更新模板基本信息
          const templateData = {
            name: formData.name,
            description: formData.description,
            target_goal: formData.target_goal,
            difficulty_level: formData.difficulty_level,
            training_stage: formData.training_stage
          }

          const { error: updateError } = await supabase
            .from('training_templates')
            .update(templateData)
            .eq('id', templateId.value)

          if (updateError) throw updateError

          // 删除旧的训练课次和动作
          await supabase.from('training_sessions').delete().eq('template_id', templateId.value)

          // 保存训练课次和动作
          for (const session of trainingSessions.value) {
            // 判断是否是正在记录的课次
            const isRecordingSession = session.id === recordingSessionId.value

            // 保存训练课次
            const { data: sessionData, error: sessionError } = await supabase
              .from('training_sessions')
              .insert([{
                template_id: templateId.value,
                session_number: session.session_number,
                core_focus: session.core_focus,
                training_part: session.training_part,
                completed: isRecordingSession ? true : (session.completed || false),
                completed_date: isRecordingSession ? new Date().toISOString().split('T')[0] : (session.completed_date || null)
              }])
              .select()
              .single()

            if (sessionError) throw sessionError

            // 保存该课次的所有动作
            if (session.exercises.length > 0) {
              const exercisesData = session.exercises.map((exercise, index) => ({
                session_id: sessionData.id,
                exercise_name: exercise.exercise_name,
                equipment_notes: exercise.equipment_notes,
                weight: exercise.weight,
                reps_standard: exercise.reps_standard,
                sets: exercise.sets,
                next_goal: exercise.next_goal,
                coach_comment: exercise.coach_comment,
                progress_record: exercise.progress_record,
                order_index: index
              }))

              const { error: exercisesError } = await supabase
                .from('session_exercises')
                .insert(exercisesData)

              if (exercisesError) throw exercisesError
            }
          }

          ElMessage.success('训练记录保存成功！')
          router.back()
          return
        }

        // 1. 创建或更新训练模板
        const templateData = {
          name: formData.name,
          description: formData.description,
          target_goal: formData.target_goal,
          difficulty_level: formData.difficulty_level,
          training_stage: formData.training_stage,
          coach_id: user.id,
          is_template: !isExclusiveMode.value, // 关键：专属计划标记为 false
          member_id: isExclusiveMode.value ? targetMemberId.value : null
        }

        let savedTemplateId = templateId.value

        if (isEditMode.value) {
          // 更新模板
          const { error } = await supabase
            .from('training_templates')
            .update(templateData)
            .eq('id', templateId.value)

          if (error) throw error

          // 删除旧的训练课次和动作
          await supabase.from('training_sessions').delete().eq('template_id', templateId.value)
        } else {
          // 创建新模板
          const { data, error } = await supabase
            .from('training_templates')
            .insert([templateData])
            .select()
            .single()

          if (error) throw error
          savedTemplateId = data.id
        }

        // 2. 保存训练课次和动作
        for (const session of trainingSessions.value) {
          // 保存训练课次
          const { data: sessionData, error: sessionError } = await supabase
            .from('training_sessions')
            .insert([{
              template_id: savedTemplateId,
              session_number: session.session_number,
              core_focus: session.core_focus,
              training_part: session.training_part
            }])
            .select()
            .single()

          if (sessionError) throw sessionError

          // 保存该课次的所有动作
          if (session.exercises.length > 0) {
            const exercisesData = session.exercises.map((exercise, index) => ({
              session_id: sessionData.id,
              exercise_name: exercise.exercise_name,
              equipment_notes: exercise.equipment_notes,
              weight: exercise.weight,
              reps_standard: exercise.reps_standard,
              sets: exercise.sets,
              next_goal: exercise.next_goal,
              coach_comment: exercise.coach_comment,
              progress_record: exercise.progress_record,
              order_index: index
            }))

            const { error: exercisesError } = await supabase
              .from('session_exercises')
              .insert(exercisesData)

            if (exercisesError) throw exercisesError
          }
        }

        // 如果是专属计划模式，自动创建 member_plans 记录
        if (isExclusiveMode.value && !isEditMode.value) {
          const { error: assignError } = await supabase
            .from('member_plans')
            .insert([{
              member_id: targetMemberId.value,
              template_id: savedTemplateId,
              coach_id: user.id,
              start_date: new Date().toISOString().split('T')[0],
              status: 'active',
              notes: '专属训练计划'
            }])

          if (assignError) throw assignError
        }

        ElMessage.success(isExclusiveMode.value ? '专属计划创建成功！' : (isEditMode.value ? '更新成功' : '创建成功'))

        // 返回相应页面
        if (isExclusiveMode.value) {
          // 返回会员详情页
          router.push({
            name: 'coach-member-detail',
            params: { id: targetMemberId.value }
          })
        } else if (isEditMode.value && route.query.from === 'plan-detail') {
          // 如果是从训练计划详情页跳转过来的，返回上一页
          router.back()
        } else {
          // 返回模板列表
          router.push('/coach/templates')
        }
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error(`保存失败: ${error.message}`)
      } finally {
        saving.value = false
      }
    }
  })
}

// 返回
const goBack = () => {
  router.back()
}

// 训练目标下拉选择
const handleGoalSelect = (command) => {
  formData.target_goal = command
}

// 加载模板数据
const loadTemplate = async () => {
  loading.value = true
  try {
    // 1. 加载模板基本信息
    const { data: template, error: templateError } = await supabase
      .from('training_templates')
      .select('*')
      .eq('id', templateId.value)
      .single()

    if (templateError) throw templateError

    // 填充基本信息
    formData.name = template.name
    formData.description = template.description || ''
    formData.target_goal = template.target_goal || ''
    formData.difficulty_level = template.difficulty_level || ''
    formData.training_stage = template.training_stage || ''

    // 2. 加载训练课次
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('template_id', templateId.value)
      .order('session_number', { ascending: true })

    if (sessionsError) throw sessionsError

    // 3. 为每个课次加载动作
    const sessionsWithExercises = await Promise.all(
      sessions.map(async (session) => {
        const { data: exercises, error: exercisesError } = await supabase
          .from('session_exercises')
          .select('*')
          .eq('session_id', session.id)
          .order('order_index', { ascending: true })

        if (exercisesError) throw exercisesError

        return {
          ...session,
          exercises: exercises || []
        }
      })
    )

    trainingSessions.value = sessionsWithExercises
    ElMessage.success('模板加载成功')
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败：' + error.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 检查是否为训练记录模式（从训练计划详情页编辑课次）
  if (route.query.from === 'plan-detail' && route.query.sessionId) {
    isTrainingRecordMode.value = true
    recordingSessionId.value = route.query.sessionId
  }

  // 检查是否为添加课次模式（从训练计划详情页添加新课次）
  if (route.query.from === 'plan-detail' && route.query.mode === 'add-session' && route.query.planId) {
    isAddSessionMode.value = true
    targetPlanId.value = route.query.planId
  }

  // 检查是否为专属计划模式
  if (route.query.mode === 'exclusive' && route.query.memberId) {
    isExclusiveMode.value = true
    targetMemberId.value = route.query.memberId

    // 加载会员信息
    try {
      const { data: memberData, error } = await supabase
        .from('members')
        .select('name')
        .eq('id', targetMemberId.value)
        .single()

      if (!error && memberData) {
        targetMemberName.value = memberData.name
      }
    } catch (error) {
      console.error('加载会员信息失败:', error)
    }
  }

  // 如果是编辑模式，加载模板数据
  // 注意：添加课次模式下不加载现有课次
  if (route.params.id && route.params.id !== 'new' && !isAddSessionMode.value) {
    isEditMode.value = true
    templateId.value = route.params.id
    loadTemplate()
  }

  // 如果是添加课次模式，只设置 templateId，不加载课次
  if (isAddSessionMode.value && route.params.id) {
    templateId.value = route.params.id
  }
})
</script>

<style scoped>
.template-editor-container {
  padding: 20px;
}

.training-sessions-list {
  margin-top: 20px;
}

.session-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 20px;
}

.exercises-section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h4 {
  margin: 0;
}
</style>

