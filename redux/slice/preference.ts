import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface PreferenceState {
  theme: ThemeMode;
}

const initialState: PreferenceState = {
  theme: 'system',
};

export const preferenceSlice = createSlice({
  name: 'preference',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = preferenceSlice.actions;

export default preferenceSlice.reducer;
