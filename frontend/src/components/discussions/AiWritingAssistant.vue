<template>
  <div class="ai-assistant">
    <!-- 头部 -->
    <div class="assistant-header">
      <div class="status-indicator">
        <el-tag
          :type="isAnalyzing ? 'warning' : 'success'"
          size="small"
        >
          {{ isAnalyzing ? '分析中...' : '已就绪' }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-tooltip content="重新分析" placement="top">
          <el-button
            :loading="isAnalyzing"
            circle
            @click="analyze"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="设置" placement="top">
          <el-button
            circle
            @click="showSettings = true"
          >
            <el-icon><Setting /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 分析结果 -->
    <div class="analysis-results">
      <!-- 评分卡片 -->
      <div class="score-cards">
        <div
          v-for="score in scores"
          :key="score.type"
          class="score-card"
          :class="getScoreClass(score.value)"
        >
          <div class="score-label">{{ score.label }}</div>
          <div class="score-value">{{ score.value }}</div>
          <el-progress
            :percentage="score.value"
            :status="getScoreStatus(score.value)"
            :show-text="false"
          />
        </div>
      </div>

      <!-- 建议列表 -->
      <el-collapse v-model="activeSection">
        <!-- 标题建议 -->
        <el-collapse-item name="title">
          <template #title>
            <div class="section-title">
              <el-icon><Edit /></el-icon>
              标题优化
            </div>
          </template>
          <div class="suggestions-list">
            <template v-if="analysis?.titleSuggestion">
              <div class="suggestion-item">
                <div class="suggestion-content">
                  {{ analysis.titleSuggestion }}
                </div>
                <div class="suggestion-actions">
                  <el-button
                    type="primary"
                    text
                    @click="applyTitleSuggestion(analysis.titleSuggestion)"
                  >
                    应用
                  </el-button>
                </div>
              </div>
            </template>
            <el-empty v-else description="暂无建议" />
          </div>
        </el-collapse-item>

        <!-- 内容建议 -->
        <el-collapse-item name="content">
          <template #title>
            <div class="section-title">
              <el-icon><Document /></el-icon>
              内容完善
            </div>
          </template>
          <div class="suggestions-list">
            <template v-if="analysis?.contentSuggestion">
              <div class="suggestion-item">
                <div class="suggestion-content markdown-body" v-html="renderedContentSuggestion" />
              </div>
            </template>
            <el-empty v-else description="暂无建议" />
          </div>
        </el-collapse-item>

        <!-- 标签建议 -->
        <el-collapse-item name="tags">
          <template #title>
            <div class="section-title">
              <el-icon><Collection /></el-icon>
              推荐标签
            </div>
          </template>
          <div class="tags-list">
            <template v-if="analysis?.recommendedTags.length">
              <el-tag
                v-for="tag in analysis.recommendedTags"
                :key="tag"
                class="tag-item"
                @click="$emit('add-tag', tag)"
              >
                {{ tag }}
              </el-tag>
            </template>
            <el-empty v-else description="暂无推荐标签" />
          </div>
        </el-collapse-item>

        <!-- SEO 建议 -->
        <el-collapse-item name="seo">
          <template #title>
            <div class="section-title">
              <el-icon><Aim /></el-icon>
              SEO 优化
            </div>
          </template>
          <div class="suggestions-list">
            <template v-if="analysis?.seo.suggestions.length">
              <div
                v-for="(suggestion, index) in analysis.seo.suggestions"
                :key="index"
                class="suggestion-item"
              >
                <div class="suggestion-content">
                  {{ suggestion }}
                </div>
              </div>
            </template>
            <el-empty v-else description="暂无 SEO 建议" />
          </div>
        </el-collapse-item>

        <!-- 可读性建议 -->
        <el-collapse-item name="readability">
          <template #title>
            <div class="section-title">
              <el-icon><Reading /></el-icon>
              可读性分析
            </div>
          </template>
          <div class="readability-info">
            <div class="readability-level">
              阅读难度：{{ analysis?.readability.level }}
            </div>
            <div class="suggestions-list">
              <template v-if="analysis?.readability.suggestions.length">
                <div
                  v-for="(suggestion, index) in analysis.readability.suggestions"
                  :key="index"
                  class="suggestion-item"
                >
                  <div class="suggestion-content">
                    {{ suggestion }}
                  </div>
                </div>
              </template>
              <el-empty v-else description="暂无可读性建议" />
            </div>
          </div>
        </el-collapse-item>

        <!-- 关键词分析 -->
        <el-collapse-item name="keywords">
          <template #title>
            <div class="section-title">
              <el-icon><Key /></el-icon>
              关键词分析
            </div>
          </template>
          <div class="keywords-cloud">
            <template v-if="analysis?.keywords.length">
              <el-tag
                v-for="keyword in analysis.keywords"
                :key="keyword.word"
                :style="getKeywordStyle(keyword.score)"
              >
                {{ keyword.word }}
                <span class="keyword-score">{{ (keyword.score * 100).toFixed(0) }}%</span>
              </el-tag>
            </template>
            <el-empty v-else description="暂无关键词分析" />
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="AI 助手设置"
      width="500px"
    >
      <el-form :model="settings" label-width="100px">
        <el-form-item label="分析语言">
          <el-select v-model="settings.language">
            <el-option label="中文" value="zh" />
            <el-option label="英文" value="en" />
          </el-select>
        </el-form-item>
        <el-form-item label="自动分析">
          <el-switch v-model="settings.autoAnalyze" />
        </el-form-item>
        <el-form-item label="分析延迟">
          <el-slider
            v-model="settings.analysisDelay"
            :min="1"
            :max="10"
            :format-tooltip="value => `${value}秒`"
          />
        </el-form-item>
        <el-form-item label="关注点">
          <el-checkbox-group v-model="settings.focusAreas">
            <el-checkbox label="title">标题优化</el-checkbox>
            <el-checkbox label="content">内容完善</el-checkbox>
            <el-checkbox label="seo">SEO 优化</el-checkbox>
            <el-checkbox label="readability">可读性</el-checkbox>
            <el-checkbox label="keywords">关键词</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSettings = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import {
  Refresh,
  Setting,
  Edit,
  Document,
  Collection,
  Aim,
  Reading,
  Key,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import debounce from 'lodash/debounce';
import { aiService } from '@/services/aiService';
import type { AiAnalysisResult } from '@/types/ai';

export default defineComponent({
  name: 'AiWritingAssistant',
  components: {
    Refresh,
    Setting,
    Edit,
    Document,
    Collection,
    Aim,
    Reading,
    Key,
  },
  props: {
    title: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: '',
    },
  },
  emits: ['update:title', 'add-tag'],
  setup(props, { emit }) {
    // 状态
    const isAnalyzing = ref(false);
    const analysis = ref<AiAnalysisResult | null>(null);
    const activeSection = ref(['title', 'content']);
    const showSettings = ref(false);
    
    // 设置
    const settings = ref({
      language: 'zh',
      autoAnalyze: true,
      analysisDelay: 3,
      focusAreas: ['title', 'content', 'seo', 'readability', 'keywords'],
    });

    // 计算属性
    const scores = computed(() => {
      if (!analysis.value) return [];
      return [
        {
          type: 'readability',
          label: '可读性',
          value: analysis.value.readability.score,
        },
        {
          type: 'seo',
          label: 'SEO',
          value: analysis.value.seo.score,
        },
        {
          type: 'sentiment',
          label: '情感倾向',
          value: analysis.value.sentiment.score,
        },
        {
          type: 'structure',
          label: '结构完整度',
          value: analysis.value.structure.score,
        },
      ];
    });

    const renderedContentSuggestion = computed(() => {
      if (!analysis.value?.contentSuggestion) return '';
      return DOMPurify.sanitize(marked(analysis.value.contentSuggestion));
    });

    // 方法
    const analyze = async () => {
      if (isAnalyzing.value) return;
      if (!props.content) {
        ElMessage.warning('请先输入内容');
        return;
      }

      isAnalyzing.value = true;
      try {
        analysis.value = await aiService.analyzeContent({
          title: props.title,
          content: props.content,
          category: props.category,
          language: settings.value.language,
        });
      } catch (error) {
        ElMessage.error('分析失败');
      } finally {
        isAnalyzing.value = false;
      }
    };

    const debouncedAnalyze = debounce(analyze, 
      settings.value.analysisDelay * 1000
    );

    const applyTitleSuggestion = (title: string) => {
      emit('update:title', title);
      ElMessage.success('已应用标题建议');
    };

    const getScoreClass = (score: number) => {
      if (score >= 80) return 'score-high';
      if (score >= 60) return 'score-medium';
      return 'score-low';
    };

    const getScoreStatus = (score: number) => {
      if (score >= 80) return 'success';
      if (score >= 60) return 'warning';
      return 'exception';
    };

    const getKeywordStyle = (score: number) => {
      return {
        fontSize: `${14 + score * 8}px`,
        opacity: 0.3 + score * 0.7,
      };
    };

    const saveSettings = () => {
      localStorage.setItem('ai-assistant-settings', 
        JSON.stringify(settings.value)
      );
      showSettings.value = false;
      ElMessage.success('设置已保存');
    };

    // 监听内容变化
    watch(
      () => [props.title, props.content],
      () => {
        if (settings.value.autoAnalyze) {
          debouncedAnalyze();
        }
      },
      { deep: true }
    );

    // 初始化
    const init = () => {
      const savedSettings = localStorage.getItem('ai-assistant-settings');
      if (savedSettings) {
        settings.value = JSON.parse(savedSettings);
      }
    };

    init();

    return {
      isAnalyzing,
      analysis,
      activeSection,
      showSettings,
      settings,
      scores,
      renderedContentSuggestion,
      analyze,
      applyTitleSuggestion,
      getScoreClass,
      getScoreStatus,
      getKeywordStyle,
      saveSettings,
    };
  },
});
</script>

<style scoped>
.ai-assistant {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.score-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.score-card {
  padding: 12px;
  border-radius: 4px;
  text-align: center;
  background-color: var(--el-fill-color-lighter);
}

.score-card.score-high {
  background-color: var(--el-color-success-lighter);
}

.score-card.score-medium {
  background-color: var(--el-color-warning-lighter);
}

.score-card.score-low {
  background-color: var(--el-color-danger-lighter);
}

.score-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.score-value {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
}

.tag-item:hover {
  background-color: var(--el-color-primary-light-8);
}

.readability-level {
  margin-bottom: 12px;
  font-weight: 500;
}

.keywords-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
}

.keyword-score {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}

/* Markdown 样式继承全局设置 */
:deep(.markdown-body) {
  font-size: 14px;
}
</style>