import { LanguageSummary } from '@/components/language-summary';
import { Screen } from '@/components/screen';
import { Body, Title } from '@/components/typography';
import { strings } from '@/constants/strings';
import { useAuth } from '@/lib/auth';

export default function HomeScreen() {
  const { profile, userLanguages, languages } = useAuth();
  const speaks = userLanguages.filter((row) => row.kind !== 'learning');
  const learning = userLanguages.filter((row) => row.kind === 'learning');

  return (
    <Screen>
      <Title>{strings.home.greeting(profile?.display_name ?? '')}</Title>
      <Body>{strings.home.comingSoon}</Body>
      <LanguageSummary title={strings.home.speaks} rows={speaks} languages={languages} />
      <LanguageSummary title={strings.home.learning} rows={learning} languages={languages} />
    </Screen>
  );
}
