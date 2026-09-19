// The colours a user can pick for their avatar circle.
export const AVATAR_COLORS = [
  { value: '#208AEF', name: 'Blue' },
  { value: '#1B7F3B', name: 'Green' },
  { value: '#E07A1F', name: 'Orange' },
  { value: '#7B4FD8', name: 'Purple' },
  { value: '#D6408B', name: 'Pink' },
  { value: '#159A9C', name: 'Teal' },
  { value: '#C93838', name: 'Red' },
  { value: '#4B5563', name: 'Slate' },
] as const;

export const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0].value;
