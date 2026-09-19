// Word-level diff between an original sentence and its correction, for highlighting changes.
export type DiffSegment = { kind: 'equal' | 'removed' | 'added'; text: string };

export function wordDiff(original: string, corrected: string): DiffSegment[] {
  const a = original.trim().split(/\s+/).filter(Boolean);
  const b = corrected.trim().split(/\s+/).filter(Boolean);
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = length of the longest common word sequence of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const raw: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      raw.push({ kind: 'equal', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      raw.push({ kind: 'removed', text: a[i] });
      i++;
    } else {
      raw.push({ kind: 'added', text: b[j] });
      j++;
    }
  }
  while (i < n) raw.push({ kind: 'removed', text: a[i++] });
  while (j < m) raw.push({ kind: 'added', text: b[j++] });

  // Merge neighbours of the same kind into one segment.
  const merged: DiffSegment[] = [];
  for (const segment of raw) {
    const last = merged[merged.length - 1];
    if (last && last.kind === segment.kind) {
      last.text += ` ${segment.text}`;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}
