import { supabase } from './supabase.js'

// ==================== 教练相关 API ====================

// 注意：registerCoach 和 loginCoach 已废弃，请使用 registerCoachWithAuth 和 loginCoachWithAuth

/**
 * 教练登录（旧方式 - 仅供老用户使用）
 * 注意：此函数仅用于 user_id 为空的老用户，新用户请使用 loginCoachWithAuth
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function loginCoach(phone, password) {
  try {
    // 1. 查询教练信息（只查询老用户：user_id 为空）
    const { data: coach, error: queryError } = await supabase
      .from('coaches')
      .select('*')
      .eq('phone', phone)
      .is('user_id', null)  // 只允许老用户（user_id 为空）
      .single()

    if (queryError) {
      // 如果是 PGRST116 错误（找不到记录），返回友好错误
      if (queryError.code === 'PGRST116') {
        return { success: false, error: '手机号或密码错误' }
      }
      // 其他错误（如多条记录）也返回通用错误
      return { success: false, error: '登录失败，请联系管理员' }
    }

    if (!coach) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 2. 验证密码（明文比对 - 仅用于老用户）
    if (coach.password !== password) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 3. 检查审核状态
    if (coach.audit_status === 'pending') {
      return { success: false, error: '账号审核中，请等待管理员审核' }
    }

    if (coach.audit_status === 'rejected') {
      return {
        success: false,
        error: `账号审核未通过，原因：${coach.reject_reason || '未说明'}`
      }
    }

    return { success: true, data: coach }
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

// 注意：auditCoach 已废弃，请使用 edge-functions.js 中的 adminAuditCoach

// ==================== 会员相关 API ====================

// 注意：registerMember 和 loginMember 已废弃，请使用 registerMemberWithAuth 和 loginMemberWithAuth

/**
 * 会员登录（旧方式 - 仅供老用户使用）
 * 注意：此函数仅用于 user_id 为空的老用户，新用户请使用 loginMemberWithAuth
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function loginMember(phone, password) {
  try {
    // 1. 查询会员信息（只查询老用户：user_id 为空）
    const { data: member, error: queryError } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .is('user_id', null)  // 只允许老用户（user_id 为空）
      .single()

    if (queryError) {
      // 如果是 PGRST116 错误（找不到记录），返回友好错误
      if (queryError.code === 'PGRST116') {
        return { success: false, error: '手机号或密码错误' }
      }
      // 其他错误（如多条记录）也返回通用错误
      return { success: false, error: '登录失败，请联系管理员' }
    }

    if (!member) {
      return { success: false, error: '手机号或密码错误' }
    }

    // 2. 验证密码（明文比对 - 仅用于老用户）
    if (member.password !== password) {
      return { success: false, error: '手机号或密码错误' }
    }

    return { success: true, data: member }
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

// ==================== 新认证方式（使用 Supabase Auth）====================

/**
 * 教练注册（使用 Supabase Auth）
 * @param {string} name - 教练姓名
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function registerCoachWithAuth(name, phone, password) {
  try {
    // 1. 统一手机号格式为 +86xxxxxxxxxxx
    let formattedPhone = phone
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+86${formattedPhone.replace(/^0+/, '')}`
    }

    // 2. 检查手机号是否已在 coaches 表注册
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingCoach) {
      return { success: false, error: '该手机号已注册' }
    }

    // 3. 使用 Supabase Auth 创建用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: password,
      options: {
        data: {
          name: name,
          user_type: 'coach'
        }
      }
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: '创建认证用户失败' }
    }

    // 4. 在 coaches 表插入记录（不存储 password）
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .insert([
        {
          user_id: authData.user.id,
          name: name,
          phone: phone,
          audit_status: 'pending'
        }
      ])
      .select()
      .single()

    if (coachError) {
      // 注册失败：Auth 用户已创建但业务表插入失败
      // 退出登录状态，避免用户处于"半登录"状态
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        // signOut 失败不影响主错误返回
        console.error('退出登录失败:', signOutError)
      }

      // 注意：此时会产生"半注册用户"（Auth里有，业务表里没有）
      // 需要通过服务端定时清理任务处理（见 docs/半注册用户清理规则.md）
      return { success: false, error: `创建教练记录失败: ${coachError.message}` }
    }

    return { success: true, data: coach }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 教练登录（使用 Supabase Auth）
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function loginCoachWithAuth(phone, password) {
  try {
    // 1. 统一手机号格式为 +86xxxxxxxxxxx
    let formattedPhone = phone
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+86${formattedPhone.replace(/^0+/, '')}`
    }

    // 2. 使用 Supabase Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      phone: formattedPhone,
      password: password
    })

    if (authError) {
      return { success: false, error: '手机号或密码错误' }
    }

    if (!authData.user) {
      return { success: false, error: '登录失败' }
    }

    // 3. 查询教练信息
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (coachError || !coach) {
      return { success: false, error: '教练信息不存在' }
    }

    // 4. 检查审核状态
    if (coach.audit_status === 'pending') {
      // 登录失败，退出登录
      await supabase.auth.signOut()
      return { success: false, error: '账号审核中，请等待管理员审核' }
    }

    if (coach.audit_status === 'rejected') {
      // 登录失败，退出登录
      await supabase.auth.signOut()
      return {
        success: false,
        error: `账号审核未通过，原因：${coach.reject_reason || '未说明'}`
      }
    }

    return { success: true, data: coach }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 会员注册（使用 Supabase Auth）
 * @param {string} name - 会员姓名
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @param {string} gender - 性别
 * @param {number} initial_weight - 初始体重
 * @param {string} invite_code - 邀请码（可选）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function registerMemberWithAuth(name, phone, password, gender, initial_weight, invite_code) {
  try {
    // 1. 统一手机号格式为 +86xxxxxxxxxxx
    let formattedPhone = phone
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+86${formattedPhone.replace(/^0+/, '')}`
    }

    // 2. 检查手机号是否已在 members 表注册
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingMember) {
      return { success: false, error: '该手机号已注册' }
    }

    // 3. 使用 Supabase Auth 创建用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: password,
      options: {
        data: {
          name: name,
          user_type: 'member'
        }
      }
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: '创建认证用户失败' }
    }

    // 4. 在 members 表插入记录（不存储 password）
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([
        {
          user_id: authData.user.id,
          name: name,
          phone: phone,
          gender: gender,
          initial_weight: initial_weight,
          current_weight: initial_weight
        }
      ])
      .select()
      .single()

    if (memberError) {
      // 注册失败：Auth 用户已创建但业务表插入失败
      // 退出登录状态，避免用户处于"半登录"状态
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        // signOut 失败不影响主错误返回
        console.error('退出登录失败:', signOutError)
      }

      // 注意：此时会产生"半注册用户"（Auth里有，业务表里没有）
      // 需要通过服务端定时清理任务处理（见 docs/半注册用户清理规则.md）
      return { success: false, error: `创建会员记录失败: ${memberError.message}` }
    }

    // 5. 如果有邀请码，自动建立会员-教练关系
    if (invite_code) {
      const relationResult = await useInviteCode(member.id, invite_code)
      if (!relationResult.success) {
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
 * 会员登录（使用 Supabase Auth）
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function loginMemberWithAuth(phone, password) {
  try {
    // 1. 统一手机号格式为 +86xxxxxxxxxxx
    let formattedPhone = phone
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+86${formattedPhone.replace(/^0+/, '')}`
    }

    // 2. 使用 Supabase Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      phone: formattedPhone,
      password: password
    })

    if (authError) {
      return { success: false, error: '手机号或密码错误' }
    }

    if (!authData.user) {
      return { success: false, error: '登录失败' }
    }

    // 3. 查询会员信息
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (memberError || !member) {
      return { success: false, error: '会员信息不存在' }
    }

    return { success: true, data: member }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
