-- 验证表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'achievement_definitions',
  'member_achievement_progress', 
  'member_achievements',
  'member_levels'
)
ORDER BY table_name;
