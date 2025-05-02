<template>
  <div
    :class="[
      'discussion-reply',
      { 'is-solution': isSolution }
    ]"
  >
    <!-- 回复主体 -->
    <div class="reply-main">
      <!-- 作者头像 -->
      <div class="author-avatar">
        <el-avatar
          :src="reply.author.avatar"
          :size="40"
        >
          {{ reply.author.username.charAt(0) }}
        </el-avatar>
      </div>

      <!-- 回复内容 -->
      <div class="reply-content">
        <!-- 回复头部 -->
        <div class="reply-header">
          <div class="author-info">
            <span class="author-name">
              {{ reply.author.username }}
            </span>
            <el-tag
              v-if="reply.author.id === discussionAuthorId"
              size="small"
              type="info"
            >
              作者
            </el-tag>
            <span class="post-time">
              {{ formatTime(reply.createdAt) }}
              <template v-if="reply.isEdited">
                (已编辑)
              </template>
            </span>
          </div>

          <!-- 最佳答案标记 -->
          <div v-if="isSolution" class="solution-badge">
            <el-tag type="success">
              <el-icon><Check /></el-icon>
              最佳答案
            </el-tag>
          </div>
        </div>

        <!-- Markdown 内容 -->
        <div class="reply-body markdown-body" v-html="renderedContent" />

        <!-- 回复操作 -->
        <div class="reply-actions">
          <div class="action-buttons">
            <el-button
              :type="reply.isLiked ? 'primary' : 'default'"
              text
              @click="handleLike"
            >
              <el-icon>
                <component :is="reply.isLiked ? 'ThumbUp' : 'ThumbUpFilled'" />
              </el-icon>
              {{ reply.isLiked ? '已赞' : '点赞' }}
              <template v-if="reply.likes > 0">
                ({{ reply.likes }})
              </template>
            </el-button>

            <el-button
              text
              @click="$emit('reply', reply)"
            >
              <el-icon><ChatDotRound /></el-icon>
              回复
            </el-button>

            <template v-if="canManageReply">
              <el-button
                text
                @click="$emit('edit', reply)"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>

              <el-button
                text
                type="danger"
                @click="$emit('delete', reply)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>

            <el-button
              v-if="canMarkSolution && !isSolution"
              text
              type="success"
              @click="$emit('mark-solution', reply)"
            >
              <el-icon><Check /></el-icon>
              标记为最佳答案
            </el-button>
          </div>

          <div v-if="reply.parentId" class="reply-reference">
            回复了
            <el-link type="primary" @click="scrollToParent(reply.parentId)">
              @{{ getParentAuthor(reply.parentId) }}
            </el-link>
            的发言
          </div>
        </div>
      </div>
    </div>

    <!-- 嵌套回复 -->
    <div v-if="reply.children?.length" class="nested-replies">
      <discussion-reply
        v-for="childReply in reply.children"
        :key="childReply.id"
        :reply="childReply"
        :discussion-author-id="discussionAuthorId"
        :can-mark-solution="canMarkSolution"
        :is-solution="false"
        @like="$emit('like', childReply)"
        @mark-solution="$emit('mark-solution', childReply)"
        @edit="$emit('edit', childReply)"
        @delete="$emit('delete', childReply)"
        @reply="$emit('reply', childReply)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  ThumbUp,
  ThumbUpFilled,
  ChatDotRound,
  Edit,
  Delete,
  Check,
} from '@element-plus/icons-vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useStore } from 'vuex';

interface Reply {
  id: number;
  content: string;
  author: {
    id: number;
    username: string;
    avatar: string;
  };
  createdAt: string;
  isEdited: boolean;
  likes: number;
  isLiked: boolean;
  parentId?: number;
  children?: Reply[];
}

export default defineComponent({
  name: 'DiscussionReply',
  components: {
    ThumbUp,
    ThumbUpFilled,
    ChatDotRound,
    Edit,
    Delete,
    Check,
  },
  props: {
    reply: {
      type: Object as PropType<Reply>,
      required: true,
    },
    discussionAuthorId: {
      type: Number,
      required: true,
    },
    canMarkSolution: {
      type: Boolean,
      default: false,
    },
    isSolution: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['like', 'mark-solution', 'edit', 'delete', 'reply'],
  setup(props) {
    const store = useStore();

    // 计算属性
    const renderedContent = computed(() => {
      return DOMPurify.sanitize(marked(props.reply.content));
    });

    const canManageReply = computed(() => {
      return (
        props.reply.author.id === store.state.user.id ||
        store.getters['auth/hasPermission']('manage_replies')
      );
    });

    // 方法
    const formatTime = (date: string) => {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: zhCN,
      });
    };

    const handleLike = async () => {
      try {
        await store.dispatch('discussions/toggleReplyLike', props.reply.id);
        props.reply.isLiked = !props.reply.isLiked;
        props.reply.likes += props.reply.isLiked ? 1 : -1;
      } catch (error) {
        ElMessage.error('操作失败');
      }
    };

    const getParentAuthor = (parentId: number) => {
      // 在实际应用中，你需要通过parentId找到父回复的作者
      // 这里简化处理，假设已经有了父回复的信息
      const parent = store.getters['discussions/getReplyById'](parentId);
      return parent?.author.username || '未知用户';
    };

    const scrollToParent = (parentId: number) => {
      const parentElement = document.querySelector(
        `[data-reply-id="${parentId}"]`
      );
      if (parentElement) {
        parentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    };

    return {
      renderedContent,
      canManageReply,
      formatTime,
      handleLike,
      getParentAuthor,
      scrollToParent,
    };
  },
});
</script>

<style scoped>
.discussion-reply {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.discussion-reply.is-solution {
  border-color: var(--el-color-success-light);
  background-color: var(--el-color-success-lighter);
}

.reply-main {
  display: flex;
  gap: 16px;
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-weight: 500;
}

.post-time {
  color: #909399;
  font-size: 12px;
}

.reply-body {
  margin-bottom: 16px;
}

.reply-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

.nested-replies {
  margin-top: 16px;
  margin-left: 56px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reply-reference {
  font-size: 12px;
  color: #909399;
}

/* Markdown 样式继承自父组件 */
:deep(.markdown-body) {
  font-size: 14px;
}
</style>