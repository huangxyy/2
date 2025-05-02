<template>
  <div class="markdown-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <el-tooltip content="粗体 (Ctrl+B)" placement="top">
          <el-button
            :class="{ active: activeFormats.bold }"
            @click="insertFormat('**', '**')"
          >
            <el-icon><Bold /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="斜体 (Ctrl+I)" placement="top">
          <el-button
            :class="{ active: activeFormats.italic }"
            @click="insertFormat('*', '*')"
          >
            <el-icon><Italic /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="删除线" placement="top">
          <el-button
            :class="{ active: activeFormats.strikethrough }"
            @click="insertFormat('~~', '~~')"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <div class="toolbar-group">
        <el-tooltip content="标题" placement="top">
          <el-dropdown trigger="click" @command="insertHeading">
            <el-button>
              <el-icon><Edit /></el-icon>
              <span>标题</span>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="level in 6"
                  :key="level"
                  :command="level"
                >
                  <span class="heading-preview" :class="`h${level}`">
                    标题 {{ level }}
                  </span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-tooltip>
        <el-tooltip content="引用 (Ctrl+Q)" placement="top">
          <el-button
            :class="{ active: activeFormats.quote }"
            @click="insertFormat('> ', '')"
          >
            <el-icon><QuoteRight /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="代码块 (Ctrl+K)" placement="top">
          <el-button
            :class="{ active: activeFormats.code }"
            @click="insertCodeBlock"
          >
            <el-icon><Terminal /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <div class="toolbar-group">
        <el-tooltip content="无序列表" placement="top">
          <el-button
            :class="{ active: activeFormats.unorderedList }"
            @click="insertList('- ')"
          >
            <el-icon><List /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="有序列表" placement="top">
          <el-button
            :class="{ active: activeFormats.orderedList }"
            @click="insertList('1. ')"
          >
            <el-icon><Sort /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="任务列表" placement="top">
          <el-button
            :class="{ active: activeFormats.taskList }"
            @click="insertList('- [ ] ')"
          >
            <el-icon><Check /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <div class="toolbar-group">
        <el-tooltip content="插入链接 (Ctrl+L)" placement="top">
          <el-button @click="showLinkDialog = true">
            <el-icon><Link /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="插入图片" placement="top">
          <el-button @click="showImageDialog = true">
            <el-icon><Picture /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="插入表格" placement="top">
          <el-button @click="showTableDialog = true">
            <el-icon><Grid /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <div class="toolbar-group">
        <el-tooltip content="全屏编辑" placement="top">
          <el-button @click="toggleFullscreen">
            <el-icon>
              <component :is="isFullscreen ? 'Close' : 'FullScreen'" />
            </el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div
      ref="editorRef"
      class="editor-content"
      :style="{ minHeight: `${minHeight}px` }"
    >
      <textarea
        ref="textareaRef"
        v-model="localContent"
        :placeholder="placeholder"
        @input="handleInput"
        @keydown="handleKeydown"
        @paste="handlePaste"
        @drop="handleDrop"
        @select="handleSelect"
      />
    </div>

    <!-- 插入链接对话框 -->
    <el-dialog
      v-model="showLinkDialog"
      title="插入链接"
      width="500px"
      @closed="resetLinkForm"
    >
      <el-form
        ref="linkFormRef"
        :model="linkForm"
        :rules="linkRules"
        label-width="80px"
      >
        <el-form-item label="链接文本" prop="text">
          <el-input v-model="linkForm.text" placeholder="显示的文本" />
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input v-model="linkForm.url" placeholder="链接地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showLinkDialog = false">取消</el-button>
          <el-button type="primary" @click="insertLink">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 插入图片对话框 -->
    <el-dialog
      v-model="showImageDialog"
      title="插入图片"
      width="500px"
      @closed="resetImageForm"
    >
      <el-form
        ref="imageFormRef"
        :model="imageForm"
        :rules="imageRules"
        label-width="80px"
      >
        <el-form-item label="上传图片">
          <el-upload
            class="image-uploader"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :show-file-list="false"
            accept="image/*"
            :before-upload="beforeImageUpload"
            :on-success="handleImageSuccess"
            :on-error="handleImageError"
          >
            <img
              v-if="imageForm.url"
              :src="imageForm.url"
              class="upload-preview"
            >
            <el-icon v-else class="upload-icon"><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">
            支持 JPG、PNG、GIF 格式，最大 5MB
          </div>
        </el-form-item>
        <el-form-item label="图片描述" prop="alt">
          <el-input v-model="imageForm.alt" placeholder="图片的替代文本" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImageDialog = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="!imageForm.url"
            @click="insertImage"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 插入表格对话框 -->
    <el-dialog
      v-model="showTableDialog"
      title="插入表格"
      width="400px"
      @closed="resetTableForm"
    >
      <el-form
        ref="tableFormRef"
        :model="tableForm"
        :rules="tableRules"
        label-width="80px"
      >
        <el-form-item label="行数" prop="rows">
          <el-input-number
            v-model="tableForm.rows"
            :min="2"
            :max="10"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="列数" prop="cols">
          <el-input-number
            v-model="tableForm.cols"
            :min="2"
            :max="10"
            controls-position="right"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTableDialog = false">取消</el-button>
          <el-button type="primary" @click="insertTable">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  Bold,
  Italic,
  Delete,
  Edit,
  ArrowDown,
  QuoteRight,
  Terminal,
  List,
  Sort,
  Check,
  Link,
  Picture,
  Grid,
  FullScreen,
  Close,
  Plus,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default defineComponent({
  name: 'MarkdownEditor',
  components: {
    Bold,
    Italic,
    Delete,
    Edit,
    ArrowDown,
    QuoteRight,
    Terminal,
    List,
    Sort,
    Check,
    Link,
    Picture,
    Grid,
    FullScreen,
    Close,
    Plus,
  },
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '请输入内容...',
    },
    minHeight: {
      type: Number,
      default: 200,
    },
    uploadUrl: {
      type: String,
      required: true,
    },
    uploadHeaders: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // DOM 引用
    const editorRef = ref<HTMLDivElement>();
    const textareaRef = ref<HTMLTextAreaElement>();

    // 编辑器状态
    const localContent = ref(props.modelValue);
    const isFullscreen = ref(false);
    const selectionStart = ref(0);
    const selectionEnd = ref(0);
    const activeFormats = ref({
      bold: false,
      italic: false,
      strikethrough: false,
      quote: false,
      code: false,
      unorderedList: false,
      orderedList: false,
      taskList: false,
    });

    // 对话框状态
    const showLinkDialog = ref(false);
    const showImageDialog = ref(false);
    const showTableDialog = ref(false);

    // 表单数据
    const linkForm = ref({
      text: '',
      url: '',
    });

    const imageForm = ref({
      url: '',
      alt: '',
    });

    const tableForm = ref({
      rows: 3,
      cols: 3,
    });

    // 表单验证规则
    const linkRules = {
      url: [
        { required: true, message: '请输入链接地址', trigger: 'blur' },
        { type: 'url', message: '请输入有效的URL', trigger: 'blur' },
      ],
    };

    const imageRules = {
      alt: [
        { required: true, message: '请输入图片描述', trigger: 'blur' },
      ],
    };

    const tableRules = {
      rows: [
        { required: true, message: '请输入行数', trigger: 'blur' },
        { type: 'number', min: 2, max: 10, message: '行数应在 2-10 之间', trigger: 'blur' },
      ],
      cols: [
        { required: true, message: '请输入列数', trigger: 'blur' },
        { type: 'number', min: 2, max: 10, message: '列数应在 2-10 之间', trigger: 'blur' },
      ],
    };

    // 方法
    const handleInput = () => {
      emit('update:modelValue', localContent.value);
      updateActiveFormats();
    };

    const handleKeydown = (e: KeyboardEvent) => {
      // 处理快捷键
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            insertFormat('**', '**');
            break;
          case 'i':
            e.preventDefault();
            insertFormat('*', '*');
            break;
          case 'k':
            e.preventDefault();
            if (e.shiftKey) {
              showLinkDialog.value = true;
            } else {
              insertCodeBlock();
            }
            break;
          case 'q':
            e.preventDefault();
            insertFormat('> ', '');
            break;
          case 'l':
            e.preventDefault();
            showLinkDialog.value = true;
            break;
          case 's':
            if (e.shiftKey) {
              e.preventDefault();
              insertFormat('~~', '~~');
            }
            break;
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        insertText('  ');
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      // 处理图片粘贴
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await uploadImage(file);
          }
          break;
        }
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer) return;

      // 处理图片拖放
      const files = e.dataTransfer.files;
      for (const file of files) {
        if (file.type.indexOf('image') === 0) {
          await uploadImage(file);
          break;
        }
      }
    };

    const handleSelect = () => {
      if (!textareaRef.value) return;
      selectionStart.value = textareaRef.value.selectionStart;
      selectionEnd.value = textareaRef.value.selectionEnd;
      updateActiveFormats();
    };

    const insertFormat = (prefix: string, suffix: string) => {
      if (!textareaRef.value) return;

      const start = selectionStart.value;
      const end = selectionEnd.value;
      const text = localContent.value;

      const selectedText = text.substring(start, end);
      const before = text.substring(0, start);
      const after = text.substring(end);

      localContent.value = before + prefix + selectedText + suffix + after;
      emit('update:modelValue', localContent.value);

      // 恢复选区
      nextTick(() => {
        if (!textareaRef.value) return;
        textareaRef.value.focus();
        textareaRef.value.setSelectionRange(
          start + prefix.length,
          end + prefix.length
        );
      });
    };

    const insertText = (text: string, moveCursor = true) => {
      if (!textareaRef.value) return;

      const start = selectionStart.value;
      const end = selectionEnd.value;
      const content = localContent.value;

      localContent.value = 
        content.substring(0, start) +
        text +
        content.substring(end);

      emit('update:modelValue', localContent.value);

      // 移动光标到插入文本之后
      if (moveCursor) {
        nextTick(() => {
          if (!textareaRef.value) return;
          const newPosition = start + text.length;
          textareaRef.value.focus();
          textareaRef.value.setSelectionRange(newPosition, newPosition);
        });
      }
    };

    const insertHeading = (level: number) => {
      const prefix = '#'.repeat(level) + ' ';
      insertFormat(prefix, '');
    };

    const insertCodeBlock = () => {
      const selectedText = localContent.value.substring(
        selectionStart.value,
        selectionEnd.value
      );
      
      if (selectedText.includes('\n')) {
        insertFormat('```\n', '\n```');
      } else {
        insertFormat('`', '`');
      }
    };

    const insertList = (prefix: string) => {
      const selectedText = localContent.value.substring(
        selectionStart.value,
        selectionEnd.value
      );

      if (selectedText) {
        const lines = selectedText.split('\n');
        const formattedText = lines
          .map(line => prefix + line)
          .join('\n');
        insertText(formattedText);
      } else {
        insertText(prefix);
      }
    };

    const insertLink = async () => {
      if (!linkForm.value.url) return;

      const text = linkForm.value.text || linkForm.value.url;
      const markdown = `[${text}](${linkForm.value.url})`;
      insertText(markdown);
      showLinkDialog.value = false;
    };

    const insertImage = () => {
      if (!imageForm.value.url) return;

      const markdown = `![${imageForm.value.alt}](${imageForm.value.url})`;
      insertText(markdown);
      showImageDialog.value = false;
    };

    const insertTable = () => {
      const { rows, cols } = tableForm.value;
      let markdown = '\n';

      // 表头
      markdown += '|' + ' Title '.repeat(cols) + '|\n';
      // 对齐行
      markdown += '|' + ' :--- |'.repeat(cols) + '\n';
      // 数据行
      for (let i = 0; i < rows - 1; i++) {
        markdown += '|' + ' Text '.repeat(cols) + '|\n';
      }

      insertText(markdown + '\n');
      showTableDialog.value = false;
    };

    const uploadImage = async (file: File) => {
      if (!file.type.includes('image/')) {
        ElMessage.error('只能上传图片文件');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        ElMessage.error('图片大小不能超过 5MB');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(props.uploadUrl, {
          method: 'POST',
          headers: props.uploadHeaders,
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        imageForm.value.url = data.url;
        imageForm.value.alt = file.name;
        insertImage();
      } catch (error) {
        ElMessage.error('图片上传失败');
      }
    };

    const toggleFullscreen = () => {
      isFullscreen.value = !isFullscreen.value;
      if (isFullscreen.value) {
        editorRef.value?.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };

    const updateActiveFormats = () => {
      if (!textareaRef.value) return;

      const text = localContent.value;
      const start = selectionStart.value;
      const end = selectionEnd.value;
      const selection = text.substring(start, end);
      const line = text.substring(
        text.lastIndexOf('\n', start - 1) + 1,
        text.indexOf('\n', end)
      );

      activeFormats.value = {
        bold: /\*\*.*\*\*/.test(selection),
        italic: /\*[^*].*\*/.test(selection),
        strikethrough: /~~.*~~/.test(selection),
        quote: /^>/.test(line),
        code: /`.*`/.test(selection) || /```[\s\S]*```/.test(selection),
        unorderedList: /^-\s/.test(line),
        orderedList: /^\d+\.\s/.test(line),
        taskList: /^-\s\[\s\]/.test(line),
      };
    };

    const resetLinkForm = () => {
      linkForm.value = { text: '', url: '' };
    };

    const resetImageForm = () => {
      imageForm.value = { url: '', alt: '' };
    };

    const resetTableForm = () => {
      tableForm.value = { rows: 3, cols: 3 };
    };

    // 生命周期
    onMounted(() => {
      if (textareaRef.value) {
        textareaRef.value.focus();
      }
    });

    onBeforeUnmount(() => {
      if (isFullscreen.value && document.fullscreenElement) {
        document.exitFullscreen();
      }
    });

    return {
      editorRef,
      textareaRef,
      localContent,
      isFullscreen,
      activeFormats,
      showLinkDialog,
      showImageDialog,
      showTableDialog,
      linkForm,
      imageForm,
      tableForm,
      linkRules,
      imageRules,
      tableRules,
      handleInput,
      handleKeydown,
      handlePaste,
      handleDrop,
      handleSelect,
      insertFormat,
      insertHeading,
      insertCodeBlock,
      insertList,
      insertLink,
      insertImage,
      insertTable,
      toggleFullscreen,
      resetLinkForm,
      resetImageForm,
      resetTableForm,
    };
  },
});
</script>

<style scoped>
.markdown-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: white;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: #f5f7fa;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-group:not(:last-child) {
  border-right: 1px solid var(--el-border-color);
  padding-right: 8px;
}

.editor-content {
  position: relative;
}

.editor-content textarea {
  width: 100%;
  height: 100%;
  min-height: inherit;
  padding: 16px;
  border: none;
  resize: vertical;
  outline: none;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.6;
}

.heading-preview {
  display: block;
  padding: 4px 0;
}

.heading-preview.h1 { font-size: 2em; }
.heading-preview.h2 { font-size: 1.5em; }
.heading-preview.h3 { font-size: 1.17em; }
.heading-preview.h4 { font-size: 1em; }
.heading-preview.h5 { font-size: 0.83em; }
.heading-preview.h6 { font-size: 0.67em; }

.image-uploader {
  text-align: center;
}

.upload-preview {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

:deep(.el-button.active) {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

/* 全屏模式 */
.markdown-editor:fullscreen {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.markdown-editor:fullscreen .editor-content {
  flex: 1;
  overflow: auto;
}

.markdown-editor:fullscreen textarea {
  height: 100%;
  resize: none;
}
</style>