import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PersoTab from '@/screens/PersoTab';
import ProTab from '@/screens/ProTab';
import { theme } from '@/theme';

export type ListsTabsParamList = {
  Perso: undefined;
  Pro: undefined;
};

const Tab = createMaterialTopTabNavigator<ListsTabsParamList>();

export default function ListsTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          paddingTop: insets.top,
        },
        tabBarIndicatorStyle: {
          backgroundColor: theme.colors.primary,
        },
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen name="Perso" component={PersoTab} />
      <Tab.Screen name="Pro" component={ProTab} />
    </Tab.Navigator>
  );
}
