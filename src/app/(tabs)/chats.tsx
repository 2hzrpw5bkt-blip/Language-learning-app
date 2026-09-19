import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Body, ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { useChats } from '@/lib/chat-context';
import { listTime } from '@/lib/time';

export default function ChatsScreen() {
  const router = useRouter();
  const { conversations, loaded, error, reload } = useChats();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={<ErrorText message={error} />}
        ListEmptyComponent={loaded && !error ? <Body style={styles.empty}>{strings.chats.empty}</Body> : null}
        renderItem={({ item }) => {
          const unread = item.unread_count > 0;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Avatar color={item.other_avatar_color} name={item.other_name} size={52} />
              <View style={styles.text}>
                <View style={styles.titleRow}>
                  <Body style={[styles.name, unread && styles.bold]} numberOfLines={1}>
                    {item.other_name}
                  </Body>
                  {item.last_message_at ? <Muted style={styles.time}>{listTime(item.last_message_at)}</Muted> : null}
                </View>
                <View style={styles.titleRow}>
                  <Muted style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                    {item.last_message_preview ?? strings.chats.noMessages}
                  </Muted>
                  {unread ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread_count}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.surface },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1 },
  bold: { fontWeight: '700' },
  time: { fontSize: 12 },
  preview: { flexShrink: 1 },
  previewUnread: { color: colors.text, fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl },
});
