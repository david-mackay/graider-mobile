export function moveIndex<T>(items: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Which slot the dragged item should land in, based on finger offset. */
export function dropIndexForOffset(from: number, dy: number, heights: number[]): number {
  if (heights.length === 0) return from;
  const safeFrom = Math.max(0, Math.min(from, heights.length - 1));
  const start = heights.slice(0, safeFrom).reduce((sum, h) => sum + h, 0);
  const draggedCenter = start + (heights[safeFrom] ?? 0) / 2 + dy;
  let acc = 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < heights.length; i += 1) {
    const mid = acc + heights[i] / 2;
    const dist = Math.abs(mid - draggedCenter);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
    acc += heights[i];
  }
  return best;
}

/** Index whose vertical midpoint is closest to the finger. */
export function indexFromWindowMids(pageY: number, mids: number[]): number {
  if (mids.length === 0) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < mids.length; i += 1) {
    const dist = Math.abs(mids[i] - pageY);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Pixels to scroll this frame when the finger is in the viewport's top/bottom edge. */
export function scrollDeltaForEdge(
  fingerY: number,
  viewportTop: number,
  viewportHeight: number,
  edge = 72,
  maxSpeed = 22,
): number {
  if (viewportHeight <= 0 || edge <= 0) return 0;
  const viewportBottom = viewportTop + viewportHeight;
  if (fingerY < viewportTop + edge) {
    const t = Math.min(1, (viewportTop + edge - fingerY) / edge);
    return -Math.max(1, Math.round(t * maxSpeed));
  }
  if (fingerY > viewportBottom - edge) {
    const t = Math.min(1, (fingerY - (viewportBottom - edge)) / edge);
    return Math.max(1, Math.round(t * maxSpeed));
  }
  return 0;
}
