// Every user-visible string lives here so the UI can be translated later.
export const strings = {
  appName: 'Language Exchange',
  home: {
    title: 'Language Exchange',
    loading: 'Connecting to Supabase…',
    connected: 'Connected to Supabase',
    error: 'Could not reach Supabase',
    retry: 'Try again',
  },
} as const;
