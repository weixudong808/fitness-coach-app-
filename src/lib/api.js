import { supabase } from './supabase.js'

// ==================== 教练相关 API ====================

/**
 * 教练注册
 * @param {Object} coachData - 教练信息
 * @param {string} coachData.name - 教练姓名
 * @param {string} coachData.phone - 手机号
 * @param {string} coachData.password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function registerCoach(coachData) {
  try {
    const { name, phone, password } = coachData

    // 检查手机号是否已注册
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingCoach) {
      return { success: false, error: '该手机号已注册' }
    }

    // 插入教练数据（状态为待审核）
    const { data, error } = await supabase
      .from('coaches')
      .insert([
        {
          name,
          phone,
          password, // 注意：实际项目中应该加密密码
          audit_status: 'pending'
        }
      ])
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 教练登录
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function loginCoach(phone, password) {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('phone', phone)
      .eq('password', password)
      .single()

    if (error || !data) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 检查审核状态
    if (data.audit_status === 'pending') {
      return { success: false, error: '账号审核中，请等待管理员审核' }
    }

    if (data.audit_status === 'rejected') {
      return {
        success: false,
        error: `账号审核未通过，原因：${data.reject_reason || '未说明'}`
      }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取待审核的教练列表（管理员用）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getPendingCoaches() {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('audit_status', 'pending')
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
 * 审核教练（管理员用）
 * @param {string} coachId - 教练ID
 * @param {string} status - 审核状态：'approved' 或 'rejected'
 * @param {string} rejectReason - 拒绝原因（如果是拒绝的话）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function auditCoach(coachId, status, rejectReason = '') {
  try {
    const updateData = {
      audit_status: status
    }

    if (status === 'rejected' && rejectReason) {
      updateData.reject_reason = rejectReason
    }

    const { data, error } = await supabase
      .from('coaches')
      .update(updateData)
      .eq('id', coachId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // TODO: 发送通知给教练
    await createNotification({
      user_type: 'coach',
      user_id: coachId,
      type: status === 'approved' ? 'coach_audit_approved' : 'coach_audit_rejected',
      content: status === 'approved'
        ? '恭喜！您的教练账号已审核通过，现在可以登录使用了。'
        : `很抱歉，您的教练账号审核未通过。原因：${rejectReason}`
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ==================== 会员相关 API ====================

/**
 * 会员注册
 * @param {Object} memberData - 会员信息
 * @param {string} memberData.name - 会员姓名
 * @param {string} memberData.phone - 手机号
 * @param {string} memberData.password - 密码
 * @param {string} memberData.gender - 性别：'male' 或 'female'
 * @param {number} memberData.initial_weight - 初始体重（kg）
 * @param {string} memberData.invite_code - 邀请码（可选）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function registerMember(memberData) {
  try {
    const { name, phone, password, gender, initial_weight, invite_code } = memberData

    // 检查手机号是否已注册
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingMember) {
      return { success: false, error: '该手机号已注册' }
    }

    // 插入会员数据
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([
        {
          name,
          phone,
          password, // 注意：实际项目中应该加密密码
          gender,
          initial_weight,
          current_weight: initial_weight // 初始时，当前体重等于初始体重
        }
      ])
      .select()
      .single()

    if (memberError) {
      return { success: false, error: memberError.message }
    }

    // 如果有邀请码，自动建立会员-教练关系
    if (invite_code) {
      const relationResult = await useInviteCode(member.id, invite_code)
      if (!relationResult.success) {
        // 邀请码无效，但会员已注册成功
        return {
          success: true,
          data: member,
          warning: `会员注册成功，但邀请码无效：${relationResult.error}`
        }
      }
    }

    return { success: true, data: member }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 会员登录
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function loginMember(phone, password) {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .eq('password', password)
      .single()

    if (error || !data) {
      return { success: false, error: '手机号或密码错误' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 更新会员当前体重
 * @param {string} memberId - 会员ID
 * @param {number} currentWeight - 当前体重（kg）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function updateMemberWeight(memberId, currentWeight) {
  try {
    const { data, error } = await supabase
      .from('members')
      .update({ current_weight: currentWeight })
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ==================== 邀请码相关 API ====================

/**
 * 教练生成邀请码
 * @param {string} coachId - 教练ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function generateInviteCode(coachId) {
  try {
    // 检查教练是否已有邀请码
    const { data: existingCode } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .single()

    if (existingCode) {
      return { success: true, data: existingCode }
    }

    // 生成唯一的邀请码
    const code = `COACH-${coachId}-${Date.now().toString(36).toUpperCase()}`

    const { data, error } = await supabase
      .from('invite_codes')
      .insert([
        {
          coach_id: coachId,
          code,
          is_active: true
        }
      ])
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 使用邀请码（会员添加教练）
 * @param {string} memberId - 会员ID
 * @param {string} code - 邀请码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function useInviteCode(memberId, code) {
  try {
    // 查找邀请码
    const { data: inviteCode, error: codeError } = await supabase
      .from('invite_codes')
      .select('*, coaches(*)')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (codeError || !inviteCode) {
      return { success: false, error: '邀请码无效或已失效' }
    }

    // 检查教练是否已审核通过
    if (inviteCode.coaches.audit_status !== 'approved') {
      return { success: false, error: '该教练账号尚未审核通过' }
    }

    // 检查是否已经建立关系
    const { data: existingRelation } = await supabase
      .from('coach_member_relations')
      .select('id')
      .eq('coach_id', inviteCode.coach_id)
      .eq('member_id', memberId)
      .in('status', ['pending', 'active'])
      .single()

    if (existingRelation) {
      return { success: false, error: '您已经跟随该教练或申请正在审核中' }
    }

    // 使用邀请码直接建立关系（不需要审核）
    const { data: relation, error: relationError } = await supabase
      .from('coach_member_relations')
      .insert([
        {
          coach_id: inviteCode.coach_id,
          member_id: memberId,
          status: 'active',
          initiator: 'member',
          start_time: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (relationError) {
      return { success: false, error: relationError.message }
    }

    // 更新邀请码使用次数
    await supabase
      .from('invite_codes')
      .update({ used_count: inviteCode.used_count + 1 })
      .eq('id', inviteCode.id)

    // 发送通知给教练
    await createNotification({
      user_type: 'coach',
      user_id: inviteCode.coach_id,
      type: 'member_joined_via_invite',
      content: `会员通过邀请码加入了您`,
      related_id: relation.id
    })

    return { success: true, data: relation }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ==================== 通知系统 API ====================

/**
 * 创建通知
 * @param {Object} notificationData - 通知信息
 * @param {string} notificationData.user_type - 用户类型：'coach' 或 'member' 或 'admin'
 * @param {string} notificationData.user_id - 用户ID
 * @param {string} notificationData.type - 通知类型
 * @param {string} notificationData.content - 通知内容
 * @param {string} notificationData.related_id - 关联ID（可选）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function createNotification(notificationData) {
  try {
    const { user_type, user_id, type, content, related_id } = notificationData

    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_type,
          user_id,
          type,
          content,
          related_id,
          is_read: false
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('创建通知失败:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('创建通知异常:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取用户的通知列表
 * @param {string} userType - 用户类型：'coach' 或 'member'
 * @param {string} userId - 用户ID
 * @param {boolean} unreadOnly - 是否只获取未读通知
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getNotifications(userType, userId, unreadOnly = false) {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_type', userType)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 标记通知为已读
 * @param {string} notificationId - 通知ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 标记所有通知为已读
 * @param {string} userType - 用户类型
 * @param {string} userId - 用户ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function markAllNotificationsAsRead(userType, userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_type', userType)
      .eq('user_id', userId)
      .eq('is_read', false)
      .select()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ==================== 会员-教练关系 API ====================

/**
 * 获取教练列表（会员端用）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getCoachList() {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('id, name, phone, created_at')
      .eq('audit_status', 'approved')
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
 * 会员申请跟随教练
 * @param {string} memberId - 会员ID
 * @param {string} coachId - 教练ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function memberApplyCoach(memberId, coachId) {
  try {
    // 检查是否已经建立关系或有待审核的申请
    const { data: existingRelation } = await supabase
      .from('coach_member_relations')
      .select('id, status')
      .eq('coach_id', coachId)
      .eq('member_id', memberId)
      .in('status', ['pending', 'active'])
      .single()

    if (existingRelation) {
      if (existingRelation.status === 'pending') {
        return { success: false, error: '您的申请正在审核中，请耐心等待' }
      }
      return { success: false, error: '您已经跟随该教练了' }
    }

    // 创建申请
    const { data, error } = await supabase
      .from('coach_member_relations')
      .insert([
        {
          coach_id: coachId,
          member_id: memberId,
          status: 'pending',
          initiator: 'member'
        }
      ])
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // 发送通知给教练
    await createNotification({
      user_type: 'coach',
      user_id: coachId,
      type: 'member_apply',
      content: '有新的会员申请跟随您',
      related_id: data.id
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 教练审核会员申请
 * @param {string} relationId - 关系ID
 * @param {string} status - 审核状态：'approved' 或 'rejected'
 * @param {string} rejectReason - 拒绝原因（如果是拒绝的话）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function coachAuditMemberApply(relationId, status, rejectReason = '') {
  try {
    // 获取关系信息
    const { data: relation } = await supabase
      .from('coach_member_relations')
      .select('*, members(*)')
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

      // 发送通知给会员
      await createNotification({
        user_type: 'member',
        user_id: relation.member_id,
        type: 'coach_approved',
        content: '教练已同意您的申请',
        related_id: relationId
      })

      return { success: true, data }
    } else {
      // 拒绝申请
      const { data, error } = await supabase
        .from('coach_member_relations')
        .update({
          status: 'rejected',
          reject_reason: rejectReason
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
        type: 'coach_rejected',
        content: `教练拒绝了您的申请。原因：${rejectReason}`,
        related_id: relationId
      })

      return { success: true, data }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取待认领的会员列表（教练端用）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getUnclaimedMembers() {
  try {
    // 查找没有任何教练的会员
    const { data: allMembers, error: membersError } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (membersError) {
      return { success: false, error: membersError.message }
    }

    // 查找所有有关系的会员ID
    const { data: relations } = await supabase
      .from('coach_member_relations')
      .select('member_id')
      .in('status', ['pending', 'active'])

    const memberIdsWithCoach = relations ? relations.map(r => r.member_id) : []

    // 过滤出没有教练的会员
    const unclaimedMembers = allMembers.filter(
      member => !memberIdsWithCoach.includes(member.id)
    )

    return { success: true, data: unclaimedMembers }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 教练主动添加会员
 * @param {string} coachId - 教练ID
 * @param {string} memberId - 会员ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function coachAddMember(coachId, memberId) {
  try {
    // 检查是否已经建立关系
    const { data: existingRelation } = await supabase
      .from('coach_member_relations')
      .select('id, status')
      .eq('coach_id', coachId)
      .eq('member_id', memberId)
      .in('status', ['pending', 'active'])
      .single()

    if (existingRelation) {
      return { success: false, error: '该会员已被添加或申请正在审核中' }
    }

    // 创建申请（需要会员同意）
    const { data, error } = await supabase
      .from('coach_member_relations')
      .insert([
        {
          coach_id: coachId,
          member_id: memberId,
          status: 'pending',
          initiator: 'coach'
        }
      ])
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // 发送通知给会员
    await createNotification({
      user_type: 'member',
      user_id: memberId,
      type: 'coach_add',
      content: '有教练想要添加您',
      related_id: data.id
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
