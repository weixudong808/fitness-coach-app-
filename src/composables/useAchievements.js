import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const loading = ref(false)
const achievements = ref([])
const memberLevel = ref(null)
const progressData = ref([])

export function useAchievements() {
  const { resolveCurrentMemberId } = useAuth()

  /**
   * 获取会员ID（兼容新老用户）
   */
  const getCurrentMemberId = async () => {
    return await resolveCurrentMemberId()
  }

  /**
   * 获取会员性别
   */
  const getMemberGender = async (memberId) => {
    try {
      const { data: member, error } = await supabase
        .from('members')
        .select('gender')
        .eq('id', memberId)
        .single()

      if (error) throw error
      return member?.gender || 'male' // 默认返回男性
    } catch (error) {
      console.error('获取会员性别失败:', error)
      return 'male'
    }
  }

  /**
   * 获取所有认证定义
   */
  const getAchievementDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('获取认证定义失败:', error)
      return []
    }
  }

  /**
   * 计算打卡次数（只统计有效训练计划）
   */
  const calculateCheckInCount = async (memberId) => {
    try {
      // 1. 先获取该会员的有效训练计划（status='active' 或 'completed'）
      const { data: memberPlans, error: planError } = await supabase
        .from('member_plans')
        .select('template_id')
        .eq('member_id', memberId)
        .in('status', ['active', 'completed'])

      if (planError) {
        console.error('查询会员训练计划失败:', planError)
        return 0
      }

      if (!memberPlans || memberPlans.length === 0) {
        return 0
      }

      // 2. 获取这些有效计划的模板ID
      const activeTemplateIds = memberPlans.map(p => p.template_id)

      // 3. 统计这些模板下已完成的课次
      const { data: sessions, error: sessionError } = await supabase
        .from('training_sessions')
        .select('id')
        .in('template_id', activeTemplateIds)
        .eq('completed', true)

      if (sessionError) {
        console.error('查询训练课次失败:', sessionError)
        return 0
      }

      return sessions?.length || 0
    } catch (error) {
      console.error('计算打卡次数失败:', error)
      return 0
    }
  }

  /**
   * 计算动作最佳成绩
   */
  const calculateExerciseBest = async (memberId, exerciseName) => {
    try {
      // 查询会员的所有已完成课次
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id, template_id')
        .eq('completed', true)

      if (!sessions || sessions.length === 0) return null

      // 获取属于该会员的模板
      const templateIds = [...new Set(sessions.map(s => s.template_id))]
      const { data: templates } = await supabase
        .from('training_templates')
        .select('id')
        .in('id', templateIds)
        .eq('member_id', memberId)

      const memberTemplateIds = new Set(templates?.map(t => t.id) || [])
      const memberSessionIds = sessions
        .filter(s => memberTemplateIds.has(s.template_id))
        .map(s => s.id)

      if (memberSessionIds.length === 0) return null

      // 查询该动作的所有记录
      const { data: exercises } = await supabase
        .from('session_exercises')
        .select('weight, reps_standard, sets')
        .in('session_id', memberSessionIds)
        .ilike('exercise_name', `%${exerciseName}%`)

      if (!exercises || exercises.length === 0) return null

      // 找出最佳成绩（这里简化处理，实际可能需要更复杂的逻辑）
      return exercises[0]
    } catch (error) {
      console.error('计算动作最佳成绩失败:', error)
      return null
    }
  }

  /**
   * 计算转介绍人数
   */
  const calculateReferralCount = async (memberId) => {
    try {
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', memberId)

      if (error) throw error
      return count || 0
    } catch (error) {
      // 精准匹配：42703/PGRST204/message含referrer_id（字段不存在）
      const isKnownMissingColumn =
        error?.code === '42703' ||
        error?.code === 'PGRST204' ||
        error?.message?.includes('referrer_id')
      if (isKnownMissingColumn) return 0

      // 最后兜底：400 + message 为空（Supabase 部分版本的字段缺失格式）
      // 仅限本函数内静默，不扩散到其他查询
      const isEmptyBadRequest =
        error?.status === 400 &&
        (error?.message === '' || error?.message == null)
      if (isEmptyBadRequest) return 0

      // 其他真实故障：保留 warn
      console.warn('计算转介绍人数失败（非字段缺失）:', error)
      return 0
    }
  }

  /**
   * 解析中文数字
   */
  const parseChineseNumber = (str) => {
    const chineseMap = {
      '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
      '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
      '十': 10, '百': 100, '千': 1000
    }

    // 处理"点"作为小数点
    if (str.includes('点')) {
      const parts = str.split('点')
      const intPart = parseChineseNumber(parts[0])
      const decPart = parseChineseNumber(parts[1])
      return intPart + decPart / 10
    }

    let result = 0
    let temp = 0
    let unit = 1

    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      const num = chineseMap[char]

      if (num !== undefined) {
        if (num >= 10) {
          // 单位（十、百、千）
          if (temp === 0) temp = 1
          unit = num
          result += temp * unit
          temp = 0
          unit = 1
        } else {
          // 数字
          temp = num
        }
      }
    }

    result += temp
    return result
  }

  /**
   * 解析复杂的时间格式
   * 支持：90秒、1分30秒、1.5分钟、一分三十秒、一分30秒、一点五分
   */
  const parseComplexTime = (timeStr) => {
    if (!timeStr) return 0

    const str = String(timeStr).trim()
    let totalSeconds = 0

    // 1. 处理混合格式：1分30秒、一分三十秒、一分30秒
    const mixedMatch = str.match(/^(.+?)分(.+?)秒$/)
    if (mixedMatch) {
      const minutePart = mixedMatch[1]
      const secondPart = mixedMatch[2]

      // 解析分钟部分（可能是数字或中文）
      let minutes = 0
      if (/^\d+$/.test(minutePart)) {
        minutes = parseInt(minutePart)
      } else if (/^[\u4e00-\u9fa5]+$/.test(minutePart)) {
        minutes = parseChineseNumber(minutePart)
      } else if (/^\d+\.\d+$/.test(minutePart)) {
        minutes = parseFloat(minutePart)
      }

      // 解析秒部分（可能是数字或中文）
      let seconds = 0
      if (/^\d+$/.test(secondPart)) {
        seconds = parseInt(secondPart)
      } else if (/^[\u4e00-\u9fa5]+$/.test(secondPart)) {
        seconds = parseChineseNumber(secondPart)
      } else if (/^\d+\.\d+$/.test(secondPart)) {
        seconds = parseFloat(secondPart)
      }

      return minutes * 60 + seconds
    }

    // 2. 处理纯分钟：1.5分钟、一点五分、1分、一分
    const minuteMatch = str.match(/^(.+?)分钟?$/)
    if (minuteMatch) {
      const minutePart = minuteMatch[1]

      // 数字格式：1.5
      if (/^\d+(\.\d+)?$/.test(minutePart)) {
        return parseFloat(minutePart) * 60
      }

      // 中文格式：一点五
      if (/^[\u4e00-\u9fa5]+$/.test(minutePart)) {
        return parseChineseNumber(minutePart) * 60
      }
    }

    // 3. 处理纯秒：90秒、九十秒
    const secondMatch = str.match(/^(.+?)秒$/)
    if (secondMatch) {
      const secondPart = secondMatch[1]

      // 数字格式：90
      if (/^\d+(\.\d+)?$/.test(secondPart)) {
        return parseFloat(secondPart)
      }

      // 中文格式：九十
      if (/^[\u4e00-\u9fa5]+$/.test(secondPart)) {
        return parseChineseNumber(secondPart)
      }
    }

    // 4. 纯数字（默认为秒）
    if (/^\d+(\.\d+)?$/.test(str)) {
      return parseFloat(str)
    }

    return 0
  }

  /**
   * 将时间转换为秒（保留旧函数以兼容）
   */
  const convertToSeconds = (value, unit) => {
    const num = parseFloat(value)
    const unitLower = unit.toLowerCase().trim()

    // 分钟转秒
    if (unitLower.includes('分钟') || unitLower === 'min' || unitLower === 'mins') {
      return num * 60
    }

    // 秒
    if (unitLower.includes('秒') || unitLower === 's' || unitLower === 'sec') {
      return num
    }

    // 小时转秒
    if (unitLower.includes('小时') || unitLower === 'h' || unitLower === 'hour') {
      return num * 3600
    }

    // 默认返回原值
    return num
  }

  // =====================================================
  // 动作别名映射（解决：标准名比教练录入名长导致匹配不到）
  // key = 认证定义里的标准名，value = 所有可能的写法（含标准名本身）
  // 注意：动作名不要含逗号/括号，否则会造成 .or() 解析歧义
  // =====================================================
  const EXERCISE_ALIAS_MAP = {
    '平板支撑':   ['平板支撑', '平板撑'],
    '俯卧撑':     ['俯卧撑', '卧撑'],
    '跪姿俯卧撑': ['跪姿俯卧撑', '跪姿卧撑'],
    '靠墙静蹲':   ['靠墙静蹲', '静蹲'],
    '5公里跑':    ['5公里跑', '5公里', '5km跑', '5km', '5 km', '五公里跑'],
  }

  // 查这个动作名有没有别名组；没有就只用自身
  const getExerciseAliases = (name) => {
    if (EXERCISE_ALIAS_MAP[name]) return EXERCISE_ALIAS_MAP[name]
    for (const aliases of Object.values(EXERCISE_ALIAS_MAP)) {
      if (aliases.includes(name)) return aliases
    }
    return [name]
  }

  // 生成 Supabase .or() 的过滤条件字符串（PostgREST 里用 * 不用 %）
  // 例：'exercise_name.ilike.*平板支撑*,exercise_name.ilike.*平板撑*'
  const buildAliasFilter = (name) => {
    return getExerciseAliases(name)
      .map(a => `exercise_name.ilike.*${a}*`)
      .join(',')
  }

  /**
   * 检查是否满足动作要求（支持复杂时间格式）
   */
  const meetsRequirement = (actual, required) => {
    if (!actual || !required) return false

    // 去除空格，统一格式
    const actualStr = String(actual).trim()
    const requiredStr = String(required).trim()

    // 完全匹配
    if (actualStr === requiredStr) return true

    // 特殊处理：如果要求是 "0"，只要有实际值就算达标（用于柔韧性等不限次数的动作）
    if (requiredStr === '0' && actualStr) {
      return true
    }

    // 尝试解析为复杂时间格式
    const actualSeconds = parseComplexTime(actualStr)
    const requiredSeconds = parseComplexTime(requiredStr)

    // 如果都能解析为时间（大于0），则比较秒数
    if (actualSeconds > 0 && requiredSeconds > 0) {
      return actualSeconds >= requiredSeconds
    }

    // 尝试解析数字进行比较（支持大于等于判断）
    const actualMatch = actualStr.match(/^(\d+(?:\.\d+)?)(.*?)$/)
    const requiredMatch = requiredStr.match(/^(\d+(?:\.\d+)?)(.*?)$/)

    if (actualMatch && requiredMatch) {
      const actualNum = parseFloat(actualMatch[1])
      const requiredNum = parseFloat(requiredMatch[1])
      const actualUnit = actualMatch[2]
      const requiredUnit = requiredMatch[2]

      // 单位一致，直接比较
      if (actualUnit === requiredUnit) {
        return actualNum >= requiredNum
      }

      // 单位不一致，尝试时间单位转换
      const isActualTime = actualUnit.includes('秒') || actualUnit.includes('分钟') || actualUnit.includes('小时')
      const isRequiredTime = requiredUnit.includes('秒') || requiredUnit.includes('分钟') || requiredUnit.includes('小时')

      if (isActualTime && isRequiredTime) {
        // 都是时间单位，转换为秒后比较
        const actualSeconds = convertToSeconds(actualNum, actualUnit)
        const requiredSeconds = convertToSeconds(requiredNum, requiredUnit)
        return actualSeconds >= requiredSeconds
      }
    }

    return false
  }

  /**
   * 计算体能认证进度
   */
  const calculateExercisePerformance = async (memberId, requirement) => {
    try {
      // 1. 获取会员的有效训练计划
      const { data: plans, error: plansError } = await supabase
        .from('member_plans')
        .select('template_id')
        .eq('member_id', memberId)
        .in('status', ['active', 'completed'])

      if (plansError) throw plansError
      if (!plans || plans.length === 0) return 0

      const templateIds = plans.map(p => p.template_id)

      // 2. 获取这些计划的所有已完成课次
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('id')
        .in('template_id', templateIds)
        .eq('completed', true)

      if (sessionsError) throw sessionsError
      if (!sessions || sessions.length === 0) return 0

      const sessionIds = sessions.map(s => s.id)

      // 3. 检查每个要求的动作是否完成
      let completedCount = 0
      // 兼容新格式(exercises[]) 和旧格式(单个 exercise 字段)
      // 旧格式只传数字目标，不拼单位（meetsRequirement 的时间/数字解析能接住）
      const exercises = requirement.exercises?.length
        ? requirement.exercises
        : requirement.exercise
          ? [{ name: requirement.exercise, requirement: String(requirement.target ?? '') }]
          : []

      for (const exercise of exercises) {
        // ⭐ 坐姿体前屈特殊判定：不看次数/重量，看备注字段是否含"手碰脚尖"
        if (exercise.name === '坐姿体前屈') {
          const { data: flexRecords, error: flexError } = await supabase
            .from('session_exercises')
            .select('*')
            .in('session_id', sessionIds)
            .or(buildAliasFilter('坐姿体前屈'))

          if (flexError) {
            console.error('查询坐姿体前屈失败:', flexError)
            continue
          }

          // 任意一条记录的任意备注字段含"手碰脚尖"即达标
          // select('*') 兼容新库(coach_comment)和旧库(member_feedback)
          // String() 防止 weight 等字段为数字时 .includes 报错
          const passed = flexRecords?.some(r =>
            [r.progress_record, r.reps_standard, r.coach_comment, r.member_feedback, r.equipment_notes, r.weight]
              .some(field => String(field || '').includes('手碰脚尖'))
          )
          if (passed) completedCount++
          continue
        }

        // 普通动作：取所有历史记录，有一条达标即通过
        const { data: exerciseRecords, error: exerciseError } = await supabase
          .from('session_exercises')
          .select('reps_standard')
          .in('session_id', sessionIds)
          .or(buildAliasFilter(exercise.name))

        if (exerciseError) {
          console.error(`查询动作 ${exercise.name} 失败:`, exerciseError)
          continue
        }

        // 遍历所有记录，有一条达标即算通过
        const passed = exerciseRecords?.some(r =>
          meetsRequirement(r.reps_standard, exercise.requirement)
        )
        if (passed) completedCount++
      }

      return completedCount
    } catch (error) {
      console.error('计算体能认证进度失败:', error)
      return 0
    }
  }

  /**
   * 解析训练数据中的数值（支持时间、次数、重量等）
   */
  const parseTrainingValue = (valueStr) => {
    if (!valueStr) return 0

    const str = String(valueStr).trim()

    // 解析时间：5分钟 -> 300秒
    const timeMatch = str.match(/^(\d+(?:\.\d+)?)\s*分钟?$/)
    if (timeMatch) {
      return parseFloat(timeMatch[1]) * 60
    }

    // 解析秒：90秒 -> 90
    const secondMatch = str.match(/^(\d+(?:\.\d+)?)\s*秒$/)
    if (secondMatch) {
      return parseFloat(secondMatch[1])
    }

    // 解析次数：10个 -> 10
    const countMatch = str.match(/^(\d+(?:\.\d+)?)\s*个?$/)
    if (countMatch) {
      return parseFloat(countMatch[1])
    }

    // 解析重量：80kg -> 80
    const weightMatch = str.match(/^(\d+(?:\.\d+)?)\s*kg$/)
    if (weightMatch) {
      return parseFloat(weightMatch[1])
    }

    // 纯数字
    const numMatch = str.match(/^(\d+(?:\.\d+)?)$/)
    if (numMatch) {
      return parseFloat(numMatch[1])
    }

    return 0
  }

  /**
   * 计算动作组认证进度（exercise_group）
   * 支持"倍数类"（"1.5x体重"）和"次数/时间类"（"15次"、"90秒"）两种目标格式
   */
  const calculateExerciseGroup = async (memberId, requirement) => {
    try {
      // 1. 获取性别 + 初始体重（高级体能需要用体重算目标）
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('gender, initial_weight')
        .eq('id', memberId)
        .single()

      if (memberError) throw memberError
      if (!member) return 0

      const isMale = member.gender === 'male'
      // 没有体重记录用 Infinity，防止 0 × 倍数 = 0 导致误判为达标
      const initialWeight = (member.initial_weight > 0) ? member.initial_weight : Infinity

      // 2. 获取会员的有效训练计划
      const { data: plans, error: plansError } = await supabase
        .from('member_plans')
        .select('template_id')
        .eq('member_id', memberId)
        .in('status', ['active', 'completed'])

      if (plansError) throw plansError
      if (!plans || plans.length === 0) return 0

      const templateIds = plans.map(p => p.template_id)

      // 3. 获取所有已完成课次
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('id')
        .in('template_id', templateIds)
        .eq('completed', true)

      if (sessionsError) throw sessionsError
      if (!sessions || sessions.length === 0) return 0

      const sessionIds = sessions.map(s => s.id)

      // 4. 解析目标值：区分"倍数类"（"1.5x体重"）和"直接值类"（"15次"、"90秒"）
      const parseTarget = (value) => {
        const str = String(value ?? '')
        // 匹配 "1.5x体重" / "1.2×体重" / "1.5倍体重"
        const multiplierMatch = str.match(/^([\d.]+)\s*[x×倍]/)
        if (multiplierMatch) {
          return { type: 'weight_multiplier', multiplier: parseFloat(multiplierMatch[1]) }
        }
        // 次数/时间等直接值
        return { type: 'direct', value: str }
      }

      // 5. 逐个检查动作是否达标
      let completedCount = 0
      const exercises = requirement.exercises || []

      for (const exercise of exercises) {
        const targetRaw = isMale ? exercise.target_male : exercise.target_female
        const target = parseTarget(targetRaw)

        if (target.type === 'weight_multiplier') {
          // 倍数类（深蹲、硬拉等）：查 weight 字段，比 倍数 × 初始体重
          const realTarget = target.multiplier * initialWeight

          const { data: exerciseRecords, error: exerciseError } = await supabase
            .from('session_exercises')
            .select('weight')
            .in('session_id', sessionIds)
            .or(buildAliasFilter(exercise.name))

          if (exerciseError) {
            console.error(`查询动作 ${exercise.name} 失败:`, exerciseError)
            continue
          }

          const passed = exerciseRecords?.some(r => {
            const actualWeight = parseTrainingValue(r.weight)
            return actualWeight >= realTarget
          })
          if (passed) completedCount++

        } else {
          // 次数/时间类（引体向上、战绳、5公里跑等）：查 reps_standard
          const { data: exerciseRecords, error: exerciseError } = await supabase
            .from('session_exercises')
            .select('reps_standard')
            .in('session_id', sessionIds)
            .or(buildAliasFilter(exercise.name))

          if (exerciseError) {
            console.error(`查询动作 ${exercise.name} 失败:`, exerciseError)
            continue
          }

          // 标准化 compare，默认 gte（越大越好），lte = 越小越好（如5公里跑）
          const compare = String(exercise.compare || 'gte').toLowerCase()

          const passed = exerciseRecords?.some(r => {
            const actualSeconds = parseComplexTime(String(r.reps_standard || ''))
            const requiredSeconds = parseComplexTime(String(target.value || ''))

            if (actualSeconds > 0 && requiredSeconds > 0) {
              // 时间解析成功：按 compare 方向比较
              return compare === 'lte'
                ? actualSeconds <= requiredSeconds   // 5公里跑：用时 ≤ 目标
                : actualSeconds >= requiredSeconds   // 其他：完成量 ≥ 目标
            }

            // 时间解析失败：尝试纯数值比较，也遵守 compare 方向
            const actualNum = parseTrainingValue(r.reps_standard)
            const requiredNum = parseTrainingValue(target.value)
            if (actualNum > 0 && requiredNum > 0) {
              return compare === 'lte'
                ? actualNum <= requiredNum
                : actualNum >= requiredNum
            }

            // 最终降级：lte 只做精确匹配，避免方向反转；其余走通用比较
            if (compare === 'lte') {
              return String(r.reps_standard || '').trim() === String(target.value || '').trim()
            }
            return meetsRequirement(r.reps_standard, target.value)
          })
          if (passed) completedCount++
        }
      }

      return completedCount
    } catch (error) {
      console.error('计算动作组认证进度失败:', error)
      return 0
    }
  }

  /**
   * 计算认证组进度（统计子认证完成情况）
   */
  const calculateAchievementGroup = async (memberId, requirement) => {
    try {
      const subAchievementCodes = requirement.sub_achievements || []
      if (subAchievementCodes.length === 0) return 0

      // 获取所有子认证的定义
      const { data: subAchievements, error } = await supabase
        .from('achievement_definitions')
        .select('*')
        .in('code', subAchievementCodes)
        .eq('is_active', true)

      if (error) throw error
      if (!subAchievements || subAchievements.length === 0) return 0

      // 计算每个子认证的进度
      let completedCount = 0
      for (const subAchievement of subAchievements) {
        const progress = await calculateSingleProgress(memberId, subAchievement)
        if (progress.is_completed) {
          completedCount++
        }
      }

      return completedCount
    } catch (error) {
      console.error('计算认证组进度失败:', error)
      return 0
    }
  }

  /**
   * 计算单个认证的进度
   */
  const calculateSingleProgress = async (memberId, achievement) => {
    const requirement = achievement.requirement
    let currentValue = 0
    let targetValue = 0

    try {
      // 先查询数据库中是否已有进度记录
      const { data: existingProgress } = await supabase
        .from('member_achievement_progress')
        .select('completed_at, is_completed')
        .eq('member_id', memberId)
        .eq('achievement_code', achievement.code)
        .maybeSingle()

      switch (requirement.type) {
        case 'register':
          // 注册认证：只要会员存在就算完成
          currentValue = 1
          targetValue = 1
          break

        case 'check_in_count':
          // 打卡次数认证
          currentValue = await calculateCheckInCount(memberId)
          targetValue = requirement.target
          break

        case 'referral_count':
          // 转介绍认证
          currentValue = await calculateReferralCount(memberId)
          targetValue = requirement.target
          break

        case 'exercise_performance':
          // 体能认证：计算已完成的动作数量
          currentValue = await calculateExercisePerformance(memberId, requirement)
          // 新格式(exercises[])：要完成全部动作数；旧格式(单个exercise)：一个动作完成即100%
          targetValue = requirement.exercises?.length || 1
          break

        case 'exercise_group':
          // 动作组认证：计算已完成的动作数量
          currentValue = await calculateExerciseGroup(memberId, requirement)
          targetValue = requirement.exercises?.length || 1
          break

        case 'body_metric':
          // 体测数据认证（暂时不实现）
          targetValue = 1
          currentValue = 0
          break

        case 'achievement_group':
          // 认证组（需要完成一组认证）
          currentValue = await calculateAchievementGroup(memberId, requirement)
          targetValue = requirement.sub_achievements?.length || 1
          break

        default:
          targetValue = 1
          currentValue = 0
      }

      const progressPercent = targetValue > 0
        ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
        : 0

      const isCompleted = currentValue >= targetValue && targetValue > 0

      // 决定 completed_at 的值
      let completedAt = null
      if (isCompleted) {
        // 如果现在达标了
        if (existingProgress && existingProgress.completed_at) {
          // 之前已经完成过，保持原来的时间（不变）
          completedAt = existingProgress.completed_at
        } else {
          // 之前没完成过，设置新的完成时间
          completedAt = new Date().toISOString()
        }
      } else {
        // 如果现在不达标，清除完成时间
        completedAt = null
      }

      return {
        achievement_code: achievement.code,
        current_value: currentValue,
        target_value: targetValue,
        progress_percent: progressPercent,
        is_completed: isCompleted,
        completed_at: completedAt
      }
    } catch (error) {
      console.error(`计算认证进度失败 [${achievement.code}]:`, error)
      return {
        achievement_code: achievement.code,
        current_value: 0,
        target_value: targetValue || 1,
        progress_percent: 0,
        is_completed: false,
        completed_at: null
      }
    }
  }

  /**
   * 计算所有认证进度
   */
  const calculateProgress = async (memberId) => {
    loading.value = true
    try {
      // 获取所有认证定义
      const definitions = await getAchievementDefinitions()

      // 并行计算每个认证的进度
      const progressList = await Promise.all(
        definitions.map(achievement => calculateSingleProgress(memberId, achievement))
      )

      // 并行批量 upsert 进度数据
      await Promise.all(progressList.map(progress =>
        supabase
          .from('member_achievement_progress')
          .upsert({
            member_id: memberId,
            achievement_code: progress.achievement_code,
            current_value: progress.current_value,
            target_value: progress.target_value,
            progress_percent: progress.progress_percent,
            is_completed: progress.is_completed,
            completed_at: progress.completed_at,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'member_id,achievement_code'
          })
          .then(({ error }) => {
            if (error) {
              console.error(`❌ 更新进度失败 [${progress.achievement_code}]:`, error)
            }
          })
      ))

      // 并行颁发已完成的认证
      await Promise.all(
        progressList
          .filter(p => p.is_completed)
          .map(p => checkAndAwardAchievement(memberId, p.achievement_code))
      )

      // 更新会员等级
      await updateMemberLevel(memberId)

      return progressList
    } catch (error) {
      console.error('计算认证进度失败:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新单个认证进度
   */
  const updateProgress = async (memberId, achievementCode) => {
    try {
      // 获取认证定义
      const { data: achievement } = await supabase
        .from('achievement_definitions')
        .select('*')
        .eq('code', achievementCode)
        .single()

      if (!achievement) return

      // 计算进度
      const progress = await calculateSingleProgress(memberId, achievement)

      // 更新进度数据
      const { error: upsertError } = await supabase
        .from('member_achievement_progress')
        .upsert({
          member_id: memberId,
          achievement_code: progress.achievement_code,
          current_value: progress.current_value,
          target_value: progress.target_value,
          progress_percent: progress.progress_percent,
          is_completed: progress.is_completed,
          completed_at: progress.completed_at,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'member_id,achievement_code'
        })

      if (upsertError) {
        console.error(`❌ 更新进度失败 [${achievementCode}]:`, upsertError)
        return
      }

      // 检查是否完成
      if (progress.is_completed) {
        await checkAndAwardAchievement(memberId, achievementCode)
      }

      // 更新会员等级
      await updateMemberLevel(memberId)
    } catch (error) {
      console.error('更新认证进度失败:', error)
    }
  }

  /**
   * 检查并颁发认证
   */
  const checkAndAwardAchievement = async (memberId, achievementCode) => {
    try {
      // 检查是否已经获得该认证
      const { data: existing } = await supabase
        .from('member_achievements')
        .select('id')
        .eq('member_id', memberId)
        .eq('achievement_code', achievementCode)
        .maybeSingle()

      if (existing) return // 已经获得，不重复颁发

      // 颁发认证
      await supabase
        .from('member_achievements')
        .insert({
          member_id: memberId,
          achievement_code: achievementCode,
          achieved_at: new Date().toISOString()
        })

    } catch (error) {
      // 忽略重复插入错误
      if (!error.message?.includes('duplicate')) {
        console.error('颁发认证失败:', error)
      }
    }
  }

  /**
   * 更新会员等级
   */
  const updateMemberLevel = async (memberId) => {
    try {
      // 统计已获得的认证数量
      const { count } = await supabase
        .from('member_achievements')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', memberId)

      const totalAchievements = count || 0

      // 根据认证数量计算等级（简化逻辑）
      let currentLevel = 1
      let levelName = '新手'

      if (totalAchievements >= 20) {
        currentLevel = 9
        levelName = '自主训练者'
      } else if (totalAchievements >= 15) {
        currentLevel = 8
        levelName = '高级训练者'
      } else if (totalAchievements >= 10) {
        currentLevel = 7
        levelName = '进阶训练者'
      } else if (totalAchievements >= 7) {
        currentLevel = 6
        levelName = '中级训练者'
      } else if (totalAchievements >= 5) {
        currentLevel = 5
        levelName = '基础训练者'
      } else if (totalAchievements >= 3) {
        currentLevel = 4
        levelName = '初级训练者'
      } else if (totalAchievements >= 2) {
        currentLevel = 3
        levelName = '入门训练者'
      } else if (totalAchievements >= 1) {
        currentLevel = 2
        levelName = '新手训练者'
      }

      // 更新或插入等级数据
      await supabase
        .from('member_levels')
        .upsert({
          member_id: memberId,
          current_level: currentLevel,
          level_name: levelName,
          total_achievements: totalAchievements,
          experience_points: totalAchievements * 100, // 每个认证100经验值
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'member_id'
        })
    } catch (error) {
      console.error('更新会员等级失败:', error)
    }
  }

  /**
   * 获取会员等级信息
   */
  const getMemberLevel = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from('member_levels')
        .select('*')
        .eq('member_id', memberId)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        // 没有记录：初始化一次，然后只再查一次（不递归，避免权限失败时死循环）
        await updateMemberLevel(memberId)
        const { data: newData } = await supabase
          .from('member_levels')
          .select('*')
          .eq('member_id', memberId)
          .maybeSingle()
        memberLevel.value = newData
        return newData
      }

      memberLevel.value = data
      return data
    } catch (error) {
      console.error('获取会员等级失败:', error)
      return null
    }
  }

  /**
   * 根据性别过滤认证（基于 code 命名规则）
   */
  const filterByGender = (definitions, gender) => {
    return definitions.filter(def => {
      const code = def.code.toLowerCase()

      // 如果 code 包含 _male，只显示给男生
      if (code.includes('_male')) {
        return gender === 'male'
      }

      // 如果 code 包含 _female，只显示给女生
      if (code.includes('_female')) {
        return gender === 'female'
      }

      // 其他认证显示给所有人
      return true
    })
  }

  /**
   * 按类别获取认证（实时计算进度，根据性别过滤）
   */
  const getAchievementsByCategory = async (memberId, category) => {
    try {
      // 获取该类别的认证定义
      const { data: definitions, error: defError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order')

      if (defError) {
        console.error('获取认证定义失败:', defError)
        return []
      }

      if (!definitions || definitions.length === 0) return []

      // 获取会员性别
      const gender = await getMemberGender(memberId)

      // 根据性别过滤认证（仅对体能认证类别）
      let filteredDefinitions = definitions
      if (category === 'basic_fitness' || category === 'advanced_fitness') {
        filteredDefinitions = filterByGender(definitions, gender)
      }

      // 实时计算每个认证的进度
      const result = []
      for (const def of filteredDefinitions) {
        const progress = await calculateSingleProgress(memberId, def)
        result.push({
          ...def,
          progress: {
            current_value: progress.current_value,
            target_value: progress.target_value,
            progress_percent: progress.progress_percent,
            is_completed: progress.is_completed,
            completed_at: progress.completed_at
          }
        })
      }

      return result
    } catch (error) {
      console.error('获取认证列表失败:', error)
      return []
    }
  }

  /**
   * 获取会员所有认证进度
   */
  const getAllProgress = async (memberId) => {
    try {
      // 先获取进度数据
      const { data: progressList, error: progressError } = await supabase
        .from('member_achievement_progress')
        .select('*')
        .eq('member_id', memberId)
        .order('achievement_code')

      if (progressError) {
        console.error('获取进度数据失败:', progressError)
        return []
      }

      // 再获取认证定义
      const codes = progressList?.map(p => p.achievement_code) || []
      if (codes.length === 0) return []

      const { data: definitions, error: defError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .in('code', codes)

      if (defError) {
        console.error('获取认证定义失败:', defError)
        return progressList || []
      }

      // 合并数据
      const result = progressList.map(progress => {
        const definition = definitions?.find(d => d.code === progress.achievement_code)
        return {
          ...progress,
          achievement: definition
        }
      })

      progressData.value = result
      return result
    } catch (error) {
      console.error('获取认证进度失败:', error)
      return []
    }
  }

  /**
   * 获取会员已获得的认证
   */
  const getAchievedList = async (memberId) => {
    try {
      // 先获取已获得的认证记录
      const { data: achievementList, error: achievementError } = await supabase
        .from('member_achievements')
        .select('*')
        .eq('member_id', memberId)
        .order('achieved_at', { ascending: false })

      if (achievementError) {
        console.error('获取已获得认证失败:', achievementError)
        return []
      }

      if (!achievementList || achievementList.length === 0) return []

      // 再获取认证定义
      const codes = achievementList.map(a => a.achievement_code)
      const { data: definitions, error: defError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .in('code', codes)

      if (defError) {
        console.error('获取认证定义失败:', defError)
        return achievementList
      }

      // 合并数据
      const result = achievementList.map(achievement => {
        const definition = definitions?.find(d => d.code === achievement.achievement_code)
        return {
          ...achievement,
          achievement: definition
        }
      })

      achievements.value = result
      return result
    } catch (error) {
      console.error('获取已获得认证失败:', error)
      return []
    }
  }

  return {
    loading,
    achievements,
    memberLevel,
    progressData,
    getCurrentMemberId,
    getMemberGender,
    getAchievementDefinitions,
    calculateProgress,
    updateProgress,
    checkAndAwardAchievement,
    getMemberLevel,
    getAchievementsByCategory,
    getAllProgress,
    getAchievedList
  }
}
