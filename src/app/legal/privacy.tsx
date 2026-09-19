import { LegalPage } from '@/components/legal-page';
import { privacyParagraphs } from '@/constants/legal';

export default function PrivacyScreen() {
  return <LegalPage paragraphs={privacyParagraphs} />;
}
