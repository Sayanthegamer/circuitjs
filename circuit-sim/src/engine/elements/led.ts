import { DiodeElement } from './diode';

export class LEDElement extends DiodeElement {
  type = 'led';
  color = '#ff0000'; // Default red

  constructor(x: number, y: number, x2: number, y2: number) {
    super(x, y, x2, y2);
    // Adjust parameters for LED (higher forward voltage, e.g., ~2V)
    this.leakage = 1e-24; // Very low saturation current
    this.vt = 0.02585 * 2; // Higher ideality factor
  }
}
