import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Challenge } from '../../types';
import api from '../../utils/api';

interface ChallengesState {
  items: Challenge[];
  current: Challenge | null;
  loading: boolean;
  error: string | null;
}

const initialState: ChallengesState = {
  items: [],
  current: null,
  loading: false,
  error: null,
};

export const fetchChallenges = createAsyncThunk(
  'challenges/fetchChallenges',
  async () => {
    const response = await api.get('/challenges');
    return response.data;
  }
);

export const fetchChallenge = createAsyncThunk(
  'challenges/fetchChallenge',
  async (id: number) => {
    const response = await api.get(`/challenges/${id}`);
    return response.data;
  }
);

const challengesSlice = createSlice({
  name: 'challenges',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchChallenges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChallenges.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchChallenges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载失败';
      })
      .addCase(fetchChallenge.fulfilled, (state, action) => {
        state.current = action.payload;
      });
  },
});

export default challengesSlice.reducer;