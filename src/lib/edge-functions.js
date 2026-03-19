/**
 * Edge Functions 调用封装
 *
 * ⚠️ 安全警告：
 * - adminAuditCoach: 仅允许管理员页面调用，普通用户页面禁止调用
 * - 所有使用 VITE_INTERNAL_SECRET 的函数都应严格控制调用权限
 * - 建议后续将内部函数移至服务端目录或移除前端导出
 */

// Edge Functions 调用辅助函数
// 用于调用 Supabase Edge Functions

import { supabase } from './supabase'

// 获取 Supabase 项目 URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * 管理员解除教练合作
 * @param {string} coachId - 教练ID
 * @param {string} reason - 解约原因（必填）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function adminTerminateCoach(coachId, reason) {
  try {
    // 获取当前用户的 session token
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: '未登录或无管理员权限' }
    }

    // token 判空保护，防止发送 Bearer undefined
    if (!session.access_token) {
      return { success: false, error: '管理员登录态失效，请重新登录' }
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: '解约原因不能为空' }
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-terminate-coach`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coachId, reason: reason.trim() })
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      return { success: false, error: `请求失败(${response.status})：${errBody.message || errBody.error || '未知错误'}` }
    }

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

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

    // token 判空保护，防止发送 Bearer undefined
    if (!session.access_token) {
      return { success: false, error: '管理员登录态失效，请重新登录' }
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-audit-coach`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coachId, status, rejectReason })
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      return { success: false, error: `请求失败(${response.status})：${errBody.message || errBody.error || '未知错误'}` }
    }

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
