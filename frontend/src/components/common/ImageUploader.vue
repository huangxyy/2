<template>
  <div
    :class="[
      'image-uploader',
      {
        'is-dragover': isDragover,
        'is-disabled': disabled
      }
    ]"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 上传区域 -->
    <div class="upload-area">
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        class="file-input"
        @change="handleFileSelect"
      >

      <div class="upload-content">
        <template v-if="fileList.length">
          <div class="image-grid">
            <div
              v-for="file in fileList"
              :key="file.uid"
              class="image-item"
            >
              <div class="image-preview">
                <img
                  :src="file.url"
                  :alt="file.name"
                  @load="handleImageLoad(file)"
                >
                <div
                  v-if="file.status === 'uploading'"
                  class="upload-progress"
                >
                  <el-progress
                    type="circle"
                    :percentage="file.percentage"
                    :width="32"
                  />
                </div>
                <div
                  v-else-if="file.status === 'error'"
                  class="upload-error"
                >
                  <el-icon><Warning /></el-icon>
                  <span>{{ file.error }}</span>
                </div>
              </div>
              <div class="image-actions">
                <template v-if="file.status === 'done'">
                  <el-tooltip content="复制链接" placement="top">
                    <el-button
                      type="primary"
                      link
                      @click="copyImageUrl(file)"
                    >
                      <el-icon><Link /></el-icon>
                    </el-button>
                  </el-tooltip>
                </template>
                <el-tooltip content="删除" placement="top">
                  <el-button
                    type="danger"
                    link
                    @click="removeFile(file)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
              <div class="image-info">
                <span class="filename">{{ file.name }}</span>
                <span class="filesize">{{ formatSize(file.size) }}</span>
              </div>
            </div>

            <div
              v-if="!isLimitExceeded"
              class="upload-trigger"
              @click="triggerUpload"
            >
              <el-icon><Plus /></el-icon>
              <span>上传图片</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="upload-placeholder" @click="triggerUpload">
            <el-icon><Upload /></el-icon>
            <div class="upload-text">
              <template v-if="isDragover">
                释放鼠标上传图片
              </template>
              <template v-else>
                <div>点击或拖拽图片上传</div>
                <div class="upload-hint">
                  支持 JPG、PNG、GIF 格式，最大 {{ formatSize(maxSize) }}
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 工具栏 -->
    <div v-if="showToolbar" class="upload-toolbar">
      <div class="toolbar-info">
        <template v-if="fileList.length">
          已上传 {{ fileList.length }} 个文件
          <template v-if="totalSize">
            ({{ formatSize(totalSize) }})
          </template>
        </template>
      </div>
      <div class="toolbar-actions">
        <el-button-group>
          <el-button
            :disabled="!fileList.length"
            @click="clearFiles"
          >
            清空
          </el-button>
          <el-tooltip content="设置" placement="top">
            <el-button @click="showSettings = true">
              <el-icon><Setting /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </div>
    </div>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="上传设置"
      width="500px"
    >
      <el-form :model="settings" label-width="120px">
        <el-form-item label="自动压缩">
          <el-switch v-model="settings.autoCompress" />
        </el-form-item>
        <el-form-item label="压缩质量">
          <el-slider
            v-model="settings.quality"
            :min="1"
            :max="100"
            :disabled="!settings.autoCompress"
          >
            <template #tip>
              <div class="quality-preview">
                <span>大小：{{ qualityPreview.size }}</span>
                <span>质量：{{ settings.quality }}%</span>
              </div>
            </template>
          </el-slider>
        </el-form-item>
        <el-form-item label="最大尺寸">
          <el-input-number
            v-model="settings.maxWidth"
            :min="100"
            :max="8000"
            :step="100"
            :disabled="!settings.autoCompress"
          >
            <template #append>px</template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="保留 EXIF">
          <el-switch
            v-model="settings.preserveExif"
            :disabled="!settings.autoCompress"
          />
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
  Plus,
  Upload,
  Link,
  Delete,
  Warning,
  Setting,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { v4 as uuidv4 } from 'uuid';
import { imageService, type ImageUploadOptions } from '@/services/imageService';

interface UploadFile {
  uid: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status: 'ready' | 'uploading' | 'done' | 'error';
  percentage: number;
  width?: number;
  height?: number;
  error?: string;
}

export default defineComponent({
  name: 'ImageUploader',
  components: {
    Plus,
    Upload,
    Link,
    Delete,
    Warning,
    Setting,
  },
  props: {
    modelValue: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    maxCount: {
      type: Number,
      default: 9,
    },
    maxSize: {
      type: Number,
      default: 5 * 1024 * 1024, // 5MB
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    showToolbar: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue', 'success', 'error', 'exceed', 'remove'],
  setup(props, { emit }) {
    // DOM refs
    const fileInputRef = ref<HTMLInputElement>();

    // 状态
    const isDragover = ref(false);
    const fileList = ref<UploadFile[]>([]);
    const showSettings = ref(false);
    const settings = ref<ImageUploadOptions>({
      autoCompress: true,
      quality: 90,
      maxWidth: 1920,
      preserveExif: false,
    });

    // 计算属性
    const isLimitExceeded = computed(() => 
      fileList.value.length >= props.maxCount
    );

    const totalSize = computed(() =>
      fileList.value.reduce((sum, file) => sum + file.size, 0)
    );

    const qualityPreview = computed(() => {
      // 根据质量预估文件大小
      const size = 1024 * 1024; // 假设原始大小为 1MB
      const estimatedSize = size * (settings.value.quality / 100);
      return {
        size: formatSize(estimatedSize),
      };
    });

    // 方法
    const triggerUpload = () => {
      if (props.disabled) return;
      fileInputRef.value?.click();
    };

    const handleDragEnter = () => {
      if (props.disabled) return;
      isDragover.value = true;
    };

    const handleDragOver = () => {
      if (props.disabled) return;
      isDragover.value = true;
    };

    const handleDragLeave = () => {
      isDragover.value = false;
    };

    const handleDrop = async (e: DragEvent) => {
      isDragover.value = false;
      if (props.disabled) return;

      const files = Array.from(e.dataTransfer?.files || [])
        .filter(file => file.type.startsWith('image/'));
      
      await handleFiles(files);
    };

    const handleFileSelect = async (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      await handleFiles(files);
      // 重置 input，以便能重复选择同一文件
      if (fileInputRef.value) {
        fileInputRef.value.value = '';
      }
    };

    const handleFiles = async (files: File[]) => {
      if (!files.length) return;

      // 检查数量限制
      if (fileList.value.length + files.length > props.maxCount) {
        emit('exceed', files);
        ElMessage.warning(`最多只能上传 ${props.maxCount} 个文件`);
        return;
      }

      // 处理每个文件
      for (const file of files) {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          ElMessage.error(`${file.name} 不是有效的图片文件`);
          continue;
        }

        // 检查文件大小
        if (file.size > props.maxSize) {
          ElMessage.error(`${file.name} 超出大小限制`);
          continue;
        }

        // 创建上传记录
        const uploadFile: UploadFile = {
          uid: uuidv4(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          status: 'ready',
          percentage: 0,
        };

        fileList.value.push(uploadFile);

        // 上传文件
        try {
          uploadFile.status = 'uploading';
          const result = await imageService.upload(file, settings.value);
          
          uploadFile.status = 'done';
          uploadFile.url = result.url;
          uploadFile.width = result.width;
          uploadFile.height = result.height;
          
          emit('success', uploadFile);
          updateModelValue();
        } catch (error: any) {
          uploadFile.status = 'error';
          uploadFile.error = error.message;
          emit('error', uploadFile, error);
        }
      }
    };

    const handleImageLoad = async (file: UploadFile) => {
      if (file.width && file.height) return;

      try {
        const info = await imageService.getImageInfo(file.url);
        file.width = info.width;
        file.height = info.height;
      } catch (error) {
        console.error('Failed to get image info:', error);
      }
    };

    const removeFile = (file: UploadFile) => {
      const index = fileList.value.findIndex(f => f.uid === file.uid);
      if (index > -1) {
        if (file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
        fileList.value.splice(index, 1);
        emit('remove', file);
        updateModelValue();
      }
    };

    const clearFiles = () => {
      fileList.value.forEach(file => {
        if (file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });
      fileList.value = [];
      updateModelValue();
    };

    const copyImageUrl = async (file: UploadFile) => {
      try {
        await navigator.clipboard.writeText(file.url);
        ElMessage.success('链接已复制');
      } catch (error) {
        ElMessage.error('复制失败');
      }
    };

    const updateModelValue = () => {
      emit(
        'update:modelValue',
        fileList.value
          .filter(file => file.status === 'done')
          .map(file => file.url)
      );
    };

    const saveSettings = () => {
      localStorage.setItem(
        'image-uploader-settings',
        JSON.stringify(settings.value)
      );
      showSettings.value = false;
      ElMessage.success('设置已保存');
    };

    const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    // 监听 props.modelValue 变化
    watch(
      () => props.modelValue,
      (newUrls) => {
        // 同步外部传入的 URL 列表
        const currentUrls = fileList.value
          .filter(file => file.status === 'done')
          .map(file => file.url);

        // 添加新的 URL
        const urlsToAdd = newUrls.filter(url => !currentUrls.includes(url));
        for (const url of urlsToAdd) {
          fileList.value.push({
            uid: uuidv4(),
            name: url.split('/').pop() || 'image',
            size: 0,
            type: 'image/*',
            url,
            status: 'done',
            percentage: 100,
          });
        }

        // 移除不在新列表中的 URL
        fileList.value = fileList.value.filter(
          file => file.status !== 'done' || newUrls.includes(file.url)
        );
      },
      { immediate: true }
    );

    // 初始化
    const init = () => {
      const savedSettings = localStorage.getItem('image-uploader-settings');
      if (savedSettings) {
        settings.value = JSON.parse(savedSettings);
      }
    };

    init();

    return {
      fileInputRef,
      isDragover,
      fileList,
      showSettings,
      settings,
      isLimitExceeded,
      totalSize,
      qualityPreview,
      triggerUpload,
      handleDragEnter,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileSelect,
      handleImageLoad,
      removeFile,
      clearFiles,
      copyImageUrl,
      saveSettings,
      formatSize,
    };
  },
});
</script>

<style scoped>
.image-uploader {
  width: 100%;
  background-color: var(--el-fill-color-blank);
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  transition: all 0.3s;
}

.image-uploader.is-dragover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.image-uploader.is-disabled {
  cursor: not-allowed;
  background-color: var(--el-disabled-bg-color);
  border-color: var(--el-border-color-light);
}

.upload-area {
  position: relative;
  padding: 16px;
}

.file-input {
  display: none;
}

.upload-content {
  min-height: 180px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.image-item {
  position: relative;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
  overflow: hidden;
}

.image-preview {
  position: relative;
  padding-bottom: 100%;
}

.image-preview img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-progress,
.upload-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
}

.upload-error {
  color: var(--el-color-danger);
}

.image-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
}

.image-item:hover .image-actions {
  display: flex;
  gap: 4px;
}

.image-info {
  padding: 8px;
  font-size: 12px;
}

.filename {
  display: block;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filesize {
  color: var(--el-text-color-secondary);
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 160px;
  cursor: pointer;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  transition: all 0.3s;
}

.upload-trigger:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 180px;
  cursor: pointer;
}

.upload-text {
  margin-top: 16px;
  text-align: center;
}

.upload-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.upload-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid var(--el-border-color-light);
  background-color: var(--el-fill-color-lighter);
}

.toolbar-info {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.quality-preview {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>