import { useTheme } from '../context/ThemeContext';
import { darkColors, lightColors, type ThemeColors } from '../constants/themeColors';

export const useThemeColors = (): ThemeColors => {
  const { isDark } = useTheme();
  return isDark ? darkColors : lightColors;
};
