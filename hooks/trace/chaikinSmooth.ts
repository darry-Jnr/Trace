export function chaikinSmooth(
  coords: [number, number][],
  iterations: number = 2
): [number, number][] {
  if (coords.length < 3) return coords;

  let points = coords;

  for (let iter = 0; iter < iterations; iter++) {
    if (points.length < 3) break;

    const result: [number, number][] = [];

    result.push(points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      result.push([
        p0[0] * 0.75 + p1[0] * 0.25,
        p0[1] * 0.75 + p1[1] * 0.25,
      ]);
      result.push([
        p0[0] * 0.25 + p1[0] * 0.75,
        p0[1] * 0.25 + p1[1] * 0.75,
      ]);
    }

    result.push(points[points.length - 1]);
    points = result;
  }

  return points;
}
