<template>
  <!-- ... (前面的代码保持不变) ... -->

            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'active' ? 'success' : 'info'"
                >
                  {{ row.status === 'active' ? '活跃' : '已归档' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button-group>
                  <el-button
                    size="small"
                    @click.stop="handleTeamSettings(row)"
                  >
                    设置
                  </el-button>
                  <el-button
                    v-if="canManageTeam(row)"
                    size="small"
                    type="danger"
                    @click.stop="handleArchiveTeam(row)"
                  >
                    {{ row.status === 'active' ? '归档' : '恢复' }}
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </template>

      <!-- 空状态 -->
      <el-empty
        v-else
        :description="loading ? '加载中...' : '暂无团队'"
      >
        <template #default>
          <el-button
            v-if="!loading"
            type="primary"
            @click="showCreateDialog = true"
          >
            创建第一个团队
          </el-button>
        </template>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 36, 48]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 创建团队对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建团队"
      width="600px"
    >
      <team-form
        @submit="handleCreateTeam"
        @cancel="showCreateDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Grid, List } from '@element-plus/icons-vue';
import { useStore } from 'vuex';
import TeamForm from '@/components/teams/TeamForm.vue';

export default defineComponent({
  name: 'TeamsView',
  components: {
    TeamForm,
    Plus,
    Search,
    Grid,
    List,
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    // 状态
    const loading = ref(false);
    const showCreateDialog = ref(false);
    const viewType = ref('grid');
    const searchQuery = ref('');
    const filterRole = ref('');
    const filterStatus = ref('');
    const currentPage = ref(1);
    const pageSize = ref(12);
    const total = ref(0);

    // 计算属性
    const teams = computed(() => store.state.teams.list);
    const filteredTeams = computed(() => {
      let result = [...teams.value];

      // 搜索过滤
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(team =>
          team.name.toLowerCase().includes(query) ||
          team.description?.toLowerCase().includes(query)
        );
      }

      // 角色过滤
      if (filterRole.value) {
        result = result.filter(team => team.userRole === filterRole.value);
      }

      // 状态过滤
      if (filterStatus.value) {
        result = result.filter(team => team.status === filterStatus.value);
      }

      return result;
    });

    // 方法
    const loadTeams = async () => {
      loading.value = true;
      try {
        const response = await store.dispatch('teams/fetchTeams', {
          page: currentPage.value,
          pageSize: pageSize.value,
        });
        total.value = response.total;
      } catch (error) {
        ElMessage.error('加载团队列表失败');
      } finally {
        loading.value = false;
      }
    };

    const handleCreateTeam = async (data: any) => {
      try {
        await store.dispatch('teams/createTeam', data);
        showCreateDialog.value = false;
        ElMessage.success('团队创建成功');
        loadTeams();
      } catch (error) {
        ElMessage.error('创建团队失败');
      }
    };

    const handleTeamClick = (team: any) => {
      router.push(`/teams/${team.id}`);
    };

    const handleTeamSettings = (team: any) => {
      router.push(`/teams/${team.id}/settings`);
    };

    const handleArchiveTeam = async (team: any) => {
      try {
        const action = team.status === 'active' ? '归档' : '恢复';
        await ElMessageBox.confirm(
          `确定要${action}该团队吗？`,
          `${action}团队`,
          {
            type: 'warning',
          }
        );

        await store.dispatch('teams/updateTeamStatus', {
          teamId: team.id,
          status: team.status === 'active' ? 'archived' : 'active',
        });

        ElMessage.success(`团队已${action}`);
        loadTeams();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(`${team.status === 'active' ? '归档' : '恢复'}失败`);
        }
      }
    };

    const handleSizeChange = (size: number) => {
      pageSize.value = size;
      currentPage.value = 1;
      loadTeams();
    };

    const handleCurrentChange = (page: number) => {
      currentPage.value = page;
      loadTeams();
    };

    // 工具方法
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString();
    };

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

    const canManageTeam = (team: any) => {
      return ['owner', 'admin'].includes(team.userRole);
    };

    // 生命周期
    onMounted(() => {
      loadTeams();
    });

    return {
      loading,
      showCreateDialog,
      viewType,
      searchQuery,
      filterRole,
      filterStatus,
      currentPage,
      pageSize,
      total,
      filteredTeams,
      handleCreateTeam,
      handleTeamClick,
      handleTeamSettings,
      handleArchiveTeam,
      handleSizeChange,
      handleCurrentChange,
      formatDate,
      getRoleTagType,
      getRoleName,
      canManageTeam,
    };
  },
});
</script>

<style scoped>
.teams-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.filters {
  display: flex;
  gap: 16px;
}

.search-input {
  width: 240px;
}

.teams-container {
  min-height: 400px;
}

.teams-container.view-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.team-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.team-card:hover {
  transform: translateY(-4px);
}

.team-card-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #eee;
}

.team-info h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
}

.team-meta {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.team-meta .dot {
  margin: 0 4px;
}

.team-card-content {
  padding: 20px;
}

.team-description {
  margin: 0 0 16px;
  font-size: 14px;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.team-tags {
  display: flex;
  gap: 8px;
}

.team-list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.team-list-info h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
}

.team-list-info p {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>