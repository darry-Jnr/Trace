export class KalmanFilter {
  private x: [number, number, number, number] = [0, 0, 0, 0];
  private P: Float64Array = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  private initialized = false;
  private lastTimestamp: number | null = null;

  private static readonly DEG_PER_M = 1 / 111000;
  private static readonly Q_ACC = 5e-11;

  update(
    measurement: [number, number],
    accuracyMeters: number,
    timestamp: number
  ): [number, number] {
    if (!this.initialized) {
      this.x = [measurement[0], measurement[1], 0, 0];
      this.initialized = true;
      this.lastTimestamp = timestamp;
      return measurement;
    }

    const dt = Math.max((timestamp - this.lastTimestamp!) / 1000, 0.001);
    this.lastTimestamp = timestamp;

    this.predict(dt);
    this.updateMeasurement(measurement, accuracyMeters);

    return [this.x[0], this.x[1]];
  }

  private predict(dt: number): void {
    const dt2 = dt * dt;
    const dt3 = dt2 * dt;
    const q = KalmanFilter.Q_ACC;

    this.x[0] += this.x[2] * dt;
    this.x[1] += this.x[3] * dt;

    const p = this.P;
    const fp0 = p[0] + p[8] * dt;
    const fp1 = p[1] + p[9] * dt;
    const fp2 = p[2] + p[10] * dt;
    const fp3 = p[3] + p[11] * dt;

    const fp4 = p[4] + p[12] * dt;
    const fp5 = p[5] + p[13] * dt;
    const fp6 = p[6] + p[14] * dt;
    const fp7 = p[7] + p[15] * dt;

    p[0] = fp0 + fp2 * dt + q * dt3 / 3;
    p[1] = fp1 + fp3 * dt;
    p[2] = fp2 + q * dt2 / 2;
    p[3] = fp3;

    p[4] = fp4 + fp6 * dt;
    p[5] = fp5 + fp7 * dt + q * dt3 / 3;
    p[6] = fp6;
    p[7] = fp7 + q * dt2 / 2;

    p[8] = fp2 + q * dt2 / 2;
    p[9] = fp3;
    p[10] = p[10] + q * dt;
    p[11] = p[11];

    p[12] = fp6;
    p[13] = fp7 + q * dt2 / 2;
    p[14] = p[14];
    p[15] = p[15] + q * dt;
  }

  private updateMeasurement(measurement: [number, number], accuracyMeters: number): void {
    const r = (accuracyMeters * KalmanFilter.DEG_PER_M) ** 2;

    const p = this.P;
    const yLng = measurement[0] - this.x[0];
    const yLat = measurement[1] - this.x[1];

    const s00 = p[0] + r;
    const s01 = p[1];
    const s10 = p[4];
    const s11 = p[5] + r;
    const det = s00 * s11 - s01 * s10;
    if (Math.abs(det) < 1e-30) return;

    const invDet = 1 / det;
    const s00Inv = s11 * invDet;
    const s01Inv = -s01 * invDet;
    const s10Inv = -s10 * invDet;
    const s11Inv = s00 * invDet;

    const k00 = p[0] * s00Inv + p[4] * s10Inv;
    const k01 = p[0] * s01Inv + p[4] * s11Inv;
    const k10 = p[1] * s00Inv + p[5] * s10Inv;
    const k11 = p[1] * s01Inv + p[5] * s11Inv;
    const k20 = p[8] * s00Inv + p[12] * s10Inv;
    const k21 = p[8] * s01Inv + p[12] * s11Inv;
    const k30 = p[9] * s00Inv + p[13] * s10Inv;
    const k31 = p[9] * s01Inv + p[13] * s11Inv;

    this.x[0] += k00 * yLng + k01 * yLat;
    this.x[1] += k10 * yLng + k11 * yLat;
    this.x[2] += k20 * yLng + k21 * yLat;
    this.x[3] += k30 * yLng + k31 * yLat;

    const p00 = p[0], p01 = p[1], p02 = p[2], p03 = p[3];
    const p10 = p[4], p11 = p[5], p12 = p[6], p13 = p[7];

    p[0] = (1 - k00) * p00 - k01 * p10;
    p[1] = (1 - k00) * p01 - k01 * p11;
    p[2] = (1 - k00) * p02 - k01 * p12;
    p[3] = (1 - k00) * p03 - k01 * p13;

    p[4] = -k10 * p00 + (1 - k11) * p10;
    p[5] = -k10 * p01 + (1 - k11) * p11;
    p[6] = -k10 * p02 + (1 - k11) * p12;
    p[7] = -k10 * p03 + (1 - k11) * p13;

    p[8] = -k20 * p00 - k21 * p10 + p[8];
    p[9] = -k20 * p01 - k21 * p11 + p[9];
    p[10] = -k20 * p02 - k21 * p12 + p[10];
    p[11] = -k20 * p03 - k21 * p13 + p[11];

    p[12] = -k30 * p00 - k31 * p10 + p[12];
    p[13] = -k30 * p01 - k31 * p11 + p[13];
    p[14] = -k30 * p02 - k31 * p12 + p[14];
    p[15] = -k30 * p03 - k31 * p13 + p[15];
  }

  reset(): void {
    this.initialized = false;
    this.lastTimestamp = null;
    this.x = [0, 0, 0, 0];
    this.P = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
}
