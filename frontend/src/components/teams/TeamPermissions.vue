<template>
  <div class="team-permissions">
    <!-- 权限管理工具栏 -->
    <div class="permissions-toolbar">
      <el-alert
        v-if="!isOwner"
        type="warning"
        :closable="false"
        show-icon
      >
        只有团队所有者可以修改权限设置
      </el-alert>
    </div>

    <!-- 角色权限矩阵 -->
    <div class="permissions-matrix">
      <el-table
        :data="permissionsList"
        :span-method="objectSpanMethod"
        border
        style="width: 100%"
      >
        <el-table-column
          prop="category"
          label="权限类别"
          width="180"
        />
        <el-table-column
          prop="permission"
          label="权限项"
          min-width="200"
        >
          <template #default="{ row }">
            <div class="permission-item">
              <span>{{ row.name }}</span>
              <el-tooltip
                v-if="row.description"
                :content="row.description"
                placement="top"
              >
                <el-icon><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column
          v-for="role in roles"
          :key="role.value"
          :label="role.label"
          align="center"
          width="120"
        >
          <template #default="{ row }">
            <el-checkbox
              v-model="row.roles[role.value]"
              :disabled="!canEditPermission(role.value)"
              @change="handlePermissionChange(row, role.value)"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 保存按钮 -->
    <div class="permissions-actions">
      <el-button
        type="primary"
        :disabled="!isOwner || !hasChanges"
        :loading="saving"
        @click="handleSave"
      >
        保存更改
      </el-button>
      <el-button @click="handleReset" :disabled="!hasChanges">
        重置
      </el-button>
    </div>

    <!-- 自定义权限对话框 -->
    <el-dialog
      v-model="showCustomDialog"
      title="自定义权限"
      width="500px"
    >
      <el-form
        ref="customFormRef"
        :model="customForm"
        label-width="100px"
      >
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="customForm.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="customForm.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="分配给">
          <el-checkbox-group v-model="customForm.roles">
            <el-checkbox
              v-for="role in roles"
              :key="role.value"
              :label="role.value"
            >
              {{ role.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCustomDialog = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleCustomSubmit"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue';
import { cloneDeep } from 'lodash-es';

interface Permission {
  id: string;
  category: string;
  name: string;
  description?: string;
  roles: Record<string, boolean>;
}

export default defineComponent({
  name: 'TeamPermissions',
  components: {
    InfoFilled,
  },
  props: {
    teamId: {
      type: Number,
      required: true,
    },
    isOwner: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const roles = [
      { label: '管理员', value: 'admin' },
      { label: '协调者', value: 'moderator' },
      { label: '成员', value: 'member' },
    ];

    // 初始权限列表
    const defaultPermissions: Permission[] = [
      {
        id: 'manage_team',
        category: '团队管理',
        name: '管理团队设置',
        description: '可以修改团队名称、描述等基本信息',
        roles: { admin: true, moderator: false, member: false },
      },
      {
        id: 'invite_members',
        category: '团队管理',
        name: '邀请新成员',
        description: '可以向团队邀请新成员',
        roles: { admin: true, moderator: true, member: false },
      },
      {
        id: 'remove_members',
        category: '团队管理',
        name: '移除成员',
        description: '可以从团队中移除成员',
        roles: { admin: true, moderator: false, member: false },
      },
      {
        id: 'manage_roles',
        category: '权限管理',
        name: '管理角色',
        description: '可以更改成员的角色',
        roles: { admin: true, moderator: false, member: false },
      },
      {
        id: 'view_analytics',
        category: '数据分析',
        name: '查看分析数据',
        description: '可以查看团队的数据分析报告',
        roles: { admin: true, moderator: true, member: false },
      },
      {
        id: 'manage_resources',
        category: '资源管理',
        name: '管理资源',
        description: '可以添加、编辑、删除团队资源',
        roles: { admin: true, moderator: true, member: false },
      },
    ];

    const permissionsList = ref<Permission[]>(cloneDeep(defaultPermissions));
    const originalPermissions = ref<Permission[]>(cloneDeep(defaultPermissions));
    const saving = ref(false);
    const showCustomDialog = ref(false);
    const customForm = ref({
      name: '',
      description: '',
      roles: [] as string[],
    });

    // 计算是否有未保存的更改
    const hasChanges = computed(() => {
      return JSON.stringify(permissionsList.value) !== JSON.stringify(originalPermissions.value);
    });

    // 处理权限变更
    const handlePermissionChange = (permission: Permission, role: string) => {
      // 如果是管理员权限被关闭，显示确认对话框
      if (role === 'admin' && !permission.roles[role]) {
        ElMessage.warning('降低管理员权限可能会影响团队管理，请谨慎操作');
      }
    };

    // 保存更改
    const handleSave = async () => {
      try {
        saving.value = true;
        // TODO: 调用API保存权限设置
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        originalPermissions.value = cloneDeep(permissionsList.value);
        ElMessage.success('权限设置已更新');
      } catch (error) {
        ElMessage.error('保存失败');
      } finally {
        saving.value = false;
      }
    };

    // 重置更改
    const handleReset = () => {
      permissionsList.value = cloneDeep(originalPermissions.value);
      ElMessage.info('已重置为上次保存的设置');
    };

    // 处理自定义权限提交
    const handleCustomSubmit = () => {
      const newPermission: Permission = {
        id: `custom_${Date.now()}`,
        category: '自定义权限',
        name: customForm.value.name,
        description: customForm.value.description,
        roles: {
          admin: false,
          moderator: false,
          member: false,
        },
      };

      customForm.value.roles.forEach(role => {
        newPermission.roles[role] = true;
      });

      permissionsList.value.push(newPermission);
      showCustomDialog.value = false;
      customForm.value = {
        name: '',
        description: '',
        roles: [],
      };
    };

    // 表格合并单元格方法
    const objectSpanMethod = ({
      row,
      column,
      rowIndex,
      columnIndex,
    }: {
      row: Permission;
      column: any;
      rowIndex: number;
      columnIndex: number;
    }) => {
      if (columnIndex === 0) {
        const categories = permissionsList.value.map(p => p.category);
        const firstIndex = categories.indexOf(row.category);
        const count = categories.filter(c => c === row.category).length;
        
        if (rowIndex === firstIndex) {
          return {
            rowspan: count,
            colspan: 1,
          };
        }
        return {
          rowspan: 0,
          colspan: 0,
        };
      }
    };

    // 检查是否可以编辑特定角色的权限
    const canEditPermission = (role: string) => {
      return props.isOwner;
    };

    return {
      roles,
      permissionsList,
      saving,
      hasChanges,
      showCustomDialog,
      customForm,
      handlePermissionChange,
      handleSave,
      handleReset,
      handleCustomSubmit,
      objectSpanMethod,
      canEditPermission,
    };
  },
});
</script>

<style scoped>
.team-permissions {
  padding: 20px;
}

.permissions-toolbar {
  margin-bottom: 20px;
}

.permissions-matrix {
  margin-bottom: 20px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-item .el-icon {
  color: #909399;
  cursor: help;
}

.permissions-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>