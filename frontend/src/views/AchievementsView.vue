<template>
  <div class="achievements-page">
    <div class="progress-overview">
      <h2>成就进度</h2>
      <div class="progress-stats">
        <div class="stat-item">
          <span class="stat-value">{{ progress.unlocked }}</span>
          <span class="stat-label">已解锁</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ progress.total }}</span>
          <span class="stat-label">总成就</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ progress.percentage.toFixed(1) }}%</span>
          <span class="stat-label">完成度</span>
        </div>
      </div>
    </div>

    <div class="achievements-filter">
      <select v-model="currentCategory">
        <option value="">全部类别</option>
        <option v-for="category in categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
      <select v-model="currentSort">
        <option value="progress">按进度排序</option>
        <option value="recent">最近解锁</option>
        <option value="points">按积分排序</option>
      </select>
    </div>

    <div class="achievements-grid">
      <achievement-card
        v-for="achievement in filteredAchievements"
        :key="achievement.id"
        :achievement="achievement"
        @click="showAchievementDetails(achievement)"
      />
    </div>

    <achievement-details-modal
      v-if="selectedAchievement"
      :achievement="selectedAchievement"
      @close="selectedAchievement = null"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import AchievementCard from '@/components/achievements/AchievementCard.vue';
import AchievementDetailsModal from '@/components/achievements/AchievementDetailsModal.vue';
import { Achievement } from '@/types/achievement';

export default defineComponent({
  name: 'AchievementsView',
  components: {
    AchievementCard,
    AchievementDetailsModal,
  },
  setup() {
    const store = useStore();
    const currentCategory = ref('');
    const currentSort = ref('progress');
    const selectedAchievement = ref<Achievement | null>(null);

    const progress = computed(() => store.state.achievements.progress);
    const achievements = computed(() => store.state.achievements.list);

    const categories = computed(() => {
      return [...new Set(achievements.value.map(a => a.category))];
    });

    const filteredAchievements = computed(() => {
      let result = [...achievements.value];

      if (currentCategory.value) {
        result = result.filter(a => a.category === currentCategory.value);
      }

      switch (currentSort.value) {
        case 'progress':
          result.sort((a, b) => b.progress - a.progress);
          break;
        case 'recent':
          result.sort((a, b) => {
            if (!a.unlockedAt) return 1;
            if (!b.unlockedAt) return -1;
            return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
          });
          break;
        case 'points':
          result.sort((a, b) => b.points - a.points);
          break;
      }

      return result;
    });

    const showAchievementDetails = (achievement: Achievement) => {
      selectedAchievement.value = achievement;
    };

    onMounted(async () => {
      await store.dispatch('achievements/fetchAchievements');
      await store.dispatch('achievements/fetchProgress');
    });

    return {
      progress,
      categories,
      currentCategory,
      currentSort,
      filteredAchievements,
      selectedAchievement,
      showAchievementDetails,
    };
  },
});
</script>

<style scoped>
.achievements-page {
  padding: 2rem;
}

.progress-overview {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4CAF50;
}

.stat-label {
  display: block;
  color: #666;
}

.achievements-filter {
  margin-bottom: 2rem;
}

.achievements-filter select {
  margin-right: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
</style>