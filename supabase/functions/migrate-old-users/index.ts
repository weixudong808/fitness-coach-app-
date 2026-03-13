// 迁移老用户到 Supabase Auth
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

    // 验证内部调用（必须有 INTERNAL_SECRET 或管理员 JWT）
    const authHeader = req.headers.get('Authorization')
    const internalSecret = Deno.env.get('INTERNAL_SECRET')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: '未提供认证令牌' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 检查是否是内部调用（INTERNAL_SECRET）
    const isInternalCall = authHeader === `Bearer ${internalSecret}`

    // 如果不是内部调用，检查是否是管理员
    if (!isInternalCall) {
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
    }

    // 解析请求体
    const { user_type } = await req.json()

    if (!user_type || (user_type !== 'coach' && user_type !== 'member')) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少或错误的 user_type 参数（应为 coach 或 member）' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tableName = user_type === 'coach' ? 'coaches' : 'members'

    // 查询所有 user_id 为空的老用户
    const { data: oldUsers, error: queryError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .is('user_id', null)

    if (queryError) {
      return new Response(
        JSON.stringify({ success: false, error: `查询失败: ${queryError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!oldUsers || oldUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '没有需要迁移的用户',
          migrated: 0,
          failed: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 迁移结果统计
    let migratedCount = 0
    const failedUsers: any[] = []

    // 逐个迁移用户
    for (const oldUser of oldUsers) {
      try {
        // 统一手机号格式为 +86xxxxxxxxxxx
        let phone = oldUser.phone
        if (!phone.startsWith('+')) {
          // 如果没有 +86 前缀，添加
          phone = `+86${phone.replace(/^0+/, '')}` // 去掉开头的0
        }

        // 检查手机号是否已存在于 auth.users
        const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
        const phoneExists = existingAuthUser?.users?.some(u => u.phone === phone)

        if (phoneExists) {
          failedUsers.push({
            id: oldUser.id,
            phone: oldUser.phone,
            error: '手机号已存在于认证系统'
          })
          continue
        }

        // 创建 Auth 用户
        // 使用原密码（如果有），否则使用临时密码
        const password = oldUser.password || 'TempPass@123456'

        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: phone,
          password: password,
          phone_confirm: true, // 自动确认手机号
          user_metadata: {
            name: oldUser.name,
            user_type: user_type
          }
        })

        if (createError || !authUser.user) {
          failedUsers.push({
            id: oldUser.id,
            phone: oldUser.phone,
            error: createError?.message || '创建 Auth 用户失败'
          })
          continue
        }

        // 更新数据库表，设置 user_id 和迁移时间
        const { error: updateError } = await supabaseAdmin
          .from(tableName)
          .update({
            user_id: authUser.user.id,
            migrated_at: new Date().toISOString()
          })
          .eq('id', oldUser.id)

        if (updateError) {
          // 如果更新失败，删除刚创建的 Auth 用户（回滚）
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)

          failedUsers.push({
            id: oldUser.id,
            phone: oldUser.phone,
            error: `更新数据库失败: ${updateError.message}`
          })
          continue
        }

        migratedCount++

      } catch (error) {
        failedUsers.push({
          id: oldUser.id,
          phone: oldUser.phone,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `迁移完成`,
        total: oldUsers.length,
        migrated: migratedCount,
        failed: failedUsers.length,
        failedUsers: failedUsers
      }),
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
