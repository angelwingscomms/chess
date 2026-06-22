export function get_word_timestamps(
  chars: readonly string[],
  times: readonly [number, number][],
  search_words: readonly string[]
): Record<string, [number, number]> {
  const words: Record<string, [number, number]> = {};
  let buf: string[] = [];
  let start = -1;

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === ' ') {
      if (buf.length) {
        words[buf.join('')] = [times[start][0], times[i - 1][1]];
        buf = [];
        start = -1;
      }
    } else {
      if (start === -1) start = i;
      buf.push(chars[i]);
    }
  }

  if (buf.length) {
    words[buf.join('')] = [times[start][0], times[chars.length - 1][1]];
  }

  const search = new Set(search_words);
  const result: Record<string, [number, number]> = {};
  for (const w of Object.keys(words)) {
    if (search.has(w)) result[w] = words[w];
  }

  return result;
}
