<template>
  <div class="messages-page">
    <div class="conversations-panel">
      <conversation-list
        :conversations="conversations"
        :loading="loadingConversations"
        :selectedUserId="selectedUserId"
        @select-conversation="selectConversation"
      />
    </div>
    <div class="messages-panel">
      <template v-if="selectedUserId">
        <div class="messages-header">
          <div class="user-info">
            <img :src="selectedUser?.avatar" :alt="selectedUser?.username" />
            <span>{{ selectedUser?.username }}</span>
          </div>
        </div>
        <message-list
          :messages="messages"
          :loading="loadingMessages"
          :hasMore="hasMoreMessages"
          :currentUserId="currentUserId"
          @load-more="loadMoreMessages"
        />
        <div class="message-input">
          <textarea
            v-model="newMessage"
            placeholder="输入消息..."
            @keypress.enter.prevent="sendMessage"
          ></textarea>
          <button @click="sendMessage" :disabled="!newMessage.trim()">
            发送
          </button>
        </div>
      </template>
      <div v-else class="no-conversation">
        选择一个对话或开始新对话
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import ConversationList from '@/components/messages/ConversationList.vue';
import MessageList from '@/components/messages/MessageList.vue';

export default defineComponent({
  name: 'MessagesView',
  components: {
    ConversationList,
    MessageList,
  },
  setup() {
    const store = useStore();
    const selectedUserId = ref<number | null>(null);
    const newMessage = ref('');
    const page = ref(1);
    const hasMoreMessages = ref(true);
    const loadingMessages = ref(false);
    const loadingConversations = ref(false);

    const currentUserId = computed(() => store.state.auth.user.id);
    const conversations = computed(() => store.state.messages.conversations);
    const messages = computed(() => store.state.messages.currentMessages);
    const selectedUser = computed(() => {
      if (!selectedUserId.value) return null;
      const conversation = conversations.value.find(
        c => c.user.id === selectedUserId.value
      );
      return conversation?.user;
    });

    const selectConversation = async (userId: number) => {
      selectedUserId.value = userId;
      page.value = 1;
      hasMoreMessages.value = true;
      await loadMessages();
    };

    const loadMessages = async () => {
      if (!selectedUserId.value || loadingMessages.value) return;
      
      loadingMessages.value = true;
      try {
        await store.dispatch('messages/fetchMessages', {
          userId: selectedUserId.value,
          page: page.value,
        });
        if (store.state.messages.currentMessages.length < 20) {
          hasMoreMessages.value = false;
        }
      } finally {
        loadingMessages.value = false;
      }
    };

    const loadMoreMessages = async () => {
      page.value++;
      await loadMessages();
    };

    const sendMessage = async () => {
      if (!selectedUserId.value || !newMessage.value.trim()) return;

      try {
        await store.dispatch('messages/sendMessage', {
          receiverId: selectedUserId.value,
          content: newMessage.value,
        });
        newMessage.value = '';
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    };

    const loadConversations = async () => {
      loadingConversations.value = true;
      try {
        await store.dispatch('messages/fetchConversations');
      } finally {
        loadingConversations.value = false;
      }
    };

    // WebSocket连接
    const setupWebSocket = () => {
      store.dispatch('messages/connectWebSocket');
    };

    onMounted(() => {
      loadConversations();
      setupWebSocket();
    });

    onBeforeUnmount(() => {
      store.dispatch('messages/disconnectWebSocket');
    });

    return {
      selectedUserId,
      newMessage,
      currentUserId,
      conversations,
      messages,
      selectedUser,
      loadingMessages,
      loadingConversations,
      hasMoreMessages,
      selectConversation,
      sendMessage,
      loadMoreMessages,
    };
  },
});
</script>

<style scoped>
.messages-page {
  display: flex;
  height: calc(100vh - 64px);
}

.conversations-panel {
  width: 300px;
  border-right: 1px solid #eee;
}

.messages-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  background: white;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 1rem;
}

.message-input {
  padding: 1rem;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
}

.message-input textarea {
  flex: 1;
  height: 40px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  margin-right: 1rem;
}

.message-input button {
  padding: 0.5rem 1rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.message-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.no-conversation {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}
</style>