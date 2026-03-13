import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/member/auth'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue')
    },
    // 教练认证（注册/登录）
    {
      path: '/coach/auth',
      name: 'coach-auth',
      component: () => import('../views/CoachAuth.vue')
    },
    // 会员认证（注册/登录）
    {
      path: '/member/auth',
      name: 'member-auth',
      component: () => import('../views/MemberAuth.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    // 教练端路由
    {
      path: '/coach',
      name: 'coach',
      meta: { requiresAuth: true, role: 'coach' },
      children: [
        {
          path: 'invite-code',
          name: 'coach-invite-code',
          component: () => import('../views/coach/InviteCode.vue')
        },
        {
          path: 'members',
          name: 'coach-members',
          component: () => import('../views/coach/CoachMembers.vue')
        },
        {
          path: 'members/:id',
          name: 'coach-member-detail',
          component: () => import('../views/coach/MemberDetail.vue')
        },
        {
          path: 'templates',
          name: 'coach-templates',
          component: () => import('../views/coach/TemplateList.vue')
        },
        {
          path: 'templates/new',
          name: 'coach-template-new',
          component: () => import('../views/coach/TemplateEditor.vue')
        },
        {
          path: 'templates/:id/edit',
          name: 'coach-template-edit',
          component: () => import('../views/coach/TemplateEditor.vue')
        },
        {
          path: 'assign-plan',
          name: 'coach-assign-plan',
          component: () => import('../views/coach/AssignPlan.vue')
        },
        {
          path: 'plans/:planId',
          name: 'coach-plan-detail',
          component: () => import('../views/coach/PlanDetail.vue')
        },
        {
          path: 'plans/:planId/add-session',
          name: 'coach-add-session',
          component: () => import('../views/coach/AddSession.vue')
        },
        {
          path: 'sessions/:sessionId/edit',
          name: 'coach-edit-session',
          component: () => import('../views/coach/EditSession.vue')
        }
      ]
    },
    // 管理员端路由
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/AdminLogin.vue')
    },
    {
      path: '/admin/audit',
      name: 'admin-audit',
      component: () => import('../views/admin/CoachAudit.vue'),
      meta: { requiresAuth: true, role: 'admin' }
    },
    // 会员端路由
    {
      path: '/member',
      name: 'member',
      meta: { requiresAuth: true, role: 'member' },
      children: [
        {
          path: 'home',
          name: 'member-home',
          component: () => import('../views/member/MemberHome.vue')
        },
        {
          path: 'plan',
          name: 'member-plan',
          component: () => import('../views/member/MyPlan.vue')
        },
        {
          path: 'plan/:planId',
          name: 'member-plan-detail',
          component: () => import('../views/member/PlanDetail.vue')
        },
        {
          path: 'training/:dayId',
          name: 'member-training',
          component: () => import('../views/member/TrainingDay.vue')
        },
        {
          path: 'record',
          name: 'member-record',
          component: () => import('../views/member/TrainingRecord.vue')
        },
        {
          path: 'progress',
          name: 'member-progress',
          component: () => import('../views/member/MyProgress.vue')
        },
        {
          path: 'achievements',
          name: 'member-achievements',
          component: () => import('../views/member/MyAchievements.vue')
        },
        {
          path: 'coaches',
          name: 'member-coaches',
          component: () => import('../views/member/CoachList.vue')
        }
      ]
    }
  ]
})

// 路由守卫（实现真正的认证检查）
router.beforeEach(async (to, from) => {
  // 如果路由需要认证
  if (to.meta.requiresAuth) {
    const { isAuthenticated, getCurrentUser } = useAuth()

    // 检查用户是否已登录
    const authenticated = await isAuthenticated()

    if (!authenticated) {
      // 未登录，根据角色跳转到对应的登录页
      const role = to.meta.role as string

      if (role === 'coach') {
        return { name: 'coach-auth' }
      } else if (role === 'member') {
        return { name: 'member-auth' }
      } else if (role === 'admin') {
        return { name: 'admin-login' }
      } else {
        return { name: 'member-auth' }
      }
    }

    // 已登录，检查角色是否匹配
    const user = await getCurrentUser()
    const requiredRole = to.meta.role as string

    if (requiredRole && user && user.userType !== requiredRole) {
      // 角色不匹配，跳转到对应角色的首页
      if (user.userType === 'coach') {
        return { name: 'coach-invite-code' }
      } else if (user.userType === 'member') {
        return { name: 'member-home' }
      } else if (user.userType === 'admin') {
        return { name: 'admin-audit' }
      }
    }
  }

  return true
})

export default router
