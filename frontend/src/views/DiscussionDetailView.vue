<template>
  <div class="discussion-detail">
    <!-- 顶部导航 -->
    <div class="page-nav">
      <el-breadcrumb>
        <el-breadcrumb-item :to="{ name: 'Discussions' }">
          讨论区
        </el-breadcrumb-item>
        <el-breadcrumb-item
          v-if="discussion?.category"
          :to="{ 
            name: 'Discussions',
            query: { category: discussion.category.id }
          }"
        >
          {{ discussion.category.name }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>
          {{ discussion?.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>

      <div class="nav-actions">
        <template v-if="discussion">
          <el-button
            v-if="canManageDiscussion"
            :type="discussion.isPinned ? 'warning' : 'default'"
            @click="handleTogglePin"
          >
            <el-icon><Top /></el-icon>
            {{ discussion.isPinned ? '取消置顶' : '置顶' }}
          </el-button>

          <el-dropdown
            v-if="canManageDiscussion"
            trigger="click"
            @command="handleMoreAction"
          >
            <el-button>
              <el-icon><More /></el-icon>
              更多操作
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <el-icon><Edit /></el-icon>
                  编辑讨论
                </el-dropdown-item>
                <el-dropdown-item command="lock">
                  <el-icon><Lock /></el-icon>
                  {{ discussion.status === 'locked' ? '解锁讨论' : '锁定讨论' }}
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="discussion.status === 'open'"
                  command="close"
                >
                  <el-icon><CloseBold /></el-icon>
                  关闭讨论
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="discussion.status === 'closed'"
                  command="reopen"
                >
                  <el-icon><Open /></el-icon>
                  重新开启
                </el-dropdown-item>
                <el-dropdown-item
                  divided
                  command="delete"
                  class="danger"
                >
                  <el-icon><Delete /></el-icon>
                  删除讨论
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content" v-loading="loading">
      <!-- 讨论主体 -->
      <div v-if="discussion" class="discussion-container">
        <div class="discussion-header">
          <h1 class="discussion-title">
            {{ discussion.title }}
            <div class="title-tags">
              <el-tag
                v-if="discussion.status !== 'open'"
                :type="getStatusType(discussion.status)"
              >
                {{ getStatusName(discussion.status) }}
              </el-tag>
              <el-tag
                v-if="discussion.isPinned"
                type="danger"
              >
                置顶
              </el-tag>
            </div>
          </h1>

          <div class="discussion-meta">
            <div class="author-info">
              <el-avatar
                :src="discussion.author.avatar"
                :size="40"
              >
                {{ discussion.author.username.charAt(0) }}
              </el-avatar>
              <div class="author-meta">
                <div class="author-name">
                  {{ discussion.author.username }}
                  <el-tag size="small" type="info">作者</el-tag>
                </div>
                <div class="post-time">
                  发布于 {{ formatDate(discussion.createdAt) }}
                </div>
              </div>
            </div>

            <div class="discussion-stats">
              <div class="stat-item">
                <el-icon><View /></el-icon>
                {{ discussion.views }} 浏览
              </div>
              <div class="stat-item">
                <el-icon><ChatRound /></el-icon>
                {{ discussion.repliesCount }} 回复
              </div>
              <div class="stat-item">
                <el-icon><Star /></el-icon>
                {{ discussion.likesCount }} 收藏
              </div>
            </div>
          </div>
        </div>

        <div class="discussion-content">
          <div class="content-wrapper markdown-body" v-html="renderedContent" />
          
          <div class="content-footer">
            <div class="tags">
              <el-tag
                v-for="tag in discussion.tags"
                :key="tag"
                size="small"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
            </div>

            <div class="actions">
              <el-button
                :type="isLiked ? 'primary' : 'default'"
                :icon="isLiked ? 'ThumbUp' : 'ThumbUpFilled'"
                @click="handleLike"
              >
                {{ isLiked ? '已赞' : '点赞' }}
                <template v-if="discussion.likesCount > 0">
                  ({{ discussion.likesCount }})
                </template>
              </el-button>

              <el-button
                :type="isCollected ? 'primary' : 'default'"
                :icon="isCollected ? 'Star' : 'StarFilled'"
                @click="handleCollect"
              >
                {{ isCollected ? '已收藏' : '收藏' }}
              </el-button>

              <el-button
                icon="Share"
                @click="handleShare"
              >
                分享
              </el-button>
            </div>
          </div>
        </div>

        <!-- 回复列表 -->
        <div class="replies-section">
          <div class="section-header">
            <h2>{{ discussion.repliesCount }} 条回复</h2>
            <div class="sort-options">
              <el-radio-group v-model="replySort" size="small">
                <el-radio-button label="oldest">最早</el-radio-button>
                <el-radio-button label="newest">最新</el-radio-button>
                <el-radio-button label="popular">最热</el-radio-button>
              </el-radio-group>
            </div>
          </div>

          <div class="replies-list">
            <discussion-reply
              v-for="reply in sortedReplies"
              :key="reply.id"
              :reply="reply"
              :discussion-author-id="discussion.author.id"
              :can-mark-solution="canMarkSolution"
              :is-solution="discussion.solutionId === reply.id"
              @like="handleReplyLike"
              @mark-solution="handleMarkSolution"
              @edit="handleEditReply"
              @delete="handleDeleteReply"
              @reply="handleReplyTo"
            />
          </div>

          <div v-if="hasMoreReplies" class="load-more">
            <el-button
              :loading="loadingMore"
              @click="loadMoreReplies"
            >
              加载更多回复
            </el-button>
          </div>
        </div>

        <!-- 回复编辑器 -->
        <div
          v-if="discussion.status === 'open'"
          class="reply-editor"
        >
          <h3>
            {{ replyTo ? `回复 @${replyTo.author.username}` : '添加回复' }}
          </h3>
          <markdown-editor
            v-model="replyContent"
            :min-height="200"
            placeholder="写下你的回复..."
          />
          <div class="editor-actions">
            <el-button
              v-if="replyTo"
              @click="cancelReplyTo"
            >
              取消回复
            </el-button>
            <el-button
              type="primary"
              :loading="submitting"
              :disabled="!replyContent.trim()"
              @click="submitReply"
            >
              提交回复
            </el-button>
          </div>
        </div>

        <el-alert
          v-else
          :type="discussion.status === 'locked' ? 'warning' : 'info'"
          :title="discussion.status === 'locked' ? '该讨论已锁定' : '该讨论已关闭'"
          show-icon
          :closable="false"
        >
          {{ discussion.status === 'locked' ? '管理员已锁定此讨论，暂时无法回复' : '此讨论已结束，无法继续回复' }}
        </el-alert>
      </div>

      <!-- 相关讨论 -->
      <div class="related-discussions">
        <h3>相关讨论</h3>
        <div class="related-list">
          <discussion-item
            v-for="item in relatedDiscussions"
            :key="item.id"
            :discussion="item"
            view-mode="compact"
            @click="handleRelatedClick"
          />
        </div>
      </div>
    </div>

    <!-- 侧边栏 -->
    <div class="sidebar">
      <!-- 讨论信息卡片 -->
      <el-card class="info-card" v-if="discussion">
        <template #header>
          <div class="card-header">
            <h3>讨论信息</h3>
          </div>
        </template>
        <div class="info-list">
          <div class="info-item">
            <span class="label">状态</span>
            <span class="value">
              <el-tag :type="getStatusType(discussion.status)">
                {{ getStatusName(discussion.status) }}
              </el-tag>
            </span>
          </div>
          <div class="info-item">
            <span class="label">创建时间</span>
            <span class="value">{{ formatDate(discussion.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="label">最后回复</span>
            <span class="value">
              {{ discussion.lastReplyAt ? formatDate(discussion.lastReplyAt) : '暂无回复' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">分类</span>
            <span class="value">
              <el-tag
                :style="getCategoryStyle(discussion.category)"
                size="small"
              >
                {{ discussion.category.name }}
              </el-tag>
            </span>
          </div>
        </div>
      </el-card>

      <!-- 活跃参与者 -->
      <el-card class="participants-card">
        <template #header>
          <div class="card-header">
            <h3>活跃参与者</h3>
          </div>
        </template>
        <div class="participants-list">
          <div
            v-for="participant in participants"
            :key="participant.id"
            class="participant-item"
          >
            <el-avatar
              :src="participant.avatar"
              :size="32"
            >
              {{ participant.username.charAt(0) }}
            </el-avatar>
            <div class="participant-info">
              <span class="name">{{ participant.username }}</span>
              <span class="replies">{{ participant.replyCount }} 条回复</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 编辑回复对话框 -->
    <el-dialog
      v-model="showEditDialog"
      :title="editingReply ? '编辑回复' : '编辑讨论'"
      width="800px"
    >
      <template v-if="editingReply">
        <markdown-editor
          v-model="editContent"
          :min-height="300"
        />
      </template>
      <template v-else>
        <el-form ref="editFormRef" :model="editForm" label-width="80px">
          <el-form-item label="标题" prop="title">
            <el-input v-model="editForm.title" />
          </el-form-item>
          <el-form-item label="内容" prop="content">
            <markdown-editor
              v-model="editForm.content"
              :min-height="300"
            />
          </el-form-item>
          <el-form-item label="标签">
            <el-select
              v-model="editForm.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="添加标签"
            >
              <el-option
                v-for="tag in availableTags"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitting"
            @click="handleEditSubmit"
          >
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分享对话框 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享讨论"
      width="400px"
    >
      <div class="share-options">
        <div class="share-link">
          <el-input
            v-model="shareUrl"
            readonly
          >
            <template #append>
              <el-button @click="copyShareUrl">
                复制
              </el-button>
            </template>
          </el-input>
        </div>
        <div class="social-share">
          <el-button
            v-for="platform in sharePlatforms"
            :key="platform.name"
            :type="platform.type"
            @click="shareToSocial(platform)"
          >
            <el-icon><component :is="platform.icon" /></el-icon>
            {{ platform.label }}
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  View,
  ChatRound,
  Star,
  Top,
  More,
  Edit,
  Lock,
  Delete,
  CloseBold,
  Open,
} from '@element-plus/icons-vue';
import { useStore } from 'vuex';
import DiscussionReply from '@/components/discussions/DiscussionReply.vue';
import DiscussionItem from '@/components/discussions/DiscussionItem.vue';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default defineComponent({
  name: 'DiscussionDetailView',
  components: {
    DiscussionReply,
    DiscussionItem,
    MarkdownEditor,
    View,
    ChatRound,
    Star,
    Top,
    More,
    Edit,
    Lock,
    Delete,
    CloseBold,
    Open,
  },
  setup() {
    const store = useStore();
    const route = useRoute();
    const router = useRouter();

    // 状态
    const loading = ref(false);
    const discussion = ref<any>(null);
    const replySort = ref('oldest');
    const replyContent = ref('');
    const replyTo = ref<any>(null);
    const submitting = ref(false);
    const loadingMore = ref(false);
    const showEditDialog = ref(false);
    const showShareDialog = ref(false);
    const editingReply = ref<any>(null);
    const editContent = ref('');
    const editForm = ref({
      title: '',
      content: '',
      tags: [],
    });
    const shareUrl = ref('');
    const isLiked = ref(false);
    const isCollected = ref(false);

    // 计算属性
    const renderedContent = computed(() => {
      if (!discussion.value?.content) return '';
      return DOMPurify.sanitize(marked(discussion.value.content));
    });

    const sortedReplies = computed(() => {
      if (!discussion.value?.replies) return [];
      const replies = [...discussion.value.replies];
      switch (replySort.value) {
        case 'newest':
          return replies.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'popular':
          return replies.sort((a, b) => b.likes - a.likes);
        default:
          return replies.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
      }
    });

    const canManageDiscussion = computed(() => {
      if (!discussion.value) return false;
      return (
        discussion.value.author.id === store.state.user.id ||
        store.getters['auth/hasPermission']('manage_discussions')
      );
    });

    const canMarkSolution = computed(() => {
      if (!discussion.value) return false;
      return discussion.value.author.id === store.state.user.id;
    });

    const hasMoreReplies = computed(() => {
      if (!discussion.value) return false;
      return discussion.value.repliesCount > discussion.value.replies.length;
    });

    const participants = computed(() => {
      if (!discussion.value?.replies) return [];
      const participantMap = new Map();
      
      // 添加作者
      participantMap.set(discussion.value.author.id, {
        ...discussion.value.author,
        replyCount: 1, // 原帖算一条
      });

      // 统计回复
      discussion.value.replies.forEach((reply: any) => {
        const participant = participantMap.get(reply.author.id);
        if (participant) {
          participant.replyCount++;
        } else {
          participantMap.set(reply.author.id, {
            ...reply.author,
            replyCount: 1,
          });
        }
      });

      return Array.from(participantMap.values())
        .sort((a, b) => b.replyCount - a.replyCount)
        .slice(0, 10);
    });

    // 方法
    const loadDiscussion = async () => {
      const id = parseInt(route.params.id as string);
      loading.value = true;
      try {
        const response = await store.dispatch('discussions/fetchDiscussion', id);
        discussion.value = response;
        // 加载其他相关数据
        await Promise.all([
          loadRelatedDiscussions(),
          checkUserInteraction(),
        ]);
      } catch (error) {
        ElMessage.error('加载讨论失败');
        router.push('/discussions');
      } finally {
        loading.value = false;
      }
    };

    const loadRelatedDiscussions = async () => {
      // 实现加载相关讨论的逻辑
    };

    const checkUserInteraction = async () => {
      // 检查用户是否已点赞、收藏等
    };

    const handleTogglePin = async () => {
      try {
        await store.dispatch('discussions/togglePin', {
          id: discussion.value.id,
          isPinned: !discussion.value.isPinned,
        });
        discussion.value.isPinned = !discussion.value.isPinned;
        ElMessage.success(
          discussion.value.isPinned ? '已置顶讨论' : '已取消置顶'
        );
      } catch (error) {
        ElMessage.error('操作失败');
      }
    };

    const handleMoreAction = async (command: string) => {
      switch (command) {
        case 'edit':
          editForm.value = {
            title: discussion.value.title,
            content: discussion.value.content,
            tags: [...discussion.value.tags],
          };
          showEditDialog.value = true;
          break;
        case 'lock':
          await handleUpdateStatus('locked');
          break;
        case 'close':
          await handleUpdateStatus('closed');
          break;
        case 'reopen':
          await handleUpdateStatus('open');
          break;
        case 'delete':
          await handleDelete();
          break;
      }
    };

    const handleUpdateStatus = async (status: string) => {
      try {
        await store.dispatch('discussions/updateStatus', {
          id: discussion.value.id,
          status,
        });
        discussion.value.status = status;
        ElMessage.success('状态已更新');
      } catch (error) {
        ElMessage.error('更新失败');
      }
    };

    const handleDelete = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要删除这个讨论吗？此操作不可恢复。',
          '删除讨论',
          {
            type: 'warning',
            confirmButtonText: '删除',
            confirmButtonClass: 'el-button--danger',
          }
        );

        await store.dispatch('discussions/deleteDiscussion', discussion.value.id);
        ElMessage.success('讨论已删除');
        router.push('/discussions');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败');
        }
      }
    };

    const handleLike = async () => {
      try {
        await store.dispatch('discussions/toggleLike', discussion.value.id);
        isLiked.value = !isLiked.value;
        discussion.value.likesCount += isLiked.value ? 1 : -1;
      } catch (error) {
        ElMessage.error('操作失败');
      }
    };

    const handleCollect = async () => {
      try {
        await store.dispatch('discussions/toggleCollect', discussion.value.id);
        isCollected.value = !isCollected.value;
        ElMessage.success(
          isCollected.value ? '已加入收藏' : '已取消收藏'
        );
      } catch (error) {
        ElMessage.error('操作失败');
      }
    };

    const handleShare = () => {
      shareUrl.value = window.location.href;
      showShareDialog.value = true;
    };

    const copyShareUrl = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl.value);
        ElMessage.success('链接已复制');
      } catch (error) {
        ElMessage.error('复制失败');
      }
    };

    const shareToSocial = (platform: any) => {
      // 实现社交分享逻辑
    };

    const handleReplyTo = (reply: any) => {
      replyTo.value = reply;
      replyContent.value = `@${reply.author.username} `;
      // 滚动到编辑器
      document.querySelector('.reply-editor')?.scrollIntoView({
        behavior: 'smooth',
      });
    };

    const cancelReplyTo = () => {
      replyTo.value = null;
      replyContent.value = '';
    };

    const submitReply = async () => {
      if (!replyContent.value.trim()) return;

      submitting.value = true;
      try {
        const reply = await store.dispatch('discussions/addReply', {
          discussionId: discussion.value.id,
          content: replyContent.value,
          parentId: replyTo.value?.id,
        });

        discussion.value.replies.push(reply);
        discussion.value.repliesCount++;
        replyContent.value = '';
        replyTo.value = null;
        ElMessage.success('回复已发送');
      } catch (error) {
        ElMessage.error('发送失败');
      } finally {
        submitting.value = false;
      }
    };

    const handleEditReply = (reply: any) => {
      editingReply.value = reply;
      editContent.value = reply.content;
      showEditDialog.value = true;
    };

    const handleEditSubmit = async () => {
      submitting.value = true;
      try {
        if (editingReply.value) {
          // 编辑回复
          await store.dispatch('discussions/updateReply', {
            id: editingReply.value.id,
            content: editContent.value,
          });
          
          const reply = discussion.value.replies.find(
            (r: any) => r.id === editingReply.value.id
          );
          if (reply) {
            reply.content = editContent.value;
            reply.isEdited = true;
          }
        } else {
          // 编辑讨论
          await store.dispatch('discussions/updateDiscussion', {
            id: discussion.value.id,
            ...editForm.value,
          });
          
          Object.assign(discussion.value, editForm.value);
        }

        showEditDialog.value = false;
        ElMessage.success('更新成功');
      } catch (error) {
        ElMessage.error('更新失败');
      } finally {
        submitting.value = false;
      }
    };

    const handleDeleteReply = async (reply: any) => {
      try {
        await ElMessageBox.confirm(
          '确定要删除这条回复吗？',
          '删除回复',
          {
            type: 'warning',
          }
        );

        await store.dispatch('discussions/deleteReply', reply.id);
        const index = discussion.value.replies.findIndex(
          (r: any) => r.id === reply.id
        );
        if (index > -1) {
          discussion.value.replies.splice(index, 1);
          discussion.value.repliesCount--;
        }
        ElMessage.success('回复已删除');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败');
        }
      }
    };

    const handleMarkSolution = async (reply: any) => {
      try {
        await store.dispatch('discussions/markSolution', {
          discussionId: discussion.value.id,
          replyId: reply.id,
        });
        
        discussion.value.solutionId = reply.id;
        ElMessage.success('已标记为最佳答案');
      } catch (error) {
        ElMessage.error('操作失败');
      }
    };

    const loadMoreReplies = async () => {
      if (loadingMore.value || !hasMoreReplies.value) return;

      loadingMore.value = true;
      try {
        const newReplies = await store.dispatch(
          'discussions/fetchReplies',
          {
            discussionId: discussion.value.id,
            page: Math.ceil(discussion.value.replies.length / 20) + 1,
          }
        );
        discussion.value.replies.push(...newReplies);
      } catch (error) {
        ElMessage.error('加载失败');
      } finally {
        loadingMore.value = false;
      }
    };

    const formatDate = (date: string) => {
      return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    };

    const getStatusType = (status: string) => {
      const types: Record<string, string> = {
        open: 'success',
        closed: 'info',
        locked: 'warning',
      };
      return types[status] || 'info';
    };

    const getStatusName = (status: string) => {
      const names: Record<string, string> = {
        open: '进行中',
        closed: '已关闭',
        locked: '已锁定',
      };
      return names[status] || status;
    };

    const getCategoryStyle = (category: any) => {
      if (!category?.color) return {};
      return {
        backgroundColor: `${category.color}20`,
        color: category.color,
        borderColor: `${category.color}40`,
      };
    };

    // 生命周期
    onMounted(() => {
      loadDiscussion();
    });

    // 监听路由变化
    watch(
      () => route.params.id,
      (newId) => {
        if (newId) {
          loadDiscussion();
        }
      }
    );

    return {
      loading,
      discussion,
      renderedContent,
      replySort,
      sortedReplies,
      replyContent,
      replyTo,
      submitting,
      loadingMore,
      showEditDialog,
      showShareDialog,
      editingReply,
      editContent,
      editForm,
      shareUrl,
      isLiked,
      isCollected,
      canManageDiscussion,
      canMarkSolution,
      hasMoreReplies,
      participants,
      handleTogglePin,
      handleMoreAction,
      handleLike,
      handleCollect,
      handleShare,
      copyShareUrl,
      shareToSocial,
      handleReplyTo,
      cancelReplyTo,
      submitReply,
      handleEditReply,
      handleEditSubmit,
      handleDeleteReply,
      handleMarkSolution,
      loadMoreReplies,
      formatDate,
      getStatusType,
      getStatusName,
      getCategoryStyle,
    };
  },
});
</script>

<style scoped>
.discussion-detail {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  padding: 20px;
  min-height: calc(100vh - 64px);
}

.page-nav {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.nav-actions {
  display: flex;
  gap: 12px;
}

.discussion-container {
  background-color: white;
  border-radius: 4px;
  overflow: hidden;
}

.discussion-header {
  padding: 24px;
  border-bottom: 1px solid #e4e7ed;
}

.discussion-title {
  margin: 0 0 16px;
  font-size: 24px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-tags {
  margin-left: 12px;
}

.discussion-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-meta {
  display: flex;
  flex-direction: column;
}

.author-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.post-time {
  font-size: 12px;
  color: #909399;
}

.discussion-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
}

.discussion-content {
  padding: 24px;
}

.content-wrapper {
  margin-bottom: 24px;
}

.content-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

.tags {
  display: flex;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 12px;
}

.replies-section {
  margin-top: 24px;
  padding: 24px;
  background-color: white;
  border-radius: 4px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.load-more {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

.reply-editor {
  margin-top: 24px;
  padding: 24px;
  background-color: white;
  border-radius: 4px;
}

.reply-editor h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 500;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.related-discussions {
  margin-top: 24px;
  padding: 24px;
  background-color: white;
  border-radius: 4px;
}

.related-discussions h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 500;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card,
.participants-card {
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

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  color: #909399;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-info .name {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

.participant-info .replies {
  font-size: 12px;
  color: #909399;
}

.share-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.social-share {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.danger {
  color: var(--el-color-danger);
}

/* Markdown 编辑器样式 */
:deep(.markdown-body) {
  font-size: 15px;
  line-height: 1.7;
}

:deep(.markdown-body pre) {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 16px;
}

:deep(.markdown-body code) {
  background-color: #f3f4f5;
  padding: 2px 6px;
  border-radius: 4px;
}

:deep(.markdown-body img) {
  max-width: 100%;
  border-radius: 4px;
}

:deep(.markdown-body blockquote) {
  border-left: 4px solid #dfe2e5;
  color: #666;
  margin: 0;
  padding-left: 20px;
}

:deep(.markdown-body table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

:deep(.markdown-body th),
:deep(.markdown-body td) {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
}

:deep(.markdown-body th) {
  background-color: #f8f9fa;
}
</style>