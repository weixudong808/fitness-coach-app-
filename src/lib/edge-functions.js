// Edge Functions 调用辅助函数
// 用于调用 Supabase Edge Functions

import { supabase } from './supabase'

// 获取 Supabase 项目 URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * 管理员审核教练
 * @param {string} coachId - 教练ID
 * @param {string} status - 审核状态：'approved' 或 'rejected'
 * @param {string} rejectReason - 拒绝原因（可选）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function adminAuditCoach(coachId, status, rejectReason = '') {
  try {
    // 获取当前用户的 session token
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: '未登录或无管理员权限' }
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-audit-coach`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coachId, status, rejectReason })
    })

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 创建通知（内部使用，需要 INTERNAL_SECRET）
 * 注意：此函数只能在服务端调用，不应该在前端直接使用
 * @param {Object} notificationData - 通知信息
 * @param {string} notificationData.user_type - 用户类型：'coach' 或 'member'
 * @param {string} notificationData.user_id - 用户ID
 * @param {string} notificationData.type - 通知类型
 * @param {string} notificationData.content - 通知内容
 * @param {string} notificationData.related_id - 关联ID（可选）
 * @param {string} internalSecret - 内部密钥（必须）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function createNotificationInternal(notificationData, internalSecret) {
  try {
    if (!internalSecret) {
      return { success: false, error: '缺少内部密钥' }
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationData)
    })

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 删除认证用户（内部使用，用于注册失败回滚）
 * 注意：此函数只能在服务端调用，不应该在前端直接使用
 * @param {string} userId - 认证用户ID
 * @param {string} internalSecret - 内部密钥（必须）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function deleteAuthUserInternal(userId, internalSecret) {
  try {
    if (!internalSecret) {
      return { success: false, error: '缺少内部密钥' }
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-auth-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    })

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}
