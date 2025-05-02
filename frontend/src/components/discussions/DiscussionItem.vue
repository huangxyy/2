<template>
  <div
    :class="[
      'discussion-item',
      viewMode,
      { 'is-pinned': discussion.isPinned }
    ]"
    @click="$emit('click', discussion)"
  >
    <!-- 简洁视图 -->
    <template v-if="viewMode === 'compact'">
      <div class="discussion-main">
        <div class="title-row">
          <div class="discussion-title">
            <el-tag
              v-if="discussion.isPinned"
              type="danger"
              size="small"
              class="pin-tag"
            >
              置顶
            </el-tag>
            {{ discussion.title }}
          </div>
          <div class="discussion-meta">
            <span class="author">
              {{ discussion.author.username }}
            </span>
            <span class="time">
              {{ formatTime(discussion.lastReplyAt || discussion.createdAt) }}
            </span>
          </div>
        </div>
      </div>
      <div class="discussion-stats">
        <div class="stat-item">
          <el-icon><View /></el-icon>
          {{ discussion.views }}
        </div>
        <div class="stat-item">
          <el-icon><ChatRound /></el-icon>
          {{ discussion.repliesCount }}
        </div>
      </div>
    </template>

    <!-- 详细视图 -->
    <template v-else>
      <div class="author-avatar">
        <el-avatar
          :src="discussion.author.avatar"
          :size="40"
        >
          {{ discussion.author.username.charAt(0) }}
        </el-avatar>
      </div>

      <div class="discussion-content">
        <div class="discussion-header">
          <div class="title-area">
            <h3 class="discussion-title">
              <el-tag
                v-if="discussion.isPinned"
                type="danger"
                size="small"
                class="pin-tag"
              >
                置顶
              </el-tag>
              {{ discussion.title }}
            </h3>
            <div class="discussion-tags">
              <el-tag
                v-if="!selectedCategory && discussion.category"
                :style="getCategoryStyle(discussion.category)"
                size="small"
              >
                {{ discussion.category.name }}
              </el-tag>
              <el-tag
                v-for="tag in discussion.tags"
                :key="tag"
                size="small"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          <div class="status-tags">
            <el-tag
              v-if="discussion.status !== 'open'"
              :type="getStatusType(discussion.status)"
              size="small"
            >
              {{ getStatusName(discussion.status) }}
            </el-tag>
            <el-tag
              v-if="discussion.solutionId"
              type="success"
              size="small"
            >
              已解决
            </el-tag>
          </div>
        </div>

        <div class="discussion-preview" v-html="getPreview(discussion.content)" />

        <div class="discussion-footer">
          <div class="discussion-meta">
            <span class="author">{{ discussion.author.username }}</span>
            <span class="divider">·</span>
            <span class="time">
              {{ formatTime(discussion.createdAt) }} 发布
            </span>
            <span v-if="discussion.lastReplyAt" class="last-reply">
              <span class="divider">·</span>
              {{ formatTime(discussion.lastReplyAt) }} 最后回复
            </span>
          </div>
          <div class="discussion-stats">
            <div class="stat-item">
              <el-icon><View /></el-icon>
              {{ discussion.views }}
            </div>
            <div class="stat-item">
              <el-icon><ChatRound /></el-icon>
              {{ discussion.repliesCount }}
            </div>
            <div class="stat-item">
              <el-icon><Star /></el-icon>
              {{ discussion.likesCount }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="discussion.lastReplyUser" class="last-replier">
        <el-tooltip
          :content="`最后回复者: ${discussion.lastReplyUser.username}`"
          placement="top"
        >
          <el-avatar
            :src="discussion.lastReplyUser.avatar"
            :size="32"
          >
            {{ discussion.lastReplyUser.username.charAt(0) }}
          </el-avatar>
        </el-tooltip>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { View, ChatRound, Star } from '@element-plus/icons-vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface Discussion {
  id: number;
  title: string;
  content: string;
  status: string;
  views: number;
  repliesCount: number;
  likesCount: number;
  isPinned: boolean;
  solutionId?: number;
  createdAt: string;
  lastReplyAt?: string;
  author: {
    username: string;
    avatar: string;
  };
  lastReplyUser?: {
    username: string;
    avatar: string;
  };
  category?: {
    id: number;
    name: string;
    color?: string;
  };
  tags: string[];
}

export default defineComponent({
  name: 'DiscussionItem',
  components: {
    View,
    ChatRound,
    Star,
  },
  props: {
    discussion: {
      type: Object as PropType<Discussion>,
      required: true,
    },
    viewMode: {
      type: String as PropType<'compact' | 'detailed'>,
      default: 'detailed',
    },
    selectedCategory: {
      type: Object as PropType<{ id: number; name: string }>,
      default: null,
    },
  },
  emits: ['click'],
  setup() {
    const formatTime = (dateString: string) => {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN,
      });
    };

    const getStatusType = (status: string) => {
      const types: Record<string, string> = {
        closed: 'info',
        locked: 'warning',
      };
      return types[status] || 'primary';
    };

    const getStatusName = (status: string) => {
      const names: Record<string, string> = {
        open: '进行中',
        closed: '已关闭',
        locked: '已锁定',
      };
      return names[status] || status;
    };

    const getCategoryStyle = (category: { color?: string }) => {
      if (!category?.color) return {};
      return {
        backgroundColor: `${category.color}20`,
        color: category.color,
        borderColor: `${category.color}40`,
      };
    };

    const getPreview = (content: string) => {
      const plainText = content.replace(/[#*`]/g, '');
      const preview = plainText.slice(0, 200) + (plainText.length > 200 ? '...' : '');
      return DOMPurify.sanitize(marked(preview));
    };

    return {
      formatTime,
      getStatusType,
      getStatusName,
      getCategoryStyle,
      getPreview,
    };
  },
});
</script>

<style scoped>
.discussion-item {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.discussion-item:hover {
  background-color: #fafafa;
}

.discussion-item.is-pinned {
  background-color: #fff9f9;
}

/* 简洁视图样式 */
.compact {
  padding: 12px 16px;
  align-items: center;
}

.compact .discussion-main {
  flex: 1;
  min-width: 0;
}

.compact .title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.compact .discussion-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact .discussion-meta {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

/* 详细视图样式 */
.detailed {
  gap: 16px;
}

.discussion-content {
  flex: 1;
  min-width: 0;
}

.discussion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.title-area {
  flex: 1;
  min-width: 0;
}

.discussion-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}

.pin-tag {
  margin-right: 8px;
  vertical-align: top;
}

.discussion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  text-transform: lowercase;
}

.status-tags {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.discussion-preview {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.discussion-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.discussion-meta {
  font-size: 13px;
  color: #909399;
}

.author {
  color: #606266;
  font-weight: 500;
}

.divider {
  margin: 0 8px;
  color: #dcdfe6;
}

.discussion-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 13px;
}

.last-reply {
  color: #909399;
}

.last-replier {
  display: flex;
  align-items: center;
}
</style>