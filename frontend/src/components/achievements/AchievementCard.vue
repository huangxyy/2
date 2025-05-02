<template>
  <div
    class="achievement-card"
    :class="{
      'achievement-unlocked': achievement.unlockedAt,
      'achievement-locked': !achievement.unlockedAt
    }"
  >
    <div class="achievement-icon">
      <img :src="achievement.icon" :alt="achievement.name" />
    </div>
    <div class="achievement-info">
      <h3>{{ achievement.name }}</h3>
      <p>{{ achievement.description }}</p>
      <div class="achievement-progress">
        <div
          class="progress-bar"
          :style="{ width: `${achievement.progress * 100}%` }"
        ></div>
        <span>{{ Math.round(achievement.progress * 100) }}%</span>
      </div>
      <div v-if="achievement.unlockedAt" class="unlock-date">
        解锁于: {{ formatDate(achievement.unlockedAt) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Achievement } from '@/types/achievement';

export default defineComponent({
  name: 'AchievementCard',
  props: {
    achievement: {
      type: Object as PropType<Achievement>,
      required: true,
    },
  },
  methods: {
    formatDate(date: string) {
      return new Date(date).toLocaleDateString();
    },
  },
});
</script>

<style scoped>
.achievement-card {
  display: flex;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.achievement-icon {
  width: 64px;
  height: 64px;
  margin-right: 1rem;
}

.achievement-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.achievement-info {
  flex: 1;
}

.achievement-progress {
  position: relative;
  height: 20px;
  background: #eee;
  border-radius: 10px;
  margin-top: 0.5rem;
}

.progress-bar {
  position: absolute;
  height: 100%;
  background: #4CAF50;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.achievement-locked {
  opacity: 0.7;
  filter: grayscale(1);
}

.achievement-unlocked {
  border: 2px solid #4CAF50;
}

.unlock-date {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.5rem;
}
</style>