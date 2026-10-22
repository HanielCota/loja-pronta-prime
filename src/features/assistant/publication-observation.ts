import { observationSeries, type MetricObservation } from './model';

/** Start a shared observation period after the latest missing item, category change or reset. */
export function publicationObservationStart(samples: (MetricObservation | undefined)[][]): number {
  let start = 0;
  for (let index = 0; index < samples.length; index++) {
    const current = samples[index]!;
    if (!current.length || current.some((row) => !row || !row.categoryId || row.views === null)) {
      start = index + 1;
      continue;
    }
    if (index <= start) continue;
    const previous = samples[index - 1]!;
    if (
      current.length !== previous.length ||
      current.some((row, item) => {
        const window = observationSeries([previous[item], row]);
        return !window || window.views === null;
      })
    )
      start = index;
  }
  return start;
}
