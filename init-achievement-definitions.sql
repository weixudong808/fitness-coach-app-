-- 初始化认证定义数据
-- 创建时间：2026-03-08
-- 用途：插入所有认证的标准和条件

-- 清空现有数据（如果需要重新初始化）
-- TRUNCATE TABLE achievement_definitions CASCADE;

-- =====================================================
-- 1. 新手认证（Lv.1）
-- =====================================================
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'newbie',
  '新手会员',
  'newbie',
  1,
  '欢迎加入健身大家庭！',
  '{"type":"register","target":1,"description":"完成注册"}'::jsonb,
  '欢迎加入我们！开始你的健身之旅吧！',
  '🎉',
  1
);

-- =====================================================
-- 2. 打卡认证（Lv.2-3）
-- =====================================================

-- 10次打卡里程碑
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'check_in_10',
  '10次打卡',
  'check_in',
  2,
  '完成10次训练打卡',
  '{"type":"check_in_count","target":10,"description":"完成10次训练打卡"}'::jsonb,
  '恭喜你完成了10次训练！坚持就是胜利，继续加油！',
  '🏃',
  10
);

-- 25次打卡里程碑
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'check_in_25',
  '25次打卡',
  'check_in',
  2,
  '完成25次训练打卡',
  '{"type":"check_in_count","target":25,"description":"完成25次训练打卡"}'::jsonb,
  '太棒了！你已经完成了25次训练，习惯正在养成！',
  '💪',
  11
);

-- 50次打卡里程碑
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'check_in_50',
  '50次打卡',
  'check_in',
  2,
  '完成50次训练打卡',
  '{"type":"check_in_count","target":50,"description":"完成50次训练打卡"}'::jsonb,
  '了不起！50次训练是一个重要的里程碑，你已经超越了大多数人！',
  '🔥',
  12
);

-- 75次打卡里程碑
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'check_in_75',
  '75次打卡',
  'check_in',
  2,
  '完成75次训练打卡',
  '{"type":"check_in_count","target":75,"description":"完成75次训练打卡"}'::jsonb,
  '坚持不懈！距离100次认证只差一步了，加油！',
  '⭐',
  13
);

-- 100次打卡认证
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'check_in_100',
  '100次打卡认证',
  'check_in',
  3,
  '完成100次训练打卡',
  '{"type":"check_in_count","target":100,"description":"完成100次训练打卡"}'::jsonb,
  '恭喜你完成了100次的运动打卡！很荣幸可以见证你里程碑的突破，100次是一年的三分之一，一路走来并不容易，但是你成功的坚持了下来，你的这份努力值得纪念，特此给你颁发这份独属于你的100次纪念证书，希望你可以永远热爱锻炼，拥抱健康生活，做你身边最积极正能量的那个人。',
  '🏆',
  14
);

-- =====================================================
-- 3. 影响力认证（Lv.3）
-- =====================================================
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'influence',
  '影响力认证',
  'influence',
  3,
  '成功转介绍朋友加入',
  '{"type":"referral_count","target":1,"description":"成功转介绍1位朋友加入"}'::jsonb,
  '恭喜你成功的影响了身边的朋友开始锻炼，也感谢你可以选择加入我们，希望你和你的朋友可以一起收获健康，快乐，并把锻炼变成生活的一部分，去相信光，成为光，影响更多的人，现在赠与你象征影响力的徽章，希望你可以永远热爱锻炼，拥抱健康生活，做你身边最积极正能量的那个人。',
  '✨',
  20
);

-- =====================================================
-- 4. 基础体能认证（Lv.4-5）- 男生版
-- =====================================================

-- 男生 - 俯卧撑15次
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_male_1',
  '基础体能 - 俯卧撑',
  'basic_fitness',
  4,
  '男生：俯卧撑15次',
  '{"type":"exercise_performance","exercise":"俯卧撑","target":15,"unit":"次","gender":"male","description":"俯卧撑达到15次"}'::jsonb,
  '太棒了！你的上肢力量已经达到基础标准！',
  '💪',
  30
);

-- 男生 - 引体向上1次
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_male_2',
  '基础体能 - 引体向上',
  'basic_fitness',
  4,
  '男生：引体向上1次',
  '{"type":"exercise_performance","exercise":"引体向上","target":1,"unit":"次","gender":"male","description":"引体向上达到1次"}'::jsonb,
  '突破了！引体向上是最难的动作之一，你做到了！',
  '🎯',
  31
);

-- 男生 - 静蹲90秒
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_male_3',
  '基础体能 - 静蹲',
  'basic_fitness',
  4,
  '男生：静蹲90秒',
  '{"type":"exercise_performance","exercise":"静蹲","target":90,"unit":"秒","gender":"male","description":"静蹲达到90秒"}'::jsonb,
  '下肢力量很稳！继续保持！',
  '🦵',
  32
);

-- 男生 - 平板支撑2分钟
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_male_4',
  '基础体能 - 平板支撑',
  'basic_fitness',
  4,
  '男生：平板支撑2分钟',
  '{"type":"exercise_performance","exercise":"平板支撑","target":120,"unit":"秒","gender":"male","description":"平板支撑达到2分钟"}'::jsonb,
  '核心力量扎实！你的基础很好！',
  '🔥',
  33
);

-- 男生 - 波比跳20次/2分钟
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_male_5',
  '基础体能 - 波比跳',
  'basic_fitness',
  4,
  '男生：波比跳20次/2分钟',
  '{"type":"exercise_performance","exercise":"波比跳","target":20,"unit":"次","time_limit":120,"gender":"male","description":"2分钟内完成20次波比跳"}'::jsonb,
  '心肺功能优秀！你的体能很棒！',
  '❤️',
  34
);

-- 男生 - 坐姿体前屈
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_male_6',
  '基础体能 - 柔韧性',
  'basic_fitness',
  4,
  '男生：坐姿体前屈达标',
  '{"type":"exercise_performance","exercise":"坐姿体前屈","target":1,"unit":"达标","gender":"male","description":"坐姿体前屈达标"}'::jsonb,
  '柔韧性很好！身体协调性优秀！',
  '🧘',
  35
);

-- =====================================================
-- 5. 基础体能认证（Lv.4-5）- 女生版
-- =====================================================

-- 女生 - 跪姿俯卧撑15次
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_female_1',
  '基础体能 - 跪姿俯卧撑',
  'basic_fitness',
  4,
  '女生：跪姿俯卧撑15次',
  '{"type":"exercise_performance","exercise":"跪姿俯卧撑","target":15,"unit":"次","gender":"female","description":"跪姿俯卧撑达到15次"}'::jsonb,
  '太棒了！你的上肢力量已经达到基础标准！',
  '💪',
  40
);

-- 女生 - 反向划船25次
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_female_2',
  '基础体能 - 反向划船',
  'basic_fitness',
  4,
  '女生：反向划船25次',
  '{"type":"exercise_performance","exercise":"反向划船","target":25,"unit":"次","gender":"female","description":"反向划船达到25次"}'::jsonb,
  '背部力量很强！继续保持！',
  '🎯',
  41
);

-- 女生 - 静蹲90秒
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_female_3',
  '基础体能 - 静蹲',
  'basic_fitness',
  4,
  '女生：静蹲90秒',
  '{"type":"exercise_performance","exercise":"静蹲","target":90,"unit":"秒","gender":"female","description":"静蹲达到90秒"}'::jsonb,
  '下肢力量很稳！继续保持！',
  '🦵',
  42
);

-- 女生 - 平板支撑90秒
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_female_4',
  '基础体能 - 平板支撑',
  'basic_fitness',
  4,
  '女生：平板支撑90秒',
  '{"type":"exercise_performance","exercise":"平板支撑","target":90,"unit":"秒","gender":"female","description":"平板支撑达到90秒"}'::jsonb,
  '核心力量扎实！你的基础很好！',
  '🔥',
  43
);

-- 女生 - 波比跳20次/2分钟
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_female_5',
  '基础体能 - 波比跳',
  'basic_fitness',
  4,
  '女生：波比跳20次/2分钟',
  '{"type":"exercise_performance","exercise":"波比跳","target":20,"unit":"次","time_limit":120,"gender":"female","description":"2分钟内完成20次波比跳"}'::jsonb,
  '心肺功能优秀！你的体能很棒！',
  '❤️',
  44
);

-- 女生 - 坐姿体前屈
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_female_6',
  '基础体能 - 柔韧性',
  'basic_fitness',
  4,
  '女生：坐姿体前屈达标',
  '{"type":"exercise_performance","exercise":"坐姿体前屈","target":1,"unit":"达标","gender":"female","description":"坐姿体前屈达标"}'::jsonb,
  '柔韧性很好！身体协调性优秀！',
  '🧘',
  45
);

-- 基础体能总认证
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'basic_fitness_complete',
  '基础体能认证',
  'basic_fitness',
  5,
  '完成全部6项基础体能考核',
  '{"type":"achievement_group","target":6,"group":"basic_fitness","description":"完成全部6项基础体能考核"}'::jsonb,
  '恭喜你完成了基础体能认证！你已经具备了良好的身体素质，可以开始更高强度的训练了！',
  '🏅',
  50
);

-- =====================================================
-- 6. 高级体能认证（Lv.6-8）
-- =====================================================

-- 上肢力量认证
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'advanced_fitness_upper',
  '高级体能 - 上肢力量',
  'advanced_fitness',
  6,
  '卧推、引体向上达到高级标准',
  '{"type":"exercise_group","exercises":[{"name":"卧推","target_male":"1.2x体重","target_female":"0.8x体重"},{"name":"引体向上","target_male":10,"target_female":5}],"description":"上肢力量达到高级标准"}'::jsonb,
  '上肢力量已经达到高级水平！你的训练非常有效！',
  '💪',
  60
);

-- 下肢力量认证
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'advanced_fitness_lower',
  '高级体能 - 下肢力量',
  'advanced_fitness',
  6,
  '深蹲、硬拉达到高级标准',
  '{"type":"exercise_group","exercises":[{"name":"深蹲","target_male":"1.5x体重","target_female":"1.0x体重"},{"name":"硬拉","target_male":"1.8x体重","target_female":"1.2x体重"}],"description":"下肢力量达到高级标准"}'::jsonb,
  '下肢力量强大！你的腿部训练非常到位！',
  '🦵',
  61
);

-- 核心力量认证
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'advanced_fitness_core',
  '高级体能 - 核心力量',
  'advanced_fitness',
  7,
  '腹肌轮、平板支撑达到高级标准',
  '{"type":"exercise_group","exercises":[{"name":"腹肌轮","target_male":20,"target_female":15},{"name":"平板支撑","target_male":300,"target_female":240}],"description":"核心力量达到高级标准"}'::jsonb,
  '核心力量出色！你的身体稳定性非常好！',
  '🔥',
  62
);

-- 心肺功能认证
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'advanced_fitness_cardio',
  '高级体能 - 心肺功能',
  'advanced_fitness',
  7,
  '战绳、5公里跑达到高级标准',
  '{"type":"exercise_group","exercises":[{"name":"战绳","target_male":180,"target_female":120},{"name":"5公里跑","target_male":1500,"target_female":1800}],"description":"心肺功能达到高级标准"}'::jsonb,
  '心肺功能优秀！你的耐力非常强！',
  '❤️',
  63
);

-- 体脂率认证（暂时保留，等体测功能开发后启用）
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order, is_active)
VALUES (
  'advanced_fitness_bodyfat',
  '高级体能 - 体脂率',
  'advanced_fitness',
  8,
  '体脂率达到健康标准',
  '{"type":"body_metric","metric":"body_fat","target_male_min":14,"target_male_max":17,"target_female_min":21,"target_female_max":24,"description":"体脂率达到健康标准"}'::jsonb,
  '体脂率达标！你的身体成分非常健康！',
  '⚖️',
  64,
  false  -- 暂时不启用，等体测功能开发后再启用
);

-- 高级体能总认证
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'advanced_fitness_complete',
  '高级体能认证',
  'advanced_fitness',
  8,
  '完成全部5项高级体能考核',
  '{"type":"achievement_group","target":5,"group":"advanced_fitness","description":"完成全部5项高级体能考核"}'::jsonb,
  '恭喜你完成了高级体能认证！你已经是健身房的佼佼者，现在可以开启自主训练模式了！',
  '👑',
  70
);

-- =====================================================
-- 7. 自主训练者认证（Lv.9）
-- =====================================================
INSERT INTO achievement_definitions (code, name, category, level, description, requirement, reward_text, reward_badge, sort_order)
VALUES (
  'master',
  '自主训练者',
  'master',
  9,
  '完成所有认证，成为健身达人',
  '{"type":"achievement_group","target":"all","description":"完成所有认证"}'::jsonb,
  '恭喜你成为自主训练者！你已经掌握了科学训练的方法，拥有了优秀的身体素质。继续保持，你就是健身房最闪耀的那颗星！',
  '🌟',
  100
);

-- =====================================================
-- 完成提示
-- =====================================================
DO $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM achievement_definitions;
  RAISE NOTICE '✅ 认证定义数据初始化完成！';
  RAISE NOTICE '📊 共插入 % 个认证定义', total_count;
  RAISE NOTICE '';
  RAISE NOTICE '认证分类统计：';
  RAISE NOTICE '  - 新手认证：1个';
  RAISE NOTICE '  - 打卡认证：6个（10次、25次、50次、75次、100次 + 里程碑）';
  RAISE NOTICE '  - 影响力认证：1个';
  RAISE NOTICE '  - 基础体能认证：13个（男生6项 + 女生6项 + 总认证）';
  RAISE NOTICE '  - 高级体能认证：6个（上肢、下肢、核心、心肺、体脂率 + 总认证）';
  RAISE NOTICE '  - 自主训练者：1个';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：开发进度计算服务（useAchievements.js）';
END $$;
