<template>
  <div class="conversation-list">
    <div v-if="loading" class="loading">
      加载中...
    </div>
    <div v-else-if="conversations.length === 0" class="empty-state">
      还没有任何对话
    </div>
    <div
      v-else
      v-for="conversation in conversations"
      :key="conversation.user.id"
      class="conversation-item"
      :class="{ active: selectedUserId === conversation.user.id }"
      @click="$emit('select-conversation', conversation.user.id)"
    >
      <div class="avatar">
        <img :src="conversation.user.avatar" :alt="conversation.user.username" />
        <div
          v-if="conversation.unreadCount > 0"
          class="unread-badge"
        >
          {{ conversation.unreadCount }}
        </div>
      </div>
      <div class="conversation-info">
        <div class="user-name">{{ conversation.user.username }}</div>
        <div class="last-message">{{ conversation.lastMessage.content }}</div>
        <div class="timestamp">
          {{ formatTime(conversation.lastMessage.createdAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Conversation } from '@/types/message';
import { formatRelativeTime } from '@/utils/time';

export default defineComponent({
  name: 'ConversationList',
  props: {
    conversations: {
      type: Array as PropType<Conversation[]>,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    selectedUserId: {
      type: Number,
      default: null,
    },
  },
  methods: {
    formatTime(timestamp: string) {
      return formatRelativeTime(new Date(timestamp));
    },
  },
});
</script>

<style scoped>
.conversation-list {
  height: 100%;
  overflow-y: auto;
  background: white;
  border-right: 1px solid #eee;
}

.conversation-item {
  display: flex;
  padding: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.conversation-item.active {
  background-color: #e3f2fd;
}

.avatar {
  position: relative;
  width: 48px;
  height: 48px;
  margin-right: 1rem;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #f44336;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.last-message {
  color: #666;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timestamp {
  font-size: 0.8rem;
  color: #999;
  margin-top: 0.25rem;
}

.loading,
.empty-state {
  padding: 2rem;
  text-align: center;
  color: #666;
}
</style>