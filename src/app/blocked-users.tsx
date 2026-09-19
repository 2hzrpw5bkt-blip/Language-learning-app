import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Body, ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listBlockedUsers, unblockUser, type BlockedUser } from '@/lib/chat';
import { useChats } from '@/lib/chat-context';
import { errorMessage } from '@/lib/errors';

export default function BlockedUsersScreen() {
  const { session } = useAuth();
  const { reload } = useChats();
  const me = session?.user.id ?? '';
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listBlockedUsers(me)
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [me]);

  const unblock = async (user: BlockedUser) => {
    try {
      await unblockUser(me, user.id);
      setUsers((current) => (current ?? []).filter((item) => item.id !== user.id));
      reload();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Screen>
      <ErrorText message={error} />
      {users && users.length === 0 ? <Muted>{strings.chats.noBlockedUsers}</Muted> : null}
      {(users ?? []).map((user) => (
        <View key={user.id} style={styles.row}>
          <Avatar color={user.avatar_color} name={user.display_name} size={44} />
          <Body style={styles.name}>{user.display_name}</Body>
          <Button title={strings.chats.unblock} variant="secondary" onPress={() => unblock(user)} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1, fontWeight: '600' },
});
