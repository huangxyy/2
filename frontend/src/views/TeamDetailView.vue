<template>
  <div class="team-detail">
    <!-- 团队头部信息 -->
    <div class="team-header">
      <div class="team-basic-info">
        <el-avatar
          :src="team?.avatar"
          :size="80"
          class="team-avatar"
        >
          {{ team?.name?.charAt(0) }}
        </el-avatar>
        <div class="team-info">
          <div class="team-title">
            <h1>{{ team?.name }}</h1>
            <el-tag
              v-if="team?.visibility"
              :type="getVisibilityTagType(team.visibility)"
              size="small"
            >
              {{ getVisibilityName(team.visibility) }}
            </el-tag>
          </div>
          <p class="team-description">{{ team?.description || '暂无描述' }}</p>
          <div class="team-meta">
            <span>
              <el-icon><User /></el-icon>
              {{ team?.membersCount }} 成员
            </span>
            <span>
              <el-icon><Calendar /></el-icon>
              创建于 {{ formatDate(team?.createdAt) }}
            </span>
            <span>
              <el-icon><Star /></el-icon>
              我的角色: {{ getRoleName(team?.userRole) }}
            </span>
          </div>
        </div>
      </div>
      <div class="team-actions">
        <el-button-group v-if="team?.status === 'active'">
          <el-button
            v-if="canInviteMembers"
            type="primary"
            @click="showInviteDialog = true"
          >
            <el-icon><UserAdd /></el-icon>
            邀请成员
          </el-button>
          <el-button
            v-if="canManageTeam"
            @click="handleTeamSettings"
          >
            <el-icon><Setting /></el-icon>
            团队设置
          </el-button>
        </el-button-group>
        <el-tag
          v-else
          type="info"
          size="large"
        >
          此团队已归档
        </el-tag>
      </div>
    </div>

    <!-- 团队导航 -->
    <div class="team-nav">
      <el-menu
        :default-active="activeTab"
        mode="horizontal"
        @select="handleTabChange"
      >
        <el-menu-item index="overview">
          <el-icon><Grid /></el-icon>
          概览
        </el-menu-item>
        <el-menu-item index="members">
          <el-icon><User /></el-icon>
          成员
        </el-menu-item>
        <el-menu-item index="projects">
          <el-icon><Folder /></el-icon>
          项目
        </el-menu-item>
        <el-menu-item index="resources">
          <el-icon><Files /></el-icon>
          资源
        </el-menu-item>
        <el-menu-item index="analytics">
          <el-icon><TrendCharts /></el-icon>
          分析
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 主要内容区域 -->
    <div class="team-content">
      <!-- 概览页面 -->
      <div v-if="activeTab === 'overview'" class="tab-content">
        <el-row :gutter="20">
          <el-col :span="16">
            <!-- 最新动态 -->
            <el-card class="content-card">
              <template #header>
                <div class="card-header">
                  <h3>最新动态</h3>
                  <el-button text>查看全部</el-button>
                </div>
              </template>
              <div class="activity-list">
                <div
                  v-for="activity in activities"
                  :key="activity.id"
                  class="activity-item"
                >
                  <el-avatar :src="activity.user.avatar" :size="32" />
                  <div class="activity-content">
                    <div class="activity-header">
                      <span class="username">{{ activity.user.username }}</span>
                      <span class="action">{{ activity.action }}</span>
                      <span class="time">{{ formatRelativeTime(activity.createdAt) }}</span>
                    </div>
                    <p class="activity-description">{{ activity.description }}</p>
                  </div>
                </div>
              </div>
            </el-card>

            <!-- 进行中的项目 -->
            <el-card class="content-card">
              <template #header>
                <div class="card-header">
                  <h3>进行中的项目</h3>
                  <el-button text>管理项目</el-button>
                </div>
              </template>
              <div class="project-list">
                <div
                  v-for="project in activeProjects"
                  :key="project.id"
                  class="project-item"
                >
                  <div class="project-info">
                    <h4>{{ project.name }}</h4>
                    <el-progress
                      :percentage="project.progress"
                      :status="getProgressStatus(project.progress)"
                    />
                    <p class="project-meta">
                      <span>{{ project.tasksCompleted }}/{{ project.totalTasks }} 任务</span>
                      <span>截止日期: {{ formatDate(project.dueDate) }}</span>
                    </p>
                  </div>
                  <div class="project-members">
                    <el-avatar-group :size="32" :max="3">
                      <el-avatar
                        v-for="member in project.members"
                        :key="member.id"
                        :src="member.avatar"
                      />
                    </el-avatar-group>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :span="8">
            <!-- 团队统计 -->
            <el-card class="content-card">
              <template #header>
                <div class="card-header">
                  <h3>团队统计</h3>
                </div>
              </template>
              <div class="stats-grid">
                <div class="stat-item">
                  <h4>活跃成员</h4>
                  <div class="stat-value">
                    {{ teamStats.activeMembers }}
                    <small>/ {{ team?.membersCount }}</small>
                  </div>
                </div>
                <div class="stat-item">
                  <h4>项目完成率</h4>
                  <div class="stat-value">
                    {{ teamStats.projectCompletionRate }}%
                  </div>
                </div>
                <div class="stat-item">
                  <h4>本周活动</h4>
                  <div class="stat-value">
                    {{ teamStats.weeklyActivities }}
                  </div>
                </div>
                <div class="stat-item">
                  <h4>资源使用</h4>
                  <div class="stat-value">
                    {{ teamStats.resourceUsage }}%
                  </div>
                </div>
              </div>
            </el-card>

            <!-- 待处理事项 -->
            <el-card class="content-card">
              <template #header>
                <div class="card-header">
                  <h3>待处理事项</h3>
                  <el-button text>查看全部</el-button>
                </div>
              </template>
              <div class="todo-list">
                <el-checkbox-group v-model="completedTodos">
                  <div
                    v-for="todo in todos"
                    :key="todo.id"
                    class="todo-item"
                  >
                    <el-checkbox :label="todo.id">
                      {{ todo.content }}
                    </el-checkbox>
                    <span class="todo-due">{{ formatRelativeTime(todo.dueDate) }}</span>
                  </div>
                </el-checkbox-group>
              </div>
            </el-card>

            <!-- 团队公告 -->
            <el-card class="content-card">
              <template #header>
                <div class="card-header">
                  <h3>团队公告</h3>
                  <el-button
                    v-if="canManageTeam"
                    text
                    @click="handleEditAnnouncement"
                  >
                    编辑
                  </el-button>
                </div>
              </template>
              <div class="announcement-content">
                <div v-if="team?.announcement" v-html="formatAnnouncement(team.announcement)" />
                <el-empty v-else description="暂无公告" />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 成员页面 -->
      <div v-else-if="activeTab === 'members'" class="tab-content">
        <team-members
          :team-id="teamId"
          :is-admin="canManageTeam"
        />
      </div>

      <!-- 项目页面 -->
      <div v-else-if="activeTab === 'projects'" class="tab-content">
        <team-projects
          :team-id="teamId"
          :can-manage="canManageTeam"
        />
      </div>

      <!-- 资源页面 -->
      <div v-else-if="activeTab === 'resources'" class="tab-content">
        <team-resources
          :team-id="teamId"
          :can-manage="canManageTeam"
        />
      </div>

      <!-- 分析页面 -->
      <div v-else-if="activeTab === 'analytics'" class="tab-content">
        <team-analytics
          :team-id="teamId"
          :can-view="canViewAnalytics"
        />
      </div>
    </div>

    <!-- 邀请成员对话框 -->
    <el-dialog
      v-model="showInviteDialog"
      title="邀请成员"
      width="500px"
    >
      <team-invite-form
        :team-id="teamId"
        @success="handleInviteSuccess"
        @cancel="showInviteDialog = false"
      />
    </el-dialog>

    <!-- 编辑公告对话框 -->
    <el-dialog
      v-model="showAnnouncementDialog"
      title="编辑团队公告"
      width="600px"
    >
      <el-form
        ref="announcementFormRef"
        :model="announcementForm"
        @submit.prevent="handleSaveAnnouncement"
      >
        <el-form-item>
          <el-input
            v-model="announcementForm.content"
            type="textarea"
            :rows="6"
            placeholder="输入团队公告..."
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit">保存</el-button>
          <el-button @click="showAnnouncementDialog = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  User,
  UserAdd,
  Setting,
  Calendar,
  Star,
  Grid,
  Folder,
  Files,
  TrendCharts,
} from '@element-plus/icons-vue';
import { useStore } from 'vuex';
import TeamMembers from '@/components/teams/TeamMembers.vue';
import TeamProjects from '@/components/teams/TeamProjects.vue';
import TeamResources from '@/components/teams/TeamResources.vue';
import TeamAnalytics from '@/components/teams/TeamAnalytics.vue';
import TeamInviteForm from '@/components/teams/TeamInviteForm.vue';
import { formatRelativeTime } from '@/utils/time';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default defineComponent({
  name: 'TeamDetailView',
  components: {
    TeamMembers,
    TeamProjects,
    TeamResources,
    TeamAnalytics,
    TeamInviteForm,
    User,
    UserAdd,
    Setting,
    Calendar,
    Star,
    Grid,
    Folder,
    Files,
    TrendCharts,
  },
  setup() {
    const store = useStore();
    const route = useRoute();
    const router = useRouter();

    const teamId = parseInt(route.params.id as string);
    const activeTab = ref(route.query.tab as string || 'overview');
    const showInviteDialog = ref(false);
    const showAnnouncementDialog = ref(false);
    const completedTodos = ref<number[]>([]);

    // 表单
    const announcementForm = ref({
      content: '',
    });

    // 计算属性
    const team = computed(() => store.state.teams.currentTeam);
    const canManageTeam = computed(() => {
      return ['owner', 'admin'].includes(team.value?.userRole);
    });
    const canInviteMembers = computed(() => {
      return ['owner', 'admin', 'moderator'].includes(team.value?.userRole);
    });
    const canViewAnalytics = computed(() => {
      return ['owner', 'admin', 'moderator'].includes(team.value?.userRole);
    });

    // 模拟数据
    const activities = ref([
      // ... 活动数据
    ]);
    const activeProjects = ref([
      // ... 项目数据
    ]);
    const teamStats = ref({
      activeMembers: 0,
      projectCompletionRate: 0,
      weeklyActivities: 0,
      resourceUsage: 0,
    });
    const todos = ref([
      // ... 待办事项数据
    ]);

    // 方法
    const loadTeamData = async () => {
      try {
        await store.dispatch('teams/fetchTeamDetails', teamId);
        // 加载其他相关数据
        await Promise.all([
          loadTeamActivities(),
          loadTeamProjects(),
          loadTeamStats(),
          loadTeamTodos(),
        ]);
      } catch (error) {
        ElMessage.error('加载团队信息失败');
        router.push('/teams');
      }
    };

    const loadTeamActivities = async () => {
      // 实现加载团队活动的逻辑
    };

    const loadTeamProjects = async () => {
      // 实现加载团队项目的逻辑
    };

    const loadTeamStats = async () => {
      // 实现加载团队统计的逻辑
    };

    const loadTeamTodos = async () => {
      // 实现加载待办事项的逻辑
    };

    const handleTabChange = (tab: string) => {
      activeTab.value = tab;
      router.replace({
        query: { ...route.query, tab },
      });
    };

    const handleTeamSettings = () => {
      router.push(`/teams/${teamId}/settings`);
    };

    const handleInviteSuccess = () => {
      showInviteDialog.value = false;
      loadTeamData();
    };

    const handleEditAnnouncement = () => {
      announcementForm.value.content = team.value?.announcement || '';
      showAnnouncementDialog.value = true;
    };

    const handleSaveAnnouncement = async () => {
      try {
        await store.dispatch('teams/updateTeamAnnouncement', {
          teamId,
          announcement: announcementForm.value.content,
        });
        showAnnouncementDialog.value = false;
        ElMessage.success('公告已更新');
      } catch (error) {
        ElMessage.error('更新公告失败');
      }
    };

    // 工具方法
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString();
    };

    const getVisibilityTagType = (visibility: string) => {
      const types: Record<string, string> = {
        public: 'success',
        private: 'warning',
        invite_only: 'info',
      };
      return types[visibility] || 'info';
    };

    const getVisibilityName = (visibility: string) => {
      const names: Record<string, string> = {
        public: '公开',
        private: '私有',
        invite_only: '仅邀请',
      };
      return names[visibility] || visibility;
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

    const getProgressStatus = (progress: number) => {
      if (progress >= 100) return 'success';
      if (progress >= 80) return 'warning';
      return '';
    };

    const formatAnnouncement = (content: string) => {
      return DOMPurify.sanitize(marked(content));
    };

    // 生命周期
    onMounted(() => {
      loadTeamData();
    });

    return {
      teamId,
      team,
      activeTab,
      activities,
      activeProjects,
      teamStats,
      todos,
      completedTodos,
      showInviteDialog,
      showAnnouncementDialog,
      announcementForm,
      canManageTeam,
      canInviteMembers,
      canViewAnalytics,
      handleTabChange,
      handleTeamSettings,
      handleInviteSuccess,
      handleEditAnnouncement,
      handleSaveAnnouncement,
      formatDate,
      formatRelativeTime,
      getVisibilityTagType,
      getVisibilityName,
      getRoleName,
      getProgressStatus,
      formatAnnouncement,
    };
  },
});
</script>

<style scoped>
.team-detail {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.team-header {
  background-color: white;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.team-basic-info {
  display: flex;
  gap: 24px;
}

.team-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.team-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.team-description {
  margin: 0;
  color: #666;
  max-width: 600px;
}

.team-meta {
  display: flex;
  gap: 24px;
  color: #666;
  font-size: 14px;
}

.team-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.team-nav {
  background-color: white;
  border-bottom: 1px solid #e6e6e6;
}

.team-content {
  padding: 24px;
}

.content-card {
  margin-bottom: 20px;
}

.content-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 12px;
}

.activity-content {
  flex: 1;
}

.activity-header {
  margin-bottom: 4px;
}

.username {
  font-weight: 500;
}

.action {
  color: #666;
}

.time {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}

.activity-description {
  margin: 0;
  color: #666;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.project-info {
  flex: 1;
}

.project-info h4 {
  margin: 0 0 8px;
}

.project-meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #666;
  display: flex;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.stat-item h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 24px;
  font-weight: 500;
}

.stat-value small {
  font-size: 14px;
  color: #666;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.todo-due {
  font-size: 12px;
  color: #666;
}

.announcement-content {
  min-height: 100px;
}
</style>