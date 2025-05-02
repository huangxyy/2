<template>
  <div class="team-settings">
    <el-container>
      <el-aside width="200px">
        <el-menu
          :default-active="activeMenu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="basic">
            <el-icon><Setting /></el-icon>
            <span>基本设置</span>
          </el-menu-item>
          <el-menu-item index="members">
            <el-icon><UserFilled /></el-icon>
            <span>成员管理</span>
          </el-menu-item>
          <el-menu-item index="permissions">
            <el-icon><Lock /></el-icon>
            <span>权限设置</span>
          </el-menu-item>
          <el-menu-item index="advanced">
            <el-icon><Tools /></el-icon>
            <span>高级设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-main>
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="10" animated />
        </div>
        
        <template v-else>
          <!-- 基本设置 -->
          <div v-if="activeMenu === 'basic'">
            <h2>基本设置</h2>
            <team-form
              :initial-data="teamData"
              :is-edit="true"
              @submit="handleUpdateTeam"
              @cancel="handleCancel"
            />
          </div>

          <!-- 成员管理 -->
          <div v-else-if="activeMenu === 'members'">
            <h2>成员管理</h2>
            <team-members
              :team-id="teamId"
              :is-admin="isTeamAdmin"
            />
          </div>

          <!-- 权限设置 -->
          <div v-else-if="activeMenu === 'permissions'">
            <h2>权限设置</h2>
            <team-permissions
              :team-id="teamId"
              :is-owner="isTeamOwner"
            />
          </div>

          <!-- 高级设置 -->
          <div v-else-if="activeMenu === 'advanced'">
            <h2>高级设置</h2>
            <div class="danger-zone">
              <h3>危险操作</h3>
              <div class="danger-actions">
                <div class="danger-action">
                  <div class="action-content">
                    <h4>归档团队</h4>
                    <p>暂时停用团队，成员将无法访问团队资源。</p>
                  </div>
                  <el-button type="warning" @click="handleArchiveTeam">
                    归档团队
                  </el-button>
                </div>

                <div class="danger-action">
                  <div class="action-content">
                    <h4>删除团队</h4>
                    <p>永久删除团队及其所有数据，此操作不可恢复。</p>
                  </div>
                  <el-button type="danger" @click="handleDeleteTeam">
                    删除团队
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </el-main>
    </el-container>

    <!-- 确认对话框 -->
    <el-dialog
      v-model="confirmDialog.visible"
      :title="confirmDialog.title"
      width="30%"
    >
      <span>{{ confirmDialog.message }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialog.visible = false">取消</el-button>
          <el-button
            type="primary"
            :type="confirmDialog.type"
            @click="handleConfirmAction"
          >
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Setting, UserFilled, Lock, Tools } from '@element-plus/icons-vue';
import { useStore } from 'vuex';
import TeamForm from '@/components/teams/TeamForm.vue';
import TeamMembers from '@/components/teams/TeamMembers.vue';
import TeamPermissions from '@/components/teams/TeamPermissions.vue';

export default defineComponent({
  name: 'TeamSettingsView',
  components: {
    TeamForm,
    TeamMembers,
    TeamPermissions,
    Setting,
    UserFilled,
    Lock,
    Tools,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();

    const teamId = parseInt(route.params.id as string);
    const activeMenu = ref('basic');
    const loading = ref(true);
    const teamData = ref<any>({});

    const confirmDialog = ref({
      visible: false,
      title: '',
      message: '',
      type: 'primary',
      action: null as (() => void) | null,
    });

    const isTeamOwner = computed(() => {
      return teamData.value?.ownerId === store.state.user.id;
    });

    const isTeamAdmin = computed(() => {
      return isTeamOwner.value || teamData.value?.userRole === 'admin';
    });

    const loadTeamData = async () => {
      try {
        loading.value = true;
        const response = await store.dispatch('teams/getTeamDetails', teamId);
        teamData.value = response.data;
      } catch (error) {
        ElMessage.error('加载团队信息失败');
        router.push('/teams');
      } finally {
        loading.value = false;
      }
    };

    const handleMenuSelect = (index: string) => {
      activeMenu.value = index;
    };

    const handleUpdateTeam = async (data: any) => {
      try {
        await store.dispatch('teams/updateTeam', {
          teamId,
          data,
        });
        ElMessage.success('更新成功');
        loadTeamData();
      } catch (error) {
        ElMessage.error('更新失败');
      }
    };

    const handleArchiveTeam = () => {
      confirmDialog.value = {
        visible: true,
        title: '归档团队',
        message: '确定要归档这个团队吗？归档后团队将被暂时停用。',
        type: 'warning',
        action: async () => {
          try {
            await store.dispatch('teams/archiveTeam', teamId);
            ElMessage.success('团队已归档');
            router.push('/teams');
          } catch (error) {
            ElMessage.error('归档失败');
          }
        },
      };
    };

    const handleDeleteTeam = () => {
      confirmDialog.value = {
        visible: true,
        title: '删除团队',
        message: '此操作将永久删除该团队，是否继续？',
        type: 'danger',
        action: async () => {
          try {
            await store.dispatch('teams/deleteTeam', teamId);
            ElMessage.success('团队已删除');
            router.push('/teams');
          } catch (error) {
            ElMessage.error('删除失败');
          }
        },
      };
    };

    const handleConfirmAction = async () => {
      if (confirmDialog.value.action) {
        await confirmDialog.value.action();
      }
      confirmDialog.value.visible = false;
    };

    const handleCancel = () => {
      router.push('/teams');
    };

    onMounted(() => {
      loadTeamData();
    });

    return {
      teamId,
      activeMenu,
      loading,
      teamData,
      confirmDialog,
      isTeamOwner,
      isTeamAdmin,
      handleMenuSelect,
      handleUpdateTeam,
      handleArchiveTeam,
      handleDeleteTeam,
      handleConfirmAction,
      handleCancel,
    };
  },
});
</script>

<style scoped>
.team-settings {
  height: 100%;
  background-color: #fff;
}

.el-aside {
  background-color: #f5f7fa;
  border-right: 1px solid #e6e6e6;
}

.el-main {
  padding: 20px;
}

.loading-container {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  font-weight: 500;
}

.danger-zone {
  margin-top: 40px;
  padding: 20px;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
}

.danger-zone h3 {
  color: #ff4d4f;
  margin-bottom: 20px;
}

.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.danger-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
}

.action-content h4 {
  margin: 0 0 8px;
  color: #ff4d4f;
}

.action-content p {
  margin: 0;
  color: #666;
}
</style>