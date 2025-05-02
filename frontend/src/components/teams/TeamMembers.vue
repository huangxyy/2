<template>
  <div class="team-members">
    <!-- 成员管理工具栏 -->
    <div class="members-toolbar">
      <el-button-group>
        <el-button
          v-if="isAdmin"
          type="primary"
          @click="showInviteDialog = true"
        >
          <el-icon><UserAdd /></el-icon>
          邀请成员
        </el-button>
        <el-button @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </el-button-group>

      <el-input
        v-model="searchQuery"
        placeholder="搜索成员..."
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 成员列表 -->
    <el-table
      v-loading="loading"
      :data="filteredMembers"
      row-key="userId"
      style="width: 100%"
    >
      <el-table-column label="成员" min-width="200">
        <template #default="{ row }">
          <div class="member-info">
            <el-avatar :src="row.user.avatar" :size="40">
              {{ row.user.username.charAt(0) }}
            </el-avatar>
            <div class="member-details">
              <span class="member-name">{{ row.user.username }}</span>
              <span class="member-email">{{ row.user.email }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="角色" width="150">
        <template #default="{ row }">
          <el-tag :type="getRoleTagType(row.role)">
            {{ getRoleName(row.role) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="加入时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.joinedAt) }}
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">
            {{ getStatusName(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column v-if="isAdmin" label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button
              v-if="canManageRole(row)"
              size="small"
              @click="handleChangeRole(row)"
            >
              更改角色
            </el-button>
            <el-button
              v-if="canRemoveMember(row)"
              size="small"
              type="danger"
              @click="handleRemoveMember(row)"
            >
              移除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 邀请成员对话框 -->
    <el-dialog
      v-model="showInviteDialog"
      title="邀请成员"
      width="500px"
    >
      <el-form
        ref="inviteFormRef"
        :model="inviteForm"
        :rules="inviteRules"
        label-width="100px"
      >
        <el-form-item label="邮箱地址" prop="emails">
          <el-select
            v-model="inviteForm.emails"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入或粘贴邮箱地址"
          >
            <el-option
              v-for="email in inviteForm.emails"
              :key="email"
              :label="email"
              :value="email"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="inviteForm.role">
            <el-option label="成员" value="member" />
            <el-option label="管理员" value="admin" />
            <el-option label="协调者" value="moderator" />
          </el-select>
        </el-form-item>

        <el-form-item label="邀请消息" prop="message">
          <el-input
            v-model="inviteForm.message"
            type="textarea"
            :rows="3"
            placeholder="可选的邀请消息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showInviteDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="inviteLoading"
            @click="handleInviteSubmit"
          >
            发送邀请
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 更改角色对话框 -->
    <el-dialog
      v-model="showRoleDialog"
      title="更改成员角色"
      width="400px"
    >
      <el-form
        v-if="selectedMember"
        ref="roleFormRef"
        :model="roleForm"
        label-width="100px"
      >
        <el-form-item label="当前角色">
          <el-tag :type="getRoleTagType(selectedMember.role)">
            {{ getRoleName(selectedMember.role) }}
          </el-tag>
        </el-form-item>

        <el-form-item label="新角色" prop="role">
          <el-select v-model="roleForm.role">
            <el-option label="成员" value="member" />
            <el-option label="管理员" value="admin" />
            <el-option label="协调者" value="moderator" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showRoleDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="roleLoading"
            @click="handleRoleSubmit"
          >
            确认更改
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UserAdd, Search, Refresh } from '@element-plus/icons-vue';
import { useStore } from 'vuex';

export default defineComponent({
  name: 'TeamMembers',
  components: {
    UserAdd,
    Search,
    Refresh,
  },
  props: {
    teamId: {
      type: Number,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const store = useStore();
    const loading = ref(false);
    const searchQuery = ref('');
    const showInviteDialog = ref(false);
    const showRoleDialog = ref(false);
    const inviteLoading = ref(false);
    const roleLoading = ref(false);
    const selectedMember = ref(null);

    // 表单refs
    const inviteFormRef = ref(null);
    const roleFormRef = ref(null);

    // 邀请表单
    const inviteForm = ref({
      emails: [] as string[],
      role: 'member',
      message: '',
    });

    // 角色表单
    const roleForm = ref({
      role: 'member',
    });

    // 验证规则
    const inviteRules = {
      emails: [
        { required: true, message: '请输入邮箱地址', trigger: 'blur' },
        { 
          validator: (rule: any, value: string[], callback: Function) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const invalid = value.some(email => !emailRegex.test(email));
            if (invalid) {
              callback(new Error('请输入有效的邮箱地址'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        },
      ],
      role: [
        { required: true, message: '请选择角色', trigger: 'change' },
      ],
    };

    // 获取成员列表
    const members = computed(() => store.state.teams.currentTeamMembers);

    // 筛选成员
    const filteredMembers = computed(() => {
      if (!searchQuery.value) return members.value;
      
      const query = searchQuery.value.toLowerCase();
      return members.value.filter(member => 
        member.user.username.toLowerCase().includes(query) ||
        member.user.email.toLowerCase().includes(query)
      );
    });

    // 加载成员数据
    const loadMembers = async () => {
      loading.value = true;
      try {
        await store.dispatch('teams/fetchTeamMembers', props.teamId);
      } catch (error) {
        ElMessage.error('加载成员列表失败');
      } finally {
        loading.value = false;
      }
    };

    // 处理邀请提交
    const handleInviteSubmit = async () => {
      if (!inviteFormRef.value) return;

      try {
        await inviteFormRef.value.validate();
        inviteLoading.value = true;

        await store.dispatch('teams/inviteMembers', {
          teamId: props.teamId,
          ...inviteForm.value,
        });

        ElMessage.success('邀请已发送');
        showInviteDialog.value = false;
        inviteForm.value = {
          emails: [],
          role: 'member',
          message: '',
        };
      } catch (error) {
        ElMessage.error('发送邀请失败');
      } finally {
        inviteLoading.value = false;
      }
    };

    // 处理角色更改
    const handleChangeRole = (member: any) => {
      selectedMember.value = member;
      roleForm.value.role = member.role;
      showRoleDialog.value = true;
    };

    // 提交角色更改
    const handleRoleSubmit = async () => {
      if (!selectedMember.value) return;

      try {
        roleLoading.value = true;
        await store.dispatch('teams/updateMemberRole', {
          teamId: props.teamId,
          userId: selectedMember.value.userId,
          role: roleForm.value.role,
        });

        ElMessage.success('角色已更新');
        showRoleDialog.value = false;
        await loadMembers();
      } catch (error) {
        ElMessage.error('更新角色失败');
      } finally {
        roleLoading.value = false;
      }
    };

    // 处理移除成员
    const handleRemoveMember = async (member: any) => {
      try {
        await ElMessageBox.confirm(
          `确定要移除成员 ${member.user.username} 吗？`,
          '移除成员',
          {
            type: 'warning',
          }
        );

        await store.dispatch('teams/removeMember', {
          teamId: props.teamId,
          userId: member.userId,
        });

        ElMessage.success('成员已移除');
        await loadMembers();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('移除成员失败');
        }
      }
    };

    // 工具函数
    const getRoleTagType = (role: string) => {
      const types: Record<string, string> = {
        owner: 'danger',
        admin: 'warning',
        moderator: 'success',
        member: 'info',
      };
      return types[role] || 'info';
    };

    const getRoleName = (role: string) => {
      const names: Record<string, string> = {
        owner: '所有者',
        admin: '管理员',
        moderator: '协调者',
        member: '成员',
      };
      return names[role] || role;
    };

    const getStatusTagType = (status: string) => {
      const types: Record<string, string> = {
        active: 'success',
        pending: 'warning',
        suspended: 'danger',
      };
      return types[status] || 'info';
    };

    const getStatusName = (status: string) => {
      const names: Record<string, string> = {
        active: '活跃',
        pending: '待定',
        suspended: '已停用',
      };
      return names[status] || status;
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleString();
    };

    const canManageRole = (member: any) => {
      return props.isAdmin && member.role !== 'owner';
    };

    const canRemoveMember = (member: any) => {
      return props.isAdmin && member.role !== 'owner';
    };

    // 初始化
    loadMembers();

    return {
      loading,
      searchQuery,
      members: filteredMembers,
      showInviteDialog,
      showRoleDialog,
      inviteForm,
      roleForm,
      inviteRules,
      inviteLoading,
      roleLoading,
      selectedMember,
      inviteFormRef,
      roleFormRef,
      handleInviteSubmit,
      handleChangeRole,
      handleRoleSubmit,
      handleRemoveMember,
      handleRefresh: loadMembers,
      getRoleTagType,
      getRoleName,
      getStatusTagType,
      getStatusName,
      formatDate,
      canManageRole,
      canRemoveMember,
    };
  },
});
</script>

<style scoped>
.team-members {
  padding: 20px;
}

.members-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-details {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-weight: 500;
}

.member-email {
  font-size: 12px;
  color: #666;
}

.el-tag {
  text-transform: capitalize;
}
</style>