const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://yfkzunulkvgqhqxqtqxe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlma3p1bnVsa3ZncWhxeHF0cXhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE0NzU5NiwiZXhwIjoyMDUxNzIzNTk2fQ.Aq_A0Nt-eFPXJqxqBqPXWLqLjJqQqLjJqQqLjJqQqLg'
);

(async () => {
  const memberId = '2f5278bf-022e-4138-bfc9-6b07af825d31';

  // 获取训练计划
  const { data: plans } = await supabase
    .from('member_plans')
    .select('template_id')
    .eq('member_id', memberId);

  if (!plans || plans.length === 0) {
    console.log('❌ 找不到训练计划');
    return;
  }

  const templateId = plans[0].template_id;
  console.log('📋 训练计划ID:', templateId);

  // 添加5条训练记录
  const sessions = [];
  const today = new Date();

  for (let i = 1; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    sessions.push({
      template_id: templateId,
      session_number: 25 + i,
      completed: true,
      completed_date: date.toISOString().split('T')[0],
      training_part: '测试',
      core_focus: '测试课次'
    });
  }

  const { data, error } = await supabase
    .from('training_sessions')
    .insert(sessions)
    .select();

  if (error) {
    console.error('❌ 添加失败:', error);
  } else {
    console.log('✅ 成功添加 5 条训练记录');
    console.log('📊 当前总打卡次数应该是: 30');
    console.log('');
    console.log('请刷新会员端页面，查看打卡次数是否变成 30');
  }
})();
