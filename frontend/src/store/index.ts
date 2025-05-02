import { configureStore } from '@reduxjs/toolkit';
import challengesReducer from './slices/challengesSlice';
import terminalReducer from './slices/terminalSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    challenges: challengesReducer,
    terminal: terminalReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;