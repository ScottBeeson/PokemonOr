// Manual difficulty decisions survive refreshes, including renamed directory entries.
export function preserveCompanyFlags(previous, refreshed) {
  const byName = new Map(previous.map(entry => [entry.name.toLowerCase(), entry]));
  const bySource = new Map(previous.filter(entry => entry.source).map(entry => [entry.source, entry]));
  const result = refreshed.map(entry => {
    const old = (entry.source && bySource.get(entry.source)) || byName.get(entry.name.toLowerCase());
    return { ...entry, TooObvious: old?.TooObvious ?? entry.TooObvious ?? false };
  });
  const names = new Set(result.map(entry => entry.name.toLowerCase()));
  const sources = new Set(result.filter(entry => entry.source).map(entry => entry.source));
  for (const entry of previous) {
    if (entry.TooObvious === true && !names.has(entry.name.toLowerCase()) && !(entry.source && sources.has(entry.source))) {
      result.push({ ...entry });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
