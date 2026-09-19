import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { strings } from '@/constants/strings';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="partners"
        options={{
          title: strings.tabs.partners,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: strings.tabs.profile,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
