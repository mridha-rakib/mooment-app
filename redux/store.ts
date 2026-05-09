import { configureStore } from '@reduxjs/toolkit';
import preferenceReducer from './slice/preference';

export const store = configureStore({
  reducer: {
    preference: preferenceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
