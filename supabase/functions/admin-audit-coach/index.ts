// 管理员审核教练 Edge Function
// 使用 service_role 权限，绕过 RLS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建 Supabase 客户端（使用 service_role）
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 验证管理员身份（校验 JWT + admin 角色）
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: '未提供认证令牌' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 使用 supabaseAdmin 验证 JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: '认证失败' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 检查用户是否有 admin 角色
    const userRole = user.user_metadata?.role || user.app_metadata?.role

    if (userRole !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: '无管理员权限' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 解析请求体
    const { coachId, status, rejectReason } = await req.json()

    if (!coachId || !status) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少必要参数' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 更新教练审核状态
    const updateData: any = {
      audit_status: status
    }

    if (status === 'rejected' && rejectReason) {
      updateData.reject_reason = rejectReason
    }

    const { data: coach, error: updateError } = await supabaseAdmin
      .from('coaches')
      .update(updateData)
      .eq('id', coachId)
      .select()
      .single()

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 创建通知给教练
    const notificationContent = status === 'approved'
      ? '恭喜！您的教练账号已审核通过，现在可以登录使用了。'
      : `很抱歉，您的教练账号审核未通过。原因：${rejectReason || '未说明'}`

    await supabaseAdmin
      .from('notifications')
      .insert([
        {
          user_type: 'coach',
          user_id: coachId,
          type: status === 'approved' ? 'coach_audit_approved' : 'coach_audit_rejected',
          content: notificationContent,
          is_read: false
        }
      ])

    return new Response(
      JSON.stringify({ success: true, data: coach }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
