<template>
  <div class="member-list-container">
    <!-- 导航菜单 -->
    <el-menu
      mode="horizontal"
      :default-active="activeMenu"
      @select="handleMenuSelect"
      style="margin-bottom: 20px"
    >
      <el-menu-item index="/coach/members">会员管理</el-menu-item>
      <el-menu-item index="/coach/templates">训练计划模板</el-menu-item>
      <el-menu-item index="/coach/assign-plan">分配训练计划</el-menu-item>
    </el-menu>

    <el-card>
      <template #header>
        <div class="card-header">
          <h2>会员管理</h2>
          <div>
            <el-button type="primary" @click="showAddDialog = true">添加会员</el-button>
            <el-button type="danger" @click="handleLogout" style="margin-left: 10px">退出登录</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="搜索">
          <el-input
            v-model="searchKeyword"
            placeholder="输入姓名或手机号"
            clearable
            @input="handleSearch"
          />
        </el-form-item>
      </el-form>

      <!-- 会员列表 -->
      <el-table :data="filteredMembers" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">
            {{ row.gender === 'male' ? '男' : '女' }}
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="phone" label="电话" width="150" />
        <el-table-column prop="height" label="身高(cm)" width="100" />
        <el-table-column prop="initial_weight" label="初始体重(kg)" width="120" />
        <el-table-column prop="initial_body_fat" label="初始体脂率(%)" width="120" />
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">查看</el-button>
            <el-button size="small" type="primary" @click="editMember(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteMember(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑会员对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingMember ? '编辑会员' : '添加会员'"
      width="600px"
    >
      <el-form :model="memberForm" :rules="memberRules" ref="memberFormRef" label-width="120px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="memberForm.name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="memberForm.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="memberForm.age" :min="1" :max="120" />
        </el-form-item>

        <el-form-item label="电话" prop="phone">
          <el-input v-model="memberForm.phone" placeholder="请输入电话" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="memberForm.email" placeholder="请输入邮箱（选填）" />
        </el-form-item>

        <el-form-item label="身高(cm)" prop="height">
          <el-input-number v-model="memberForm.height" :min="100" :max="250" />
        </el-form-item>

        <el-form-item label="初始体重(kg)" prop="initial_weight">
          <el-input-number v-model="memberForm.initial_weight" :min="30" :max="300" :precision="1" />
        </el-form-item>

        <el-form-item label="初始体脂率(%)" prop="initial_body_fat">
          <el-input-number v-model="memberForm.initial_body_fat" :min="5" :max="60" :precision="1" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveMember" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const { signOut } = useAuth()

// 当前激活的菜单
const activeMenu = ref('/coach/members')

// 菜单选择处理
const handleMenuSelect = (index) => {
  console.log('菜单跳转:', index)
  router.push(index)
}

const members = ref([])
const loading = ref(false)
const saving = ref(false)
const showAddDialog = ref(false)
const editingMember = ref(null)
const searchKeyword = ref('')
const memberFormRef = ref(null)

const memberForm = reactive({
  name: '',
  gender: 'male',
  age: null,
  phone: '',
  email: '',
  height: null,
  initial_weight: null,
  initial_body_fat: null
})

const memberRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  height: [{ required: true, message: '请输入身高', trigger: 'blur' }],
  initial_weight: [{ required: true, message: '请输入初始体重', trigger: 'blur' }]
}

// 过滤后的会员列表
const filteredMembers = computed(() => {
  if (!searchKeyword.value) return members.value

  const keyword = searchKeyword.value.toLowerCase()
  return members.value.filter(
    (member) =>
      member.name.toLowerCase().includes(keyword) || member.phone.includes(keyword)
  )
})

// 加载会员列表
const loadMembers = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    members.value = data || []
  } catch (error) {
    console.error('加载会员列表失败:', error)
    ElMessage.error('加载会员列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  // 搜索逻辑在computed中处理
}

// 查看详情
const viewDetail = (member) => {
  console.log('查看会员详情:', member)
  console.log('跳转路径:', `/coach/members/${member.id}`)
  router.push(`/coach/members/${member.id}`)
}

// 编辑会员
const editMember = (member) => {
  editingMember.value = member
  Object.assign(memberForm, member)
  showAddDialog.value = true
}

// 保存会员
const saveMember = async () => {
  if (!memberFormRef.value) return

  await memberFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        if (editingMember.value) {
          // 更新会员
          const { error } = await supabase
            .from('members')
            .update(memberForm)
            .eq('id', editingMember.value.id)

          if (error) throw error
          ElMessage.success('更新成功')
        } else {
          // 添加新会员
          const { error } = await supabase.from('members').insert([memberForm])

          if (error) throw error
          ElMessage.success('添加成功')
        }

        showAddDialog.value = false
        resetForm()
        loadMembers()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error(`保存失败: ${error.message || JSON.stringify(error)}`)
      } finally {
        saving.value = false
      }
    }
  })
}

// 删除会员
const deleteMember = async (member) => {
  try {
    await ElMessageBox.confirm(`确定要删除会员 ${member.name} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const { error } = await supabase.from('members').delete().eq('id', member.id)

    if (error) throw error

    ElMessage.success('删除成功')
    loadMembers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  editingMember.value = null
  Object.assign(memberForm, {
    name: '',
    gender: 'male',
    age: null,
    phone: '',
    email: '',
    height: null,
    initial_weight: null,
    initial_body_fat: null
  })
  memberFormRef.value?.resetFields()
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 退出登录
const handleLogout = async () => {
  const result = await signOut()
  if (result.success) {
    ElMessage.success('已退出登录')
    router.push('/login')
  } else {
    ElMessage.error('退出失败')
  }
}

onMounted(() => {
  loadMembers()
})
</script>

<style scoped>
.member-list-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
}

.search-form {
  margin-bottom: 20px;
}
</style>
