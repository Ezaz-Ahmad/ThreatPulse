// Matches the documented production ingestion cadence (see the backend's
// UPDATE_INTERVAL_HOURS env var and README). This is only used to render an
// honest *estimate* of when the next scheduled ingest will run - it's not a
// guarantee. A manual "Refresh Now" click, a cold Render instance waking up,
// or an env var change on the backend can all shift the real timing, which
// is why every place this is shown says "approximately"/"~" rather than a
// hard promise.
export const INGEST_INTERVAL_HOURS = 6;

export function nextRefreshEstimate(lastIngestIso) {
  if (!lastIngestIso) return null;
  const last = new Date(lastIngestIso);
  if (Number.isNaN(last.getTime())) return null;
  return new Date(last.getTime() + INGEST_INTERVAL_HOURS * 60 * 60 * 1000);
}
