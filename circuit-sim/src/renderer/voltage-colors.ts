// ============================================================
// Voltage-to-Color Mapping
// ============================================================

/** Map a voltage to an RGB color string.
 *  Positive → green/yellow, Negative → red, Zero → grey, clamps at ±voltageRange */
export function voltageToColor(v: number, voltageRange = 5): string {
  if (v === undefined || isNaN(v)) {
    return 'rgb(80,80,80)';
  }
  const clamped = Math.max(-voltageRange, Math.min(voltageRange, v));
  const t = clamped / voltageRange; // -1..1

  if (t >= 0) {
    // 0→1 : grey → bright green
    const r = Math.round(80 - 50 * t);
    const g = Math.round(80 + 175 * t);
    const b = Math.round(80 - 50 * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // 0→-1 : grey → bright red
    const nt = -t;
    const r = Math.round(80 + 175 * nt);
    const g = Math.round(80 - 50 * nt);
    const b = Math.round(80 - 50 * nt);
    return `rgb(${r},${g},${b})`;
  }
}

/** Color for the wire/post dots based on voltage */
export function postColor(v: number, voltageRange = 5): string {
  return voltageToColor(v, voltageRange);
}
