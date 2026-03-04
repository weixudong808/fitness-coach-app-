import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const members = ref([])
const templates = ref([])
const memberPlans = ref([])

export function useAssignPlan() {
  // 加载会员列表
  const loadMembers = async () => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, gender, age, phone')
        .order('created_at', { ascending: false })

      if (error) throw error

      members.value = data || []
      return data
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登录')

      // 获取模板列表
      const { data: templatesData, error: templatesError } = await supabase
        .from('training_templates')
        .select('*')
        .eq('coach_id', user.id)
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

  // 分配训练计划（支持批量分配）
  const assignPlan = async (memberIds, templateId, startDate, notes) => {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登录')

      // 构建批量插入数据
      const plans = memberIds.map(memberId => ({
        member_id: memberId,
        template_id: templateId,
        coach_id: user.id,
        start_date: startDate,
        status: 'active',
        notes: notes || null
      }))

      // 批量插入
      const { error } = await supabase
        .from('member_plans')
        .insert(plans)

      if (error) throw error

      return plans.length
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
