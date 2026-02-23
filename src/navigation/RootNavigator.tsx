import {
  DarkTheme,
  NavigationContainer,
  Theme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from '@/navigation/MainTabs';
import AddActionScreen from '@/screens/AddActionScreen';
import EditActionScreen from '@/screens/EditActionScreen';
import SnoozeScreen from '@/screens/SnoozeScreen';
import { theme } from '@/theme';
import { ActionList } from '@/types';

export type RootStackParamList = {
  Main: undefined;
  AddAction:
    | {
      list?: ActionList | null;
    }
    | undefined;
  EditAction: {
    actionId: number;
  };
  Snooze: {
    title: string;
    body: string;
    data: Record<string, unknown>;
  };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();

const appNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    border: theme.colors.border,
    primary: theme.colors.primary,
    text: theme.colors.text,
    notification: theme.colors.primary,
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={appNavigationTheme}>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddAction"
          component={AddActionScreen}
          options={{
            title: 'New Action',
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
          }}
        />
        <Stack.Screen
          name="EditAction"
          component={EditActionScreen}
          options={{
            title: 'Edit Action',
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
          }}
        />
        <Stack.Screen
          name="Snooze"
          component={SnoozeScreen}
          options={{
            presentation: 'modal',
            title: 'Snooze',
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
