import { createStore } from 'vuex';
import challengesModule from '@/store/modules/challenges';
import api from '@/utils/api';

// Mock API
jest.mock('@/utils/api');

describe('challenges store module', () => {
  let store: any;

  beforeEach(() => {
    store = createStore({
      modules: {
        challenges: challengesModule,
      },
    });
  });

  describe('actions', () => {
    it('listChallenges fetches and commits challenges', async () => {
      const mockChallenges = [
        { id: 1, title: 'Challenge 1' },
        { id: 2, title: 'Challenge 2' },
      ];

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockChallenges },
      });

      await store.dispatch('challenges/listChallenges');

      expect(store.state.challenges.challenges).toEqual(mockChallenges);
    });

    it('startChallenge starts challenge and updates state', async () => {
      const mockChallenge = {
        id: 1,
        title: 'Challenge 1',
        connection_info: { host: 'localhost', port: 8080 },
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockChallenge },
      });

      await store.dispatch('challenges/startChallenge', 1);

      expect(store.state.challenges.currentChallenge).toEqual(mockChallenge);
    });

    it('submitFlag handles flag submission correctly', async () => {
      const mockResponse = { correct: true, points: 100 };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockResponse },
      });

      const result = await store.dispatch('challenges/submitFlag', {
        id: 1,
        flag: 'test-flag',
      });

      expect(result).toEqual(mockResponse);
    });
  });
});