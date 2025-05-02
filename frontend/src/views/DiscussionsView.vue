<template>
  <div class="discussions-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>讨论区</h1>
        <div class="header-actions">
          <el-button
            v-if="canCreateDiscussion"
            type="primary"
            @click="handleCreate"
          >
            <el-icon><Plus /></el-icon>
            发起讨论
          </el-button>
        </div>
      </div>

      <!-- 分类标签导航 -->
      <div class="category-nav">
        <el-scrollbar>
          <div class="category-tabs">
            <div
              class="category-tab"
              :class="{ active: !selectedCategory }"
              @click="handleCategorySelect(null)"
            >
              全部
            </div>
            <div
              v-for="category in categories"
              :key="category.id"
              class="category-tab"
              :class="{ active: selectedCategory?.id === category.id }"
              :style="getCategoryStyle(category)"
              @click="handleCategorySelect(category)"
            >
              <el-icon v-if="category.icon" :size="16">
                <component :is="category.icon" />
              </el-icon>
              {{ category.name }}
              <span class="category-count">{{ category.count }}</span>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 筛选工具栏 -->
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="searchQuery"
            placeholder="搜索讨论..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filters.status"
            placeholder="状态"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="未解决" value="open" />
            <el-option label="已解决" value="closed" />
            <el-option label="已锁定" value="locked" />
          </el-select>

          <el-select
            v-model="filters.sort"
            placeholder="排序"
          >
            <el-option label="最近更新" value="latest" />
            <el-option label="最多浏览" value="popular" />
            <el-option label="未解决优先" value="unanswered" />
          </el-select>

          <el-select
            v-if="tags.length"
            v-model="filters.tag"
            placeholder="标签"
            clearable
          >
            <el-option
              v-for="tag in tags"
              :key="tag.name"
              :label="`${tag.name} (${tag.count})`"
              :value="tag.name"
            />
          </el-select>
        </div>

        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="compact">简洁</el-radio-button>
          <el-radio-button value="detailed">详细</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 讨论列表 -->
      <div
        v-loading="loading"
        :class="['discussions-list', `view-${viewMode}`]"
      >
        <!-- 置顶讨论 -->
        <div v-if="pinnedDiscussions.length" class="pinned-discussions">
          <div class="section-title">
            <el-icon><Top /></el-icon>
            置顶讨论
          </div>
          <discussion-item
            v-for="discussion in pinnedDiscussions"
            :key="discussion.id"
            :discussion="discussion"
            :view-mode="viewMode"
            :selected-category="selectedCategory"
            @click="handleDiscussionClick"
          />
        </div>

        <!-- 普通讨论列表 -->
        <div class="regular-discussions">
          <discussion-item
            v-for="discussion in discussions"
            :key="discussion.id"
            :discussion="discussion"
            :view-mode="viewMode"
            :selected-category="selectedCategory"
            @click="handleDiscussionClick"
          />
        </div>

        <!-- 空状态 -->
        <el-empty
          v-if="!loading && !discussions.length"
          :description="getEmptyDescription()"
        >
          <template #default>
            <el-button
              v-if="canCreateDiscussion"
              type="primary"
              @click="handleCreate"
            >
              发起第一个讨论
            </el-button>
          </template>
        </el-empty>

        <!-- 分页 -->
        <div v-if="total > pageSize" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 侧边栏 -->
    <div class="sidebar">
      <!-- 分类详情卡片 -->
      <el-card v-if="selectedCategory" class="category-card">
        <template #header>
          <div class="category-header">
            <h3>{{ selectedCategory.name }}</h3>
            <el-button
              v-if="canManageCategory"
              text
              @click="handleEditCategory"
            >
              <el-icon><Setting /></el-icon>
            </el-button>
          </div>
        </template>
        <div class="category-info">
          <p>{{ selectedCategory.description }}</p>
          <div class="category-stats">
            <div class="stat-item">
              <span class="label">讨论数</span>
              <span class="value">{{ selectedCategory.count }}</span>
            </div>
            <div class="stat-item">
              <span class="label">今日新增</span>
              <span class="value">{{ selectedCategory.todayCount }}</span>
            </div>
          </div>
          <div v-if="selectedCategory.moderatorRoles.length" class="category-mods">
            <div class="label">版主:</div>
            <el-avatar-group :size="32" :max="3">
              <el-avatar
                v-for="mod in categoryModerators"
                :key="mod.id"
                :src="mod.avatar"
                :title="mod.username"
              />
            </el-avatar-group>
          </div>
        </div>
      </el-card>

      <!-- 热门标签 -->
      <el-card class="tags-card">
        <template #header>
          <div class="card-header">
            <h3>热门标签</h3>
          </div>
        </template>
        <div class="tags-cloud">
          <el-tag
            v-for="tag in popularTags"
            :key="tag.name"
            :type="getTagType(tag)"
            :effect="filters.tag === tag.name ? 'dark' : 'light'"
            class="tag-item"
            @click="handleTagSelect(tag)"
          >
            {{ tag.name }}
            <span class="tag-count">{{ tag.count }}</span>
          </el-tag>
        </div>
      </el-card>

      <!-- 活跃用户 -->
      <el-card class="users-card">
        <template #header>
          <div class="card-header">
            <h3>活跃用户</h3>
          </div>
        </template>
        <div class="active-users">
          <div
            v-for="user in activeUsers"
            :key="user.id"
            class="user-item"
          >
            <el-avatar :src="user.avatar" :size="40">
              {{ user.username.charAt(0) }}
            </el-avatar>
            <div class="user-info">
              <div class="username">{{ user.username }}</div>
              <div class="contribution">
                {{ user.discussionCount }} 讨论 · {{ user.replyCount }} 回复
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { Plus, Search, Top, Setting } from '@element-plus/icons-vue';
import { debounce } from 'lodash-es';
import DiscussionItem from '@/components/discussions/DiscussionItem.vue';

export default defineComponent({
  name: 'DiscussionsView',
  components: {
    DiscussionItem,
    Plus,
    Search,
    Top,
    Setting,
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    // 状态
    const loading = ref(false);
    const searchQuery = ref('');
    const viewMode = ref('detailed');
    const selectedCategory = ref(null);
    const currentPage = ref(1);
    const pageSize = ref(20);
    const filters = ref({
      status: '',
      sort: 'latest',
      tag: '',
    });

    // 计算属性
    const categories = computed(() => store.state.discussions.categories);
    const discussions = computed(() => store.state.discussions.list);
    const pinnedDiscussions = computed(() => 
      discussions.value.filter(d => d.isPinned)
    );
    const tags = computed(() => store.state.discussions.tags);
    const popularTags = computed(() => 
      [...tags.value].sort((a, b) => b.count - a.count).slice(0, 20)
    );
    const total = computed(() => store.state.discussions.total);
    const activeUsers = computed(() => store.state.discussions.activeUsers);
    const categoryModerators = computed(() => {
      if (!selectedCategory.value) return [];
      return store.state.users.list.filter(user => 
        selectedCategory.value.moderatorRoles.includes(user.role)
      );
    });

    const canCreateDiscussion = computed(() => {
      if (!selectedCategory.value) return true;
      return !selectedCategory.value.isPublic ? 
        store.getters['auth/hasPermission']('create_discussion') : 
        true;
    });

    const canManageCategory = computed(() => 
      store.getters['auth/hasPermission']('manage_categories')
    );

    // 方法
    const loadDiscussions = async () => {
      loading.value = true;
      try {
        await store.dispatch('discussions/fetchDiscussions', {
          categoryId: selectedCategory.value?.id,
          page: currentPage.value,
          pageSize: pageSize.value,
          ...filters.value,
          search: searchQuery.value,
        });
      } catch (error) {
        console.error('Failed to load discussions:', error);
      } finally {
        loading.value = false;
      }
    };

    const handleSearch = debounce(() => {
      currentPage.value = 1;
      loadDiscussions();
    }, 300);

    const handleCategorySelect = (category: any) => {
      selectedCategory.value = category;
      currentPage.value = 1;
      loadDiscussions();
    };

    const handleTagSelect = (tag: any) => {
      filters.value.tag = filters.value.tag === tag.name ? '' : tag.name;
      currentPage.value = 1;
      loadDiscussions();
    };

    const handleCreate = () => {
      router.push({
        name: 'CreateDiscussion',
        query: {
          category: selectedCategory.value?.id,
        },
      });
    };

    const handleDiscussionClick = (discussion: any) => {
      router.push({
        name: 'DiscussionDetail',
        params: { id: discussion.id },
      });
    };

    const handleEditCategory = () => {
      router.push({
        name: 'EditCategory',
        params: { id: selectedCategory.value.id },
      });
    };

    const handleSizeChange = (size: number) => {
      pageSize.value = size;
      loadDiscussions();
    };

    const handleCurrentChange = (page: number) => {
      currentPage.value = page;
      loadDiscussions();
    };

    // 工具方法
    const getCategoryStyle = (category: any) => {
      if (!category.color) return {};
      return {
        '--category-color': category.color,
      };
    };

    const getTagType = (tag: any) => {
      const types = ['', 'success', 'warning', 'danger', 'info'];
      return types[tag.name.length % types.length];
    };

    const getEmptyDescription = () => {
      if (searchQuery.value) {
        return '没有找到相关讨论';
      }
      if (selectedCategory.value) {
        return `${selectedCategory.value.name}分类下暂无讨论`;
      }
      return '暂无讨论';
    };

    // 监听筛选条件变化
    watch(filters, () => {
      currentPage.value = 1;
      loadDiscussions();
    }, { deep: true });

    // 初始化
    onMounted(() => {
      loadDiscussions();
      store.dispatch('discussions/fetchCategories');
      store.dispatch('discussions/fetchTags');
      store.dispatch('discussions/fetchActiveUsers');
    });

    return {
      loading,
      searchQuery,
      viewMode,
      selectedCategory,
      currentPage,
      pageSize,
      filters,
      categories,
      discussions,
      pinnedDiscussions,
      tags,
      popularTags,
      total,
      activeUsers,
      categoryModerators,
      canCreateDiscussion,
      canManageCategory,
      handleSearch,
      handleCategorySelect,
      handleTagSelect,
      handleCreate,
      handleDiscussionClick,
      handleEditCategory,
      handleSizeChange,
      handleCurrentChange,
      getCategoryStyle,
      getTagType,
      getEmptyDescription,
    };
  },
});
</script>

<style scoped>
.discussions-view {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  padding: 20px;
  min-height: calc(100vh - 64px);
}

.page-header {
  grid-column: 1 / -1;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-content h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.category-nav {
  margin-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 0 0 12px;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.category-tab:hover {
  background-color: #f5f7fa;
}

.category-tab.active {
  background-color: var(--category-color, #e6f7ff);
  color: var(--el-color-primary);
}

.category-count {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 12px;
}

.discussions-list {
  background-color: white;
  border-radius: 4px;
  min-height: 400px;
}

.pinned-discussions {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: #606266;
  background-color: #f5f7fa;
}

.view-compact .discussion-item {
  padding: 12px 16px;
}

.view-detailed .discussion-item {
  padding: 16px 20px;
}

.pagination {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-card,
.tags-card,
.users-card {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.category-info p {
  margin: 0 0 16px;
  color: #606266;
}

.category-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.stat-item .label {
  font-size: 12px;
  color: #909399;
}

.stat-item .value {
  display: block;
  font-size: 20px;
  font-weight: 500;
  color: var(--el-color-primary);
}

.category-mods {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-mods .label {
  font-size: 12px;
  color: #909399;
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
}

.tag-count {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.8;
}

.active-users {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.username {
  font-weight: 500;
  margin-bottom: 4px;
}

.contribution {
  font-size: 12px;
  color: #909399;
}
</style>