import { strings } from '@/constants/strings';

// Supabase errors are plain objects with a `message`, not Error instances.
export function errorMessage(caught: unknown): string {
  if (caught instanceof Error) return caught.message;
  if (typeof caught === 'object' && caught !== null && 'message' in caught) {
    const message = (caught as { message: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return strings.errors.generic;
}
