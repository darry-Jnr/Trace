function perpendicularDistance(
  point: [number, number],
  start: [number, number],
  end: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const ex = x - x1;
    const ey = y - y1;
    return Math.sqrt(ex * ex + ey * ey);
  }

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const ex = x - projX;
  const ey = y - projY;

  return Math.sqrt(ex * ex + ey * ey);
}

const DEG_PER_M = 1 / 111000;

export function douglasPeucker(
  coords: [number, number][],
  toleranceMeters: number = 2
): [number, number][] {
  if (coords.length <= 2) return coords;

  const toleranceDeg = toleranceMeters * DEG_PER_M;
  const first = coords[0];
  const last = coords[coords.length - 1];

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < coords.length - 1; i++) {
    const dist = perpendicularDistance(coords[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > toleranceDeg) {
    const left = douglasPeucker(coords.slice(0, maxIdx + 1), toleranceMeters);
    const right = douglasPeucker(coords.slice(maxIdx), toleranceMeters);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}
