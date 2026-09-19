import { LegalPage } from '@/components/legal-page';
import { termsParagraphs } from '@/constants/legal';

export default function TermsScreen() {
  return <LegalPage paragraphs={termsParagraphs} />;
}
