import { useVideoConfig } from 'remotion';

/** Vertical (celular) ou horizontal: as cenas se arrumam pelo formato. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  return { width, height, portrait: height > width };
}
