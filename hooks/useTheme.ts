import { Appearance, useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { Colors } from '../constants/Colors';

export function useTheme() {
  // useColorScheme() can be null for the first render(s) of a cold start,
  // which previously collapsed to 'light' and briefly painted the dark app
  // (login checkbox/inputs/buttons) with light tokens. Appearance
  // .getColorScheme() reads the same value synchronously without the hook's
  // first-render gap, so it closes that flash. This stays fully local — no
  // async hydration, no network.
  const systemScheme = useColorScheme() ?? Appearance.getColorScheme();
  const themeSetting = useSelector((state: RootState) => state.preference.theme);

  const activeTheme = themeSetting === 'system' 
    ? (systemScheme === 'dark' ? 'dark' : 'light') 
    : themeSetting;

  return {
    theme: activeTheme,
    colors: Colors[activeTheme],
    isDark: activeTheme === 'dark',
  };
}
