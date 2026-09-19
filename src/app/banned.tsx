import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Body, Title } from '@/components/typography';
import { strings } from '@/constants/strings';
import { supabase } from '@/lib/supabase';

export default function BannedScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <Title>{strings.banned.title}</Title>
      <Body>{strings.banned.body}</Body>
      <Button title={strings.profile.signOut} variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
