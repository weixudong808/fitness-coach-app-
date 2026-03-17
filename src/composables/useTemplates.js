import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { getCoachId } from './useAuth'

const templates = ref([])
const loading = ref(false)

export function useTemplates() {
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

  // 获取单个模板详情（包含动作列表）
  const getTemplateById = async (id) => {
    loading.value = true
    try {
      // 获取模板基本信息
      const { data: template, error: templateError } = await supabase
        .from('training_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (templateError) throw templateError

      // 获取模板的动作列表
      const { data: exercises, error: exercisesError } = await supabase
        .from('template_exercises')
        .select('*')
        .eq('template_id', id)
        .order('order_index', { ascending: true })

      if (exercisesError) throw exercisesError

      return {
        ...template,
        exercises: exercises || []
      }
    } catch (error) {
      console.error('获取模板详情失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 创建模板
  const createTemplate = async (templateData, exercises) => {
    loading.value = true
    try {
      const { coachId } = await getCoachId()
      if (!coachId) throw new Error('未绑定教练，无法创建模板')

      // 插入模板基本信息
      const { data: newTemplate, error: templateError } = await supabase
        .from('training_templates')
        .insert([{
          coach_id: coachId,
          name: templateData.name,
          description: templateData.description,
          target_goal: templateData.target_goal,
          difficulty_level: templateData.difficulty_level
        }])
        .select()
        .single()

      if (templateError) throw templateError

      // 插入动作列表
      if (exercises && exercises.length > 0) {
        const exercisesWithTemplateId = exercises.map((exercise, index) => ({
          template_id: newTemplate.id,
          exercise_name: exercise.exercise_name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight || null,
          rest_time: exercise.rest_time || null,
          notes: exercise.notes || null,
          order_index: index + 1
        }))

        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .insert(exercisesWithTemplateId)

        if (exercisesError) throw exercisesError
      }

      return newTemplate
    } catch (error) {
      console.error('创建模板失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 更新模板
  const updateTemplate = async (id, templateData, exercises) => {
    loading.value = true
    try {
      // 更新模板基本信息
      const { error: templateError } = await supabase
        .from('training_templates')
        .update({
          name: templateData.name,
          description: templateData.description,
          target_goal: templateData.target_goal,
          difficulty_level: templateData.difficulty_level,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (templateError) throw templateError

      // 删除旧的动作列表
      const { error: deleteError } = await supabase
        .from('template_exercises')
        .delete()
        .eq('template_id', id)

      if (deleteError) throw deleteError

      // 插入新的动作列表
      if (exercises && exercises.length > 0) {
        const exercisesWithTemplateId = exercises.map((exercise, index) => ({
          template_id: id,
          exercise_name: exercise.exercise_name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight || null,
          rest_time: exercise.rest_time || null,
          notes: exercise.notes || null,
          order_index: index + 1
        }))

        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .insert(exercisesWithTemplateId)

        if (exercisesError) throw exercisesError
      }

      return true
    } catch (error) {
      console.error('更新模板失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 删除模板
  const deleteTemplate = async (id) => {
    loading.value = true
    try {
      // 先删除动作列表
      const { error: exercisesError } = await supabase
        .from('template_exercises')
        .delete()
        .eq('template_id', id)

      if (exercisesError) throw exercisesError

      // 再删除模板
      const { error: templateError } = await supabase
        .from('training_templates')
        .delete()
        .eq('id', id)

      if (templateError) throw templateError

      return true
    } catch (error) {
      console.error('删除模板失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    templates,
    loading,
    loadTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate
  }
}
