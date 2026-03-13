// 创建通知 Edge Function
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

    // 验证内部调用（必须有 INTERNAL_SECRET）
    const authHeader = req.headers.get('Authorization')
    const internalSecret = Deno.env.get('INTERNAL_SECRET')

    if (!internalSecret) {
      return new Response(
        JSON.stringify({ success: false, error: '服务未配置' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${internalSecret}`) {
      return new Response(
        JSON.stringify({ success: false, error: '无权限访问' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 解析请求体
    const { user_type, user_id, type, content, related_id } = await req.json()

    if (!user_type || !user_id || !type || !content) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少必要参数' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 校验 user_type 合法性
    if (!['coach', 'member', 'admin'].includes(user_type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_type 不合法' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 插入通知
    const { data, error } = await supabaseAdmin
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
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
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
