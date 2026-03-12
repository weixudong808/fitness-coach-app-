import { supabase } from './supabase.js'
import { createNotification } from './api.js'

/**
 * 会员审核教练添加申请
 * @param {string} relationId - 关系ID
 * @param {string} status - 审核状态：'approved' 或 'rejected'
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function memberAuditCoachAdd(relationId, status) {
  try {
    // 获取关系信息
    const { data: relation } = await supabase
      .from('coach_member_relations')
      .select('*')
      .eq('id', relationId)
      .single()

    if (!relation) {
      return { success: false, error: '申请不存在' }
    }

    if (status === 'approved') {
      // 同意申请
      const { data, error } = await supabase
        .from('coach_member_relations')
        .update({
          status: 'active',
          start_time: new Date().toISOString()
        })
        .eq('id', relationId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // 发送通知给教练
      await createNotification({
        user_type: 'coach',
        user_id: relation.coach_id,
        type: 'member_approved',
        content: '会员已同意您的添加申请',
        related_id: relationId
      })

      return { success: true, data }
    } else {
      // 拒绝申请
      const { data, error } = await supabase
        .from('coach_member_relations')
        .update({
          status: 'rejected'
        })
        .eq('id', relationId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // 发送通知给教练
      await createNotification({
        user_type: 'coach',
        user_id: relation.coach_id,
        type: 'member_rejected',
        content: '会员拒绝了您的添加申请',
        related_id: relationId
      })

      return { success: true, data }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取教练的会员列表
 * @param {string} coachId - 教练ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getCoachMembers(coachId) {
  try {
    const { data, error } = await supabase
      .from('coach_member_relations')
      .select('*, members(*)')
      .eq('coach_id', coachId)
      .eq('status', 'active')
      .order('start_time', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取会员的教练列表
 * @param {string} memberId - 会员ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getMemberCoaches(memberId) {
  try {
    const { data, error } = await supabase
      .from('coach_member_relations')
      .select('*, coaches(*)')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .order('start_time', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 教练删除会员
 * @param {string} relationId - 关系ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function coachDeleteMember(relationId) {
  try {
    // 获取关系信息
    const { data: relation } = await supabase
      .from('coach_member_relations')
      .select('*')
      .eq('id', relationId)
      .single()

    if (!relation) {
      return { success: false, error: '关系不存在' }
    }

    // 标记关系为已结束
    const { data, error } = await supabase
      .from('coach_member_relations')
      .update({
        status: 'ended',
        end_type: 'coach_delete',
        end_time: new Date().toISOString()
      })
      .eq('id', relationId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // 发送通知给会员
    await createNotification({
      user_type: 'member',
      user_id: relation.member_id,
      type: 'coach_deleted',
      content: '教练已不再带您',
      related_id: relationId
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 会员取消关注教练
 * @param {string} relationId - 关系ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function memberCancelCoach(relationId) {
  try {
    // 获取关系信息
    const { data: relation } = await supabase
      .from('coach_member_relations')
      .select('*')
      .eq('id', relationId)
      .single()

    if (!relation) {
      return { success: false, error: '关系不存在' }
    }

    // 更新关系状态为取消申请中
    const { data, error } = await supabase
      .from('coach_member_relations')
      .update({
        cancel_request_time: new Date().toISOString()
      })
      .eq('id', relationId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // 发送通知给教练
    await createNotification({
      user_type: 'coach',
      user_id: relation.coach_id,
      type: 'member_cancel_request',
      content: '会员申请取消关注',
      related_id: relationId
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 教练审核会员取消关注申请
 * @param {string} relationId - 关系ID
 * @param {string} status - 审核状态：'approved' 或 'rejected'
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function coachAuditCancelRequest(relationId, status) {
  try {
    // 获取关系信息
    const { data: relation } = await supabase
      .from('coach_member_relations')
      .select('*')
      .eq('id', relationId)
      .single()

    if (!relation) {
      return { success: false, error: '关系不存在' }
    }

    if (status === 'approved') {
      // 同意取消
      const { data, error } = await supabase
        .from('coach_member_relations')
        .update({
          status: 'ended',
          end_type: 'member_cancel',
          end_time: new Date().toISOString(),
          cancel_request_time: null
        })
        .eq('id', relationId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // 发送通知给会员
      await createNotification({
        user_type: 'member',
        user_id: relation.member_id,
        type: 'cancel_approved',
        content: '教练已同意您的取消关注申请',
        related_id: relationId
      })

      return { success: true, data }
    } else {
      // 拒绝取消（清除取消申请时间）
      const { data, error } = await supabase
        .from('coach_member_relations')
        .update({
          cancel_request_time: null
        })
        .eq('id', relationId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // 发送通知给会员（会员会看到强制取消按钮）
      await createNotification({
        user_type: 'member',
        user_id: relation.member_id,
        type: 'cancel_rejected',
        content: '教练拒绝了您的取消关注申请，您可以选择强制取消',
        related_id: relationId
      })

      return { success: true, data }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 会员强制取消关注教练
 * @param {string} relationId - 关系ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function memberForceCancelCoach(relationId) {
  try {
    // 获取关系信息
    const { data: relation } = await supabase
      .from('coach_member_relations')
      .select('*')
      .eq('id', relationId)
      .single()

    if (!relation) {
      return { success: false, error: '关系不存在' }
    }

    // 检查是否可以强制取消（必须有取消申请时间）
    if (!relation.cancel_request_time) {
      return { success: false, error: '请先发起取消申请' }
    }

    // 检查是否超过1小时或被拒绝
    const cancelRequestTime = new Date(relation.cancel_request_time)
    const now = new Date()
    const hoursPassed = (now - cancelRequestTime) / (1000 * 60 * 60)

    // 如果没超过1小时，检查是否有拒绝通知
    if (hoursPassed < 1) {
      const { data: rejectNotification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_type', 'member')
        .eq('user_id', relation.member_id)
        .eq('type', 'cancel_rejected')
        .eq('related_id', relationId)
        .single()

      if (!rejectNotification) {
        return { success: false, error: '请等待教练响应或1小时后再强制取消' }
      }
    }

    // 强制取消关系
    const { data, error } = await supabase
      .from('coach_member_relations')
      .update({
        status: 'ended',
        end_type: 'member_force_cancel',
        end_time: new Date().toISOString(),
        cancel_request_time: null
      })
      .eq('id', relationId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // 发送通知给教练
    await createNotification({
      user_type: 'coach',
      user_id: relation.coach_id,
      type: 'member_force_canceled',
      content: '会员已强制取消关注',
      related_id: relationId
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取待处理的申请列表（教练端用）
 * @param {string} coachId - 教练ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getCoachPendingRequests(coachId) {
  try {
    const { data, error } = await supabase
      .from('coach_member_relations')
      .select('*, members(*)')
      .eq('coach_id', coachId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取待处理的取消申请列表（教练端用）
 * @param {string} coachId - 教练ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getCoachCancelRequests(coachId) {
  try {
    const { data, error } = await supabase
      .from('coach_member_relations')
      .select('*, members(*)')
      .eq('coach_id', coachId)
      .eq('status', 'active')
      .not('cancel_request_time', 'is', null)
      .order('cancel_request_time', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
