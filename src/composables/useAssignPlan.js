import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { getCoachId } from './useAuth'
import { getCoachMembers } from '../lib/api-relations'

const loading = ref(false)
const members = ref([])
const templates = ref([])
const memberPlans = ref([])

export function useAssignPlan() {
  // 加载会员列表
  const loadMembers = async () => {
    loading.value = true
    try {
      const { coachId } = await getCoachId()
      if (!coachId) throw new Error('未绑定教练，无法加载会员')

      const result = await getCoachMembers(coachId)
      if (!result.success) throw new Error(result.error || '加载会员失败')

      members.value = (result.data || [])
        .map(item => item.members)
        .filter(Boolean)

      return members.value
    } catch (error) {
      console.error('加载会员列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 加载模板列表（包含动作数量）
  const loadTemplates = async () => {
    loading.value = true
    try {
      const { coachId, authUserId } = await getCoachId()

      // 查询兼容：双ID兼容查询（同时查 coachId 和 authUserId）
      const ids = [coachId, authUserId].filter(Boolean)
      if (ids.length === 0) throw new Error('未登录或未绑定教练')

      // 获取模板列表
      const { data: templatesData, error: templatesError } = await supabase
        .from('training_templates')
        .select('*')
        .in('coach_id', ids)
        .eq('is_template', true) // 关键：只加载模板，不加载专属计划
        .order('created_at', { ascending: false })

      if (templatesError) throw templatesError

      // 为每个模板获取动作数量
      const templatesWithCount = await Promise.all(
        templatesData.map(async (template) => {
          const { count, error: countError } = await supabase
            .from('template_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id)

          if (countError) console.error('获取动作数量失败:', countError)

          return {
            ...template,
            exercise_count: count || 0
          }
        })
      )

      templates.value = templatesWithCount
      return templatesWithCount
    } catch (error) {
      console.error('加载模板列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 深度复制模板（包括所有课次和动作）
  const deepCopyTemplate = async (sourceTemplateId, memberId, coachId) => {
    try {
      // 1. 查询源模板信息
      const { data: sourceTemplate, error: templateError } = await supabase
        .from('training_templates')
        .select('*')
        .eq('id', sourceTemplateId)
        .single()

      if (templateError) throw templateError

      // 2. 创建专属计划（复制模板基本信息）
      const { data: newTemplate, error: createError } = await supabase
        .from('training_templates')
        .insert([{
          name: sourceTemplate.name,
          description: sourceTemplate.description,
          target_goal: sourceTemplate.target_goal,
          difficulty_level: sourceTemplate.difficulty_level,
          training_stage: sourceTemplate.training_stage,
          coach_id: coachId,
          is_template: false,  // 标记为专属计划
          member_id: memberId  // 关联会员
        }])
        .select()
        .single()

      if (createError) throw createError

      // 3. 查询源模板的所有课次
      const { data: sourceSessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('template_id', sourceTemplateId)
        .order('session_number', { ascending: true })

      if (sessionsError) throw sessionsError

      // 4. 复制所有课次和动作
      if (sourceSessions && sourceSessions.length > 0) {
        for (const session of sourceSessions) {
          // 插入新课次
          const { data: newSession, error: sessionError } = await supabase
            .from('training_sessions')
            .insert([{
              template_id: newTemplate.id,
              session_number: session.session_number,
              core_focus: session.core_focus,
              training_part: session.training_part,
              completed: false,
              completed_date: null
            }])
            .select()
            .single()

          if (sessionError) throw sessionError

          // 5. 查询并复制该课次的所有动作
          const { data: sourceExercises, error: exercisesError } = await supabase
            .from('session_exercises')
            .select('*')
            .eq('session_id', session.id)
            .order('order_index', { ascending: true })

          if (exercisesError) throw exercisesError

          if (sourceExercises && sourceExercises.length > 0) {
            // 批量插入动作
            const newExercises = sourceExercises.map(exercise => ({
              session_id: newSession.id,
              exercise_name: exercise.exercise_name,
              equipment_notes: exercise.equipment_notes,
              weight: exercise.weight,
              reps_standard: exercise.reps_standard,
              sets: exercise.sets,
              next_goal: exercise.next_goal,
              coach_comment: exercise.coach_comment,
              order_index: exercise.order_index
            }))

            const { error: insertExercisesError } = await supabase
              .from('session_exercises')
              .insert(newExercises)

            if (insertExercisesError) throw insertExercisesError
          }
        }
      }

      return newTemplate.id
    } catch (error) {
      console.error('深度复制模板失败:', error)
      throw error
    }
  }

  // 分配训练计划（支持批量分配）
  const assignPlan = async (memberIds, templateId, startDate, notes) => {
    loading.value = true
    try {
      const { coachId } = await getCoachId()
      if (!coachId) throw new Error('未绑定教练，无法分配计划')

      let successCount = 0

      // 为每个会员创建专属计划副本
      for (const memberId of memberIds) {
        try {
          // 1. 深度复制模板
          const newTemplateId = await deepCopyTemplate(templateId, memberId, coachId)

          // 2. 在 member_plans 中创建分配记录
          const { error: assignError } = await supabase
            .from('member_plans')
            .insert([{
              member_id: memberId,
              template_id: newTemplateId,  // 使用新创建的专属计划ID
              coach_id: coachId,
              start_date: startDate,
              status: 'active',
              notes: notes || null
            }])

          if (assignError) throw assignError

          successCount++
        } catch (error) {
          console.error(`为会员 ${memberId} 分配计划失败:`, error)
          console.error('错误详情:', JSON.stringify(error, null, 2))
          // 继续处理下一个会员
        }
      }

      return successCount
    } catch (error) {
      console.error('分配训练计划失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取会员的训练计划
  const getMemberPlans = async (memberId) => {
    loading.value = true
    try {
      // 先获取会员的训练计划
      const { data: plansData, error: plansError } = await supabase
        .from('member_plans')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      if (plansError) throw plansError

      if (!plansData || plansData.length === 0) {
        memberPlans.value = []
        return []
      }

      // 获取所有相关的模板信息
      const templateIds = [...new Set(plansData.map(plan => plan.template_id))]
      const { data: templatesData, error: templatesError } = await supabase
        .from('training_templates')
        .select('id, name, target_goal, difficulty_level')
        .in('id', templateIds)

      if (templatesError) throw templatesError

      // 创建模板映射
      const templateMap = {}
      templatesData?.forEach(template => {
        templateMap[template.id] = template
      })

      // 合并数据
      const formattedData = plansData.map(plan => {
        const template = templateMap[plan.template_id] || {}
        return {
          ...plan,
          template_name: template.name || '未知模板',
          target_goal: template.target_goal || '-',
          difficulty_level: template.difficulty_level || '-'
        }
      })

      memberPlans.value = formattedData
      return formattedData
    } catch (error) {
      console.error('获取会员训练计划失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 取消分配（更新状态为 cancelled）
  const cancelAssignment = async (planId) => {
    loading.value = true
    try {
      const { error } = await supabase
        .from('member_plans')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('取消分配失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 删除分配
  const deleteAssignment = async (planId) => {
    loading.value = true
    try {
      const { error } = await supabase
        .from('member_plans')
        .delete()
        .eq('id', planId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('删除分配失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    members,
    templates,
    memberPlans,
    loadMembers,
    loadTemplates,
    assignPlan,
    getMemberPlans,
    cancelAssignment,
    deleteAssignment
  }
}
