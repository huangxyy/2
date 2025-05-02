<template>
  <div class="team-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="团队名称" prop="name">
        <el-input 
          v-model="formData.name"
          placeholder="请输入团队名称"
          :maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="团队描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="请输入团队描述"
          :maxlength="1000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="可见性" prop="visibility">
        <el-radio-group v-model="formData.visibility">
          <el-radio label="public">
            公开
            <small class="option-desc">所有人可见，任何人都可以申请加入</small>
          </el-radio>
          <el-radio label="private">
            私有
            <small class="option-desc">仅成员可见，需要邀请才能加入</small>
          </el-radio>
          <el-radio label="invite_only">
            仅邀请
            <small class="option-desc">可见性受限，仅接受邀请加入</small>
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="成员上限" prop="maxMembers">
        <el-input-number
          v-model="formData.maxMembers"
          :min="2"
          :max="1000"
          :step="1"
        />
        <small class="hint">设置团队最大成员数量（2-1000人）</small>
      </el-form-item>

      <el-form-item label="团队头像" prop="avatar">
        <el-upload
          class="avatar-uploader"
          :action="uploadUrl"
          :headers="uploadHeaders"
          :show-file-list="false"
          :before-upload="beforeAvatarUpload"
          :on-success="handleAvatarSuccess"
          :on-error="handleAvatarError"
        >
          <img v-if="formData.avatar" :src="formData.avatar" class="avatar" />
          <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
        </el-upload>
      </el-form-item>

      <el-form-item label="高级设置">
        <el-collapse>
          <el-collapse-item title="团队设置" name="settings">
            <el-form-item label="允许成员邀请" prop="settings.allowMemberInvite">
              <el-switch
                v-model="formData.settings.allowMemberInvite"
              />
            </el-form-item>

            <el-form-item label="自动接受申请" prop="settings.autoAcceptRequests">
              <el-switch
                v-model="formData.settings.autoAcceptRequests"
              />
            </el-form-item>

            <el-form-item label="默认成员权限" prop="settings.defaultMemberRole">
              <el-select v-model="formData.settings.defaultMemberRole">
                <el-option label="成员" value="member" />
                <el-option label="管理员" value="admin" />
                <el-option label="协调者" value="moderator" />
              </el-select>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">
          {{ isEdit ? '更新团队' : '创建团队' }}
        </el-button>
        <el-button @click="$emit('cancel')">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

export default defineComponent({
  name: 'TeamForm',
  components: {
    Plus,
  },
  props: {
    initialData: {
      type: Object,
      default: () => ({}),
    },
    isEdit: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const formRef = ref<FormInstance>();
    const loading = ref(false);

    const formData = reactive({
      name: props.initialData.name || '',
      description: props.initialData.description || '',
      visibility: props.initialData.visibility || 'private',
      maxMembers: props.initialData.maxMembers || 50,
      avatar: props.initialData.avatar || '',
      settings: {
        allowMemberInvite: props.initialData.settings?.allowMemberInvite ?? false,
        autoAcceptRequests: props.initialData.settings?.autoAcceptRequests ?? false,
        defaultMemberRole: props.initialData.settings?.defaultMemberRole || 'member',
      },
    });

    const rules: FormRules = {
      name: [
        { required: true, message: '请输入团队名称', trigger: 'blur' },
        { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' },
      ],
      description: [
        { max: 1000, message: '描述不能超过 1000 个字符', trigger: 'blur' },
      ],
      visibility: [
        { required: true, message: '请选择可见性', trigger: 'change' },
      ],
      maxMembers: [
        { required: true, message: '请设置成员上限', trigger: 'blur' },
        { type: 'number', min: 2, max: 1000, message: '成员数量必须在 2 到 1000 之间', trigger: 'blur' },
      ],
    };

    const uploadUrl = `${import.meta.env.VITE_API_URL}/upload/avatar`;
    const uploadHeaders = {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    };

    const beforeAvatarUpload = (file: File) => {
      const isImage = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
      const isLt2M = file.size / 1024 / 1024 < 2;

      if (!isImage) {
        ElMessage.error('上传头像图片只能是 JPG/PNG/GIF 格式!');
        return false;
      }
      if (!isLt2M) {
        ElMessage.error('上传头像图片大小不能超过 2MB!');
        return false;
      }
      return true;
    };

    const handleAvatarSuccess = (response: any) => {
      formData.avatar = response.data.url;
    };

    const handleAvatarError = () => {
      ElMessage.error('上传失败，请重试');
    };

    const handleSubmit = async () => {
      if (!formRef.value) return;

      try {
        await formRef.value.validate();
        loading.value = true;
        emit('submit', { ...formData });
      } catch (error) {
        console.error('Validation error:', error);
      } finally {
        loading.value = false;
      }
    };

    return {
      formRef,
      formData,
      rules,
      loading,
      uploadUrl,
      uploadHeaders,
      beforeAvatarUpload,
      handleAvatarSuccess,
      handleAvatarError,
      handleSubmit,
    };
  },
});
</script>

<style scoped>
.team-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.option-desc {
  display: block;
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}

.hint {
  margin-left: 10px;
  color: #666;
  font-size: 12px;
}

.avatar-uploader {
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 178px;
  height: 178px;
}

.avatar-uploader:hover {
  border-color: #409EFF;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  line-height: 178px;
  text-align: center;
}

.avatar {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}
</style>