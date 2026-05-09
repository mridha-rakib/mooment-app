import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { Colors } from '../constants/Colors';

export function useTheme() {
  const systemScheme = useColorScheme();
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
