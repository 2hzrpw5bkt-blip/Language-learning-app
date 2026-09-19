import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { strings } from '@/constants/strings';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useChats } from '@/lib/chat-context';
import { hasSeenWelcome } from '@/lib/welcome';

export default function TabsLayout() {
  const router = useRouter();
  const { session } = useAuth();
  const { unreadTotal } = useChats();
  const userId = session?.user.id ?? null;

  // First time in the app: explain how it works.
  useEffect(() => {
    if (!userId) return;
    hasSeenWelcome(userId).then((seen) => {
      if (!seen) router.push('/welcome');
    });
  }, [userId, router]);

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
        name="chats"
        options={{
          title: strings.tabs.chats,
          tabBarBadge: unreadTotal > 0 ? unreadTotal : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
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
