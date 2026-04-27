import { Tabs } from 'expo-router';
import AnimatedTabBar from '../../components/AnimatedTabBar';
import { TabScrollProvider } from '../../contexts/TabScrollContext';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export default function TabLayout() {
  return (
    <TabScrollProvider>
      <Tabs
        tabBar={(props: BottomTabBarProps) => <AnimatedTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {/* Order must match TABS array in AnimatedTabBar */}
        <Tabs.Screen name="index"   options={{ title: 'Home'    }} />
        <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
        <Tabs.Screen name="scan"    options={{ title: 'Scan'    }} />
        <Tabs.Screen name="care"    options={{ title: 'Care'    }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </TabScrollProvider>
  );
}
