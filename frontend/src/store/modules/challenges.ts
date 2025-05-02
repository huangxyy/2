import { Module } from 'vuex';
import { RootState } from '../types';
import api from '@/utils/api';

interface ChallengesState {
  challenges: any[];
  currentChallenge: any | null;
  loading: boolean;
  error: string | null;
}

const challenges: Module<ChallengesState, RootState> = {
  namespaced: true,

  state: {
    challenges: [],
    currentChallenge: null,
    loading: false,
    error: null,
  },

  mutations: {
    SET_CHALLENGES(state, challenges) {
      state.challenges = challenges;
    },
    SET_CURRENT_CHALLENGE(state, challenge) {
      state.currentChallenge = challenge;
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
  },

  actions: {
    async listChallenges({ commit }, params) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);

      try {
        const response = await api.get('/challenges', { params });
        commit('SET_CHALLENGES', response.data.data);
        return response.data;
      } catch (error) {
        commit('SET_ERROR', 'Failed to fetch challenges');
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async getChallenge({ commit }, id) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);

      try {
        const response = await api.get(`/challenges/${id}`);
        commit('SET_CURRENT_CHALLENGE', response.data.data);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', 'Failed to fetch challenge');
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async startChallenge({ commit }, id) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);

      try {
        const response = await api.post(`/challenges/${id}/start`);
        commit('SET_CURRENT_CHALLENGE', response.data.data);
        return response.data.data;
      } catch (error) {
        commit('SET_ERROR', 'Failed to start challenge');
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async submitFlag({ commit }, { id, flag }) {
      try {
        const response = await api.post(`/challenges/${id}/submit`, { flag });
        return response.data.data;
      } catch (error) {
        throw error;
      }
    },
  },

  getters: {
    getChallengeById: (state) => (id: number) => {
      return state.challenges.find((c) => c.id === id);
    },
  },
};

export default challenges;