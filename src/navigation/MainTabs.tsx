import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ElementsScreen from '@/screens/ElementsScreen';
import ListsScreen from '@/screens/ListsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { theme } from '@/theme';

export type MainTabsParamList = {
  Elements: undefined;
  Lists: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function resolveTabIcon(routeName: keyof MainTabsParamList): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case 'Elements':
      return 'checkmark-done-outline';
    case 'Lists':
      return 'list-outline';
    case 'Settings':
      return 'settings-outline';
    default:
      return 'ellipse-outline';
  }
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={resolveTabIcon(route.name)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Elements" component={ElementsScreen} />
      <Tab.Screen name="Lists" component={ListsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
