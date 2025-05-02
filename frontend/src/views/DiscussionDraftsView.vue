<template>
  <div class="drafts-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>草稿箱</h1>
        <div class="header-actions">
          <el-button @click="handleCreateNew">
            <el-icon><Plus /></el-icon>
            写新讨论
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 草稿列表 -->
      <div v-loading="loading" class="drafts-container">
        <template v-if="drafts.length">
          <div class="drafts-list">
            <div
              v-for="draft in drafts"
              :key="draft.id"
              :class="['draft-item', { selected: selectedDraft?.id === draft.id }]"
              @click="handleSelectDraft(draft)"
            >
              <div class="draft-main">
                <div class="draft-title">
                  <span v-if="draft.title">{{ draft.title }}</span>
                  <span v-else class="untitled">未命名草稿</span>
                  <el-tag
                    v-if="draft.category"
                    size="small"
                    :style="getCategoryStyle(draft.category)"
                  >
                    {{ draft.category.name }}
                  </el-tag>
                </div>
                <div class="draft-preview">
                  {{ draft.content.slice(0, 100) || '空白草稿' }}
                </div>
                <div class="draft-meta">
                  <span class="time">
                    最后编辑于 {{ formatDate(draft.updatedAt) }}
                  </span>
                  <span v-if="draft.wordCount" class="word-count">
                    {{ draft.wordCount }} 字
                  </span>
                </div>
              </div>
              <div class="draft-actions">
                <el-button-group>
                  <el-button
                    text
                    type="primary"
                    @click.stop="handleEditDraft(draft)"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button
                    text
                    type="danger"
                    @click.stop="handleDeleteDraft(draft)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </el-button-group>
              </div>
            </div>
          </div>

          <!-- 分页器 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </template>

        <!-- 空状态 -->
        <el-empty
          v-else
          :description="loading ? '加载中...' : '暂无草稿'"
        >
          <template #default>
            <el-button
              v-if="!loading"
              type="primary"
              @click="handleCreateNew"
            >
              开始写作
            </el-button>
          </template>
        </el-empty>
      </div>

      <!-- 预览面板 -->
      <div class="preview-panel">
        <template v-if="selectedDraft">
          <div class="preview-header">
            <h2>{{ selectedDraft.title || '未命名草稿' }}</h2>
            <div class="preview-actions">
              <el-button-group>
                <el-button
                  type="primary"
                  @click="handleEditDraft(selectedDraft)"
                >
                  继续编辑
                </el-button>
                <el-button
                  type="success"
                  @click="handlePublishDraft(selectedDraft)"
                >
                  直接发布
                </el-button>
              </el-button-group>
            </div>
          </div>

          <div class="preview-meta">
            <div class="meta-item">
              <span class="label">分类：</span>
              <span v-if="selectedDraft.category">
                {{ selectedDraft.category.name }}
              </span>
              <span v-else class="not-set">未设置</span>
            </div>
            <div class="meta-item">
              <span class="label">标签：</span>
              <template v-if="selectedDraft.tags?.length">
                <el-tag
                  v-for="tag in selectedDraft.tags"
                  :key="tag"
                  size="small"
                >
                  {{ tag }}
                </el-tag>
              </template>
              <span v-else class="not-set">未设置</span>
            </div>
            <div class="meta-item">
              <span class="label">创建时间：</span>
              {{ formatDate(selectedDraft.createdAt) }}
            </div>
            <div class="meta-item">
              <span class="label">最后编辑：</span>
              {{ formatDate(selectedDraft.updatedAt) }}
            </div>
          </div>

          <div class="preview-content markdown-body" v-html="renderedContent" />
        </template>

        <el-empty
          v-else
          description="选择草稿以预览"
        />
      </div>
    </div>

    <!-- 发布确认对话框 -->
    <el-dialog
      v-model="showPublishDialog"
      title="发布草稿"
      width="500px"
    >
      <el-form
        ref="publishFormRef"
        :model="publishForm"
        :rules="publishRules"
        label-width="80px"
      >
        <el-form-item
          label="标题"
          prop="title"
          :error="publishForm.title ? '' : '发布前需要设置标题'"
        >
          <el-input
            v-model="publishForm.title"
            placeholder="请输入标题"
          />
        </el-form-item>

        <el-form-item
          label="分类"
          prop="categoryId"
          :error="publishForm.categoryId ? '' : '发布前需要选择分类'"
        >
          <el-select
            v-model="publishForm.categoryId"
            placeholder="选择分类"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="publishForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="添加标签"
          >
            <el-option
              v-for="tag in recommendedTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showPublishDialog = false">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="publishing"
            @click="handlePublishSubmit"
          >
            发布
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="showDeleteDialog"
      title="删除草稿"
      width="400px"
    >
      <p>确定要删除这篇草稿吗？此操作不可恢复。</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button
            type="danger"
            :loading="deleting"
            @click="handleDeleteConfirm"
          >
            删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
import { useStore } from 'vuex';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Draft {
  id: number;
  title: string;
  content: string;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    color?: string;
  };
  tags: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export default defineComponent({
  name: 'DiscussionDraftsView',
  components: {
    Plus,
    Edit,
    Delete,
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    // 状态
    const loading = ref(false);
    const drafts = ref<Draft[]>([]);
    const selectedDraft = ref<Draft | null>(null);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const showPublishDialog = ref(false);
    const showDeleteDialog = ref(false);
    const publishing = ref(false);
    const deleting = ref(false);
    const draftToDelete = ref<Draft | null>(null);

    // 发布表单
    const publishForm = ref({
      title: '',
      categoryId: '',
      tags: [] as string[],
    });

    const publishRules = {
      title: [
        { required: true, message: '请输入标题', trigger: 'blur' },
        { min: 5, max: 200, message: '标题长度应在 5 到 200 个字符之间', trigger: 'blur' },
      ],
      categoryId: [
        { required: true, message: '请选择分类', trigger: 'change' },
      ],
    };

    // 计算属性
    const categories = computed(() => store.state.discussions.categories);
    const recommendedTags = computed(() => store.state.discussions.recommendedTags);
    const renderedContent = computed(() => {
      if (!selectedDraft.value?.content) return '';
      return DOMPurify.sanitize(marked(selectedDraft.value.content));
    });

    // 方法
    const loadDrafts = async () => {
      loading.value = true;
      try {
        const response = await store.dispatch('discussions/fetchDrafts', {
          page: currentPage.value,
          pageSize: pageSize.value,
        });
        drafts.value = response.items;
        total.value = response.total;
      } catch (error) {
        ElMessage.error('加载草稿失败');
      } finally {
        loading.value = false;
      }
    };

    const handleCreateNew = () => {
      router.push({ name: 'CreateDiscussion' });
    };

    const handleSelectDraft = (draft: Draft) => {
      selectedDraft.value = draft;
    };

    const handleEditDraft = (draft: Draft) => {
      router.push({
        name: 'CreateDiscussion',
        query: { draft: draft.id },
      });
    };

    const handleDeleteDraft = (draft: Draft) => {
      draftToDelete.value = draft;
      showDeleteDialog.value = true;
    };

    const handleDeleteConfirm = async () => {
      if (!draftToDelete.value) return;

      deleting.value = true;
      try {
        await store.dispatch('discussions/deleteDraft', draftToDelete.value.id);
        ElMessage.success('草稿已删除');
        showDeleteDialog.value = false;
        
        if (selectedDraft.value?.id === draftToDelete.value.id) {
          selectedDraft.value = null;
        }
        
        await loadDrafts();
      } catch (error) {
        ElMessage.error('删除失败');
      } finally {
        deleting.value = false;
      }
    };

    const handlePublishDraft = (draft: Draft) => {
      publishForm.value = {
        title: draft.title,
        categoryId: draft.categoryId || '',
        tags: [...(draft.tags || [])],
      };
      showPublishDialog.value = true;
    };

    const handlePublishSubmit = async () => {
      if (!selectedDraft.value) return;

      publishing.value = true;
      try {
        const discussion = await store.dispatch('discussions/publishDraft', {
          id: selectedDraft.value.id,
          ...publishForm.value,
        });
        ElMessage.success('发布成功');
        showPublishDialog.value = false;
        router.push({
          name: 'DiscussionDetail',
          params: { id: discussion.id },
        });
      } catch (error) {
        ElMessage.error('发布失败');
      } finally {
        publishing.value = false;
      }
    };

    const handleSizeChange = (size: number) => {
      pageSize.value = size;
      currentPage.value = 1;
      loadDrafts();
    };

    const handleCurrentChange = (page: number) => {
      currentPage.value = page;
      loadDrafts();
    };

    const formatDate = (date: string) => {
      return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    };

    const getCategoryStyle = (category: { color?: string }) => {
      if (!category?.color) return {};
      return {
        backgroundColor: `${category.color}20`,
        color: category.color,
        borderColor: `${category.color}40`,
      };
    };

    // 初始化
    onMounted(async () => {
      await Promise.all([
        loadDrafts(),
        store.dispatch('discussions/fetchCategories'),
        store.dispatch('discussions/fetchRecommendedTags'),
      ]);
    });

    return {
      loading,
      drafts,
      selectedDraft,
      currentPage,
      pageSize,
      total,
      showPublishDialog,
      showDeleteDialog,
      publishing,
      deleting,
      publishForm,
      publishRules,
      categories,
      recommendedTags,
      renderedContent,
      handleCreateNew,
      handleSelectDraft,
      handleEditDraft,
      handleDeleteDraft,
      handleDeleteConfirm,
      handlePublishDraft,
      handlePublishSubmit,
      handleSizeChange,
      handleCurrentChange,
      formatDate,
      getCategoryStyle,
    };
  },
});
</script>

<style scoped>
.drafts-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: calc(100vh - 160px);
}

.drafts-container {
  background-color: white;
  border-radius: 4px;
  overflow: hidden;
}

.drafts-list {
  display: flex;
  flex-direction: column;
}

.draft-item {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.3s;
}

.draft-item:hover {
  background-color: #f5f7fa;
}

.draft-item.selected {
  background-color: var(--el-color-primary-light-9);
}

.draft-main {
  flex: 1;
  min-width: 0;
}

.draft-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
}

.untitled {
  color: #909399;
  font-style: italic;
}

.draft-preview {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.draft-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.draft-actions {
  display: flex;
  align-items: center;
}

.preview-panel {
  background-color: white;
  border-radius: 4px;
  padding: 20px;
  overflow: auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.preview-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.preview-meta {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-item .label {
  color: #909399;
}

.not-set {
  color: #c0c4cc;
  font-style: italic;
}

.preview-content {
  padding: 0 16px;
}

.pagination {
  padding: 16px;
  display: flex;
  justify-content: center;
  background-color: white;
  border-top: 1px solid #e4e7ed;
}

/* Markdown 样式继承全局设置 */
:deep(.markdown-body) {
  font-size: 14px;
}
</style>