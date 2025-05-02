<template>
  <div class="message-list" ref="messageList">
    <div v-if="loading" class="loading">
      加载中...
    </div>
    <template v-else>
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-item"
        :class="{ 'message-sent': message.senderId === currentUserId }"
      >
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-meta">
            <span class="timestamp">{{ formatTime(message.createdAt) }}</span>
            <span v-if="message.isRead && message.senderId === currentUserId" class="read-status">
              已读
            </span>
          </div>
        </div>
        <div class="avatar">
          <img :src="message.sender.avatar" :alt="message.sender.username" />
        </div>
      </div>
    </template>
    <div v-if="hasMore" class="load-more" @click="$emit('load-more')">
      加载更多
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, watch, nextTick } from 'vue';
import { Message } from '@/types/message';
import { formatRelativeTime } from '@/utils/time';

export default defineComponent({
  name: 'MessageList',
  props: {
    messages: {
      type: Array as PropType<Message[]>,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    hasMore: {
      type: Boolean,
      default: false,
    },
    currentUserId: {
      type: Number,
      required: true,
    },
  },
  methods: {
    formatTime(timestamp: string) {
      return formatRelativeTime(new Date(timestamp));
    },
    scrollToBottom() {
      nextTick(() => {
        const element = this.$refs.messageList as HTMLElement;
        element.scrollTop = element.scrollHeight;
      });
    },
  },
  watch: {
    messages(newMessages, oldMessages) {
      if (newMessages.length > oldMessages.length) {
        this.scrollToBottom();
      }
    },
  },
  mounted() {
    this.scrollToBottom();
  },
});
</script>

<style scoped>
.message-list {
  height: calc(100% - 100px);
  overflow-y: auto;
  padding: 1rem;
}

.message-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.message-sent {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
  margin: 0 1rem;
}

.message-text {
  background: #e3f2fd;
  padding: 0.75rem;
  border-radius: 1rem;
  word-break: break-word;
}

.message-sent .message-text {
  background: #e8f5e9;
}

.message-meta {
  font-size: 0.8rem;
  color: #999;
  margin-top: 0.25rem;
  text-align: right;
}

.avatar {
  width: 36px;
  height: 36px;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.read-status {
  margin-left: 0.5rem;
  color: #4CAF50;
}

.load-more {
  text-align: center;
  padding: 1rem;
  color: #2196F3;
  cursor: pointer;
}

.load-more:hover {
  text-decoration: underline;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style>