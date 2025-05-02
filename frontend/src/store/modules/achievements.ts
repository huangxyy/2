import { Module } from 'vuex';
import { RootState } from '../types';
import api from '@/utils/api';

export interface AchievementState {
  list: Achievement[];
  progress: {
    total: number;
    unlocked: number;
    percentage: number;
  };
}

const achievements: Module<AchievementState, RootState> = {
  namespaced: true,
  state: {
    list: [],
    progress: {
      total: 0,
      unlocked: 0,
      percentage: 0,
    },
  },
  mutations: {
    SET_ACHIEVEMENTS(state, achievements) {
      state.list = achievements;
    },
    SET_PROGRESS(state, progress) {
      state.progress = progress;
    },
    UPDATE_ACHIEVEMENT(state, achievement) {
      const index = state.list.findIndex(a => a.id === achievement.id);
      if (index !== -1) {
        state.list[index] = achievement;
      }
    },
  },
  actions: {
    async fetchAchievements({ commit }) {
      try {
        const response = await api.get('/achievements');
        commit('SET_ACHIEVEMENTS', response.data.data);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      }
    },
    async fetchProgress({ commit }) {
      try {
        const response = await api.get('/achievements/progress');
        commit('SET_PROGRESS', response.data.data);
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      }
    },
  },
};

export default achievements;