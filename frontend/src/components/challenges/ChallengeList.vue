<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <ChallengeCard
      v-for="challenge in challenges"
      :key="challenge.id"
      :challenge="challenge"
      @click="handleChallengeClick(challenge)"
    />
  </div>

  <!-- 分页组件 -->
  <div class="mt-6 flex justify-center">
    <Pagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="handlePageChange"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import ChallengeCard from './ChallengeCard.vue';
import Pagination from '../common/Pagination.vue';

export default defineComponent({
  name: 'ChallengeList',
  
  components: {
    ChallengeCard,
    Pagination,
  },

  props: {
    category: {
      type: Number,
      default: undefined,
    },
    difficulty: {
      type: Number,
      default: undefined,
    },
  },

  setup(props) {
    const store = useStore();
    const router = useRouter();
    const challenges = ref([]);
    const currentPage = ref(1);
    const totalPages = ref(1);

    const fetchChallenges = async () => {
      try {
        const response = await store.dispatch('challenges/listChallenges', {
          category: props.category,
          difficulty: props.difficulty,
          page: currentPage.value,
        });

        challenges.value = response.data.rows;
        totalPages.value = Math.ceil(response.data.count / 10);
      } catch (error) {
        console.error('Failed to fetch challenges:', error);
      }
    };

    const handleChallengeClick = (challenge: any) => {
      router.push(`/challenges/${challenge.id}`);
    };

    const handlePageChange = (page: number) => {
      currentPage.value = page;
      fetchChallenges();
    };

    onMounted(fetchChallenges);

    return {
      challenges,
      currentPage,
      totalPages,
      handleChallengeClick,
      handlePageChange,
    };
  },
});
</script>