import { Screen } from '@/components/screen';
import { Body, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';

export function LegalPage({ paragraphs }: { paragraphs: string[] }) {
  return (
    <Screen>
      <Muted>{strings.legal.draftNotice}</Muted>
      {paragraphs.map((paragraph, index) => (
        <Body key={index}>{paragraph}</Body>
      ))}
    </Screen>
  );
}
