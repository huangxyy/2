<template>
  <div class="create-discussion">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-breadcrumb>
        <el-breadcrumb-item :to="{ name: 'Discussions' }">
          讨论区
        </el-breadcrumb-item>
        <el-breadcrumb-item>
          发起讨论
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 主要表单 -->
    <div class="main-content">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
        @submit.prevent="handleSubmit"
      >
        <!-- 标题 -->
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入讨论标题"
            :maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <!-- 分类 -->
        <el-form-item label="分类" prop="categoryId">
          <el-select
            v-model="formData.categoryId"
            placeholder="选择讨论分类"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
              :disabled="!canPostInCategory(category)"
            >
              <template #default="{ label }">
                <div class="category-option">
                  <el-icon v-if="category.icon">
                    <component :is="category.icon" />
                  </el-icon>
                  <span>{{ label }}</span>
                  <el-tag
                    v-if="!category.isPublic"
                    size="small"
                    type="warning"
                  >
                    受限
                  </el-tag>
                </div>
              </template>
            </el-option>
          </el-select>
          <div class="category-description">
            {{ selectedCategory?.description || '请选择讨论分类' }}
          </div>
        </el-form-item>

        <!-- 标签 -->
        <el-form-item label="标签" prop="tags">
          <el-select
            v-model="formData.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="添加标签（最多5个）"
            :max="5"
          >
            <el-option
              v-for="tag in recommendedTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
          <div class="tag-recommendations" v-if="recommendedTags.length">
            <span class="label">推荐标签：</span>
            <el-tag
              v-for="tag in recommendedTags.slice(0, 5)"
              :key="tag"
              size="small"
              class="clickable"
              @click="addTag(tag)"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>

        <!-- 内容编辑器 -->
        <el-form-item label="内容" prop="content">
          <div class="editor-container">
            <div class="editor-header">
              <div class="editor-tabs">
                <div
                  class="tab-item"
                  :class="{ active: !previewMode }"
                  @click="previewMode = false"
                >
                  编写
                </div>
                <div
                  class="tab-item"
                  :class="{ active: previewMode }"
                  @click="previewMode = true"
                >
                  预览
                </div>
              </div>
              <div class="editor-tools">
                <el-tooltip content="支持 Markdown 格式" placement="top">
                  <el-link
                    type="primary"
                    href="https://guides.github.com/features/mastering-markdown/"
                    target="_blank"
                  >
                    Markdown 指南
                  </el-link>
                </el-tooltip>
              </div>
            </div>

            <div class="editor-body">
              <template v-if="!previewMode">
                <markdown-editor
                  v-model="formData.content"
                  :min-height="400"
                  placeholder="详细描述您的问题或想法..."
                  @update:modelValue="handleContentChange"
                />
                <div class="editor-footer">
                  <div class="upload-hint">
                    <el-icon><Picture /></el-icon>
                    可拖拽图片到编辑器，或粘贴截图
                  </div>
                  <div class="word-count">
                    {{ contentWordCount }} 字
                  </div>
                </div>
              </template>
              <div
                v-else
                class="preview-content markdown-body"
                v-html="renderedContent"
              />
            </div>
          </div>
        </el-form-item>

        <!-- 发布选项 -->
        <el-form-item label="发布选项">
          <el-space>
            <el-checkbox v-model="formData.subscribeReplies">
              接收回复通知
            </el-checkbox>
            <el-tooltip
              v-if="canPinDiscussion"
              content="将讨论固定在分类顶部"
              placement="top"
            >
              <el-checkbox v-model="formData.isPinned">
                置顶讨论
              </el-checkbox>
            </el-tooltip>
          </el-space>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="submitting"
            :disabled="!formData.content.trim()"
          >
            发布讨论
          </el-button>
          <el-button @click="handleCancel">
            取消
          </el-button>
          <el-button
            v-if="formData.content.trim()"
            @click="handleSaveDraft"
          >
            保存草稿
          </el-button>
        </el-form-item>
      </el-form>

      <!-- AI 助手 -->
      <el-card class="ai-assistant" v-if="showAiAssistant">
        <template #header>
          <div class="card-header">
            <h3>AI 写作助手</h3>
            <el-switch
              v-model="aiEnabled"
              active-text="开启"
              inactive-text="关闭"
            />
          </div>
        </template>
        <div class="ai-content">
          <template v-if="aiEnabled">
            <div class="ai-suggestions">
              <div class="suggestion-item">
                <h4>标题优化建议</h4>
                <p>{{ titleSuggestion || '正在分析...' }}</p>
              </div>
              <div class="suggestion-item">
                <h4>内容完善建议</h4>
                <p>{{ contentSuggestion || '正在分析...' }}</p>
              </div>
              <div class="suggestion-item">
                <h4>推荐标签</h4>
                <div class="tag-list">
                  <el-tag
                    v-for="tag in aiTags"
                    :key="tag"
                    size="small"
                    class="clickable"
                    @click="addTag(tag)"
                  >
                    {{ tag }}
                  </el-tag>
                </div>
              </div>
            </div>
            <div class="ai-actions">
              <el-button
                type="primary"
                plain
                size="small"
                @click="requestAiSuggestions"
              >
                重新分析
              </el-button>
            </div>
          </template>
          <el-empty
            v-else
            description="开启 AI 助手获取智能建议"
          />
        </div>
      </el-card>
    </div>

    <!-- 保存草稿对话框 -->
    <el-dialog
      v-model="showDraftDialog"
      title="保存草稿"
      width="400px"
    >
      <el-form
        ref="draftFormRef"
        :model="draftForm"
        label-width="80px"
      >
        <el-form-item label="草稿标题">
          <el-input
            v-model="draftForm.title"
            placeholder="为草稿起个标题"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDraftDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="savingDraft"
            @click="saveDraft"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 未保存提示 -->
    <el-dialog
      v-model="showUnsavedDialog"
      title="未保存的更改"
      width="400px"
    >
      <p>您有未保存的更改，确定要离开吗？</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleStayOnPage">继续编辑</el-button>
          <el-button
            type="primary"
            @click="handleLeavePage"
          >
            离开页面
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import { useStore } from 'vuex';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import debounce from 'lodash/debounce';

export default defineComponent({
  name: 'CreateDiscussionView',
  components: {
    MarkdownEditor,
    Picture,
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    const formRef = ref();

    // 状态
    const formData = ref({
      title: '',
      categoryId: parseInt(route.query.category as string) || '',
      tags: [],
      content: '',
      subscribeReplies: true,
      isPinned: false,
    });

    const previewMode = ref(false);
    const submitting = ref(false);
    const contentWordCount = ref(0);
    const showDraftDialog = ref(false);
    const showUnsavedDialog = ref(false);
    const savingDraft = ref(false);
    const hasUnsavedChanges = ref(false);
    const aiEnabled = ref(false);
    const showAiAssistant = ref(true);

    // 表单验证规则
    const rules = {
      title: [
        { required: true, message: '请输入标题', trigger: 'blur' },
        { min: 5, max: 200, message: '标题长度应在 5 到 200 个字符之间', trigger: 'blur' },
      ],
      categoryId: [
        { required: true, message: '请选择分类', trigger: 'change' },
      ],
      content: [
        { required: true, message: '请输入内容', trigger: 'blur' },
        { min: 20, message: '内容至少需要 20 个字符', trigger: 'blur' },
      ],
    };

    // 计算属性
    const categories = computed(() => store.state.discussions.categories);
    const selectedCategory = computed(() =>
      categories.value.find(c => c.id === formData.value.categoryId)
    );
    const recommendedTags = computed(() => store.state.discussions.recommendedTags);
    const canPinDiscussion = computed(() =>
      store.getters['auth/hasPermission']('pin_discussion')
    );

    const renderedContent = computed(() => {
      return formData.value.content
        ? DOMPurify.sanitize(marked(formData.value.content))
        : '<p class="empty-preview">没有内容可预览</p>';
    });

    // AI 相关状态
    const titleSuggestion = ref('');
    const contentSuggestion = ref('');
    const aiTags = ref<string[]>([]);

    // 方法
    const canPostInCategory = (category: any) => {
      if (category.isPublic) return true;
      return store.getters['auth/hasPermission']('post_in_restricted_category');
    };

    const handleContentChange = debounce((content: string) => {
      contentWordCount.value = content.length;
      hasUnsavedChanges.value = true;

      // 如果开启了 AI 助手，自动分析内容
      if (aiEnabled.value && content.length > 50) {
        requestAiSuggestions();
      }
    }, 500);

    const addTag = (tag: string) => {
      if (formData.value.tags.length < 5 && !formData.value.tags.includes(tag)) {
        formData.value.tags.push(tag);
      }
    };

    const handleSubmit = async () => {
      if (!formRef.value) return;

      try {
        await formRef.value.validate();
        submitting.value = true;

        const discussion = await store.dispatch('discussions/createDiscussion', formData.value);
        ElMessage.success('讨论发布成功');
        hasUnsavedChanges.value = false;
        router.push({
          name: 'DiscussionDetail',
          params: { id: discussion.id },
        });
      } catch (error) {
        ElMessage.error('发布失败');
      } finally {
        submitting.value = false;
      }
    };

    const handleCancel = () => {
      if (hasUnsavedChanges.value) {
        showUnsavedDialog.value = true;
      } else {
        router.back();
      }
    };

    const handleSaveDraft = () => {
      showDraftDialog.value = true;
    };

    const saveDraft = async () => {
      savingDraft.value = true;
      try {
        await store.dispatch('discussions/saveDraft', {
          ...formData.value,
          title: draftForm.value.title,
        });
        showDraftDialog.value = false;
        ElMessage.success('草稿已保存');
        hasUnsavedChanges.value = false;
      } catch (error) {
        ElMessage.error('保存失败');
      } finally {
        savingDraft.value = false;
      }
    };

    const handleStayOnPage = () => {
      showUnsavedDialog.value = false;
    };

    const handleLeavePage = () => {
      hasUnsavedChanges.value = false;
      router.back();
    };

    const requestAiSuggestions = async () => {
      try {
        const suggestions = await store.dispatch('ai/analyzeContent', {
          title: formData.value.title,
          content: formData.value.content,
          category: selectedCategory.value?.name,
        });

        titleSuggestion.value = suggestions.titleSuggestion;
        contentSuggestion.value = suggestions.contentSuggestion;
        aiTags.value = suggestions.recommendedTags;
      } catch (error) {
        ElMessage.error('AI 分析失败');
      }
    };

    // 路由守卫
    onBeforeRouteLeave((to, from, next) => {
      if (hasUnsavedChanges.value) {
        showUnsavedDialog.value = true;
        next(false);
      } else {
        next();
      }
    });

    // 监听表单变化
    watch(
      () => formData.value,
      () => {
        hasUnsavedChanges.value = true;
      },
      { deep: true }
    );

    // 页面关闭提醒
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    });

    // 初始化
    const init = async () => {
      if (!categories.value.length) {
        await store.dispatch('discussions/fetchCategories');
      }
      await store.dispatch('discussions/fetchRecommendedTags');
      window.addEventListener('beforeunload', beforeUnloadHandler);
    };

    init();

    return {
      formRef,
      formData,
      rules,
      previewMode,
      submitting,
      contentWordCount,
      showDraftDialog,
      showUnsavedDialog,
      savingDraft,
      categories,
      selectedCategory,
      recommendedTags,
      canPinDiscussion,
      renderedContent,
      aiEnabled,
      showAiAssistant,
      titleSuggestion,
      contentSuggestion,
      aiTags,
      canPostInCategory,
      handleContentChange,
      addTag,
      handleSubmit,
      handleCancel,
      handleSaveDraft,
      saveDraft,
      handleStayOnPage,
      handleLeavePage,
      requestAiSuggestions,
    };
  },
});
</script>

<style scoped>
.create-discussion {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-description {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.tag-recommendations {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-recommendations .label {
  font-size: 12px;
  color: #909399;
}

.clickable {
  cursor: pointer;
}

.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #dcdfe6;
}

.editor-tabs {
  display: flex;
  gap: 16px;
}

.tab-item {
  padding: 4px 0;
  cursor: pointer;
  color: #606266;
}

.tab-item.active {
  color: var(--el-color-primary);
  border-bottom: 2px solid var(--el-color-primary);
}

.editor-body {
  min-height: 400px;
}

.preview-content {
  padding: 16px;
  min-height: 400px;
}

.empty-preview {
  color: #909399;
  text-align: center;
  padding: 40px 0;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid #dcdfe6;
  background-color: #f5f7fa;
}

.upload-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.word-count {
  font-size: 12px;
  color: #909399;
}

.ai-assistant {
  position: sticky;
  top: 20px;
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

.ai-suggestions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion-item h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
}

.suggestion-item p {
  margin: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-actions {
  margin-top: 16px;
  text-align: right;
}

/* Markdown 编辑器样式继承全局设置 */
:deep(.markdown-body) {
  font-size: 14px;
}
</style>