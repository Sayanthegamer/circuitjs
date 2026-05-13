import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface ProbedItem {
  id: string;
  elmId: string;
  prop: 'V1' | 'V2' | 'I' | 'Vdiff';
  color: string;
}

interface PlotterProps {
  items: ProbedItem[];
}

export interface PlotterHandle {
  pushData: (t: number, values: number[]) => void;
  clear: () => void;
}

const MAX_POINTS = 500;

export const Plotter = forwardRef<PlotterHandle, PlotterProps>(({ items }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Buffers
  const timesRef = useRef<number[]>([]);
  const valuesRef = useRef<number[][]>([]); // Array of lines, each is an array of points

  useImperativeHandle(ref, () => ({
    pushData: (t: number, values: number[]) => {
      timesRef.current.push(t);
      if (timesRef.current.length > MAX_POINTS) {
        timesRef.current.shift();
      }

      // Initialize value buffers if needed
      if (valuesRef.current.length !== values.length) {
        valuesRef.current = values.map(() => []);
      }

      for (let i = 0; i < values.length; i++) {
        valuesRef.current[i].push(values[i]);
        if (valuesRef.current[i].length > MAX_POINTS) {
          valuesRef.current[i].shift();
        }
      }

      draw();
    },
    clear: () => {
      timesRef.current = [];
      valuesRef.current = [];
      draw();
    }
  }));

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * window.devicePixelRatio) {
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    } else {
      // Just clear if not resizing
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    const width = rect.width;
    const height = rect.height;

    // Draw background grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    if (timesRef.current.length < 2 || items.length === 0) return;

    // Determine min/max for auto-scaling
    let minVal = 0;
    let maxVal = 0;
    for (const line of valuesRef.current) {
      for (const val of line) {
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    }
    
    // Add some padding
    const range = Math.max(1e-6, maxVal - minVal);
    minVal -= range * 0.1;
    maxVal += range * 0.1;
    const newRange = maxVal - minVal;

    // Draw lines
    const tStart = timesRef.current[0];
    const tEnd = timesRef.current[timesRef.current.length - 1];
    const tSpan = Math.max(1e-6, tEnd - tStart);

    items.forEach((item, i) => {
      if (!valuesRef.current[i]) return;
      
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const vals = valuesRef.current[i];
      for (let j = 0; j < vals.length; j++) {
        const t = timesRef.current[j];
        const v = vals[j];
        
        const x = ((t - tStart) / tSpan) * width;
        const y = height - ((v - minVal) / newRange) * height;
        
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // Draw legend/labels
    ctx.font = '10px Inter, sans-serif';
    ctx.textBaseline = 'top';
    items.forEach((item, i) => {
      ctx.fillStyle = item.color;
      ctx.fillText(`${item.elmId} ${item.prop}`, 10, 10 + i * 16);
      
      // Current value text
      if (valuesRef.current[i] && valuesRef.current[i].length > 0) {
        const lastVal = valuesRef.current[i][valuesRef.current[i].length - 1];
        const unit = item.prop === 'I' ? 'A' : 'V';
        let valStr = lastVal.toFixed(3);
        if (Math.abs(lastVal) < 0.01 && Math.abs(lastVal) > 0) {
           valStr = (lastVal * 1000).toFixed(2) + 'm';
        }
        ctx.fillText(`${valStr}${unit}`, 80, 10 + i * 16);
      }
    });
  };

  useEffect(() => {
    // Clear buffers if items change
    timesRef.current = [];
    valuesRef.current = [];
    draw();
  }, [items]);

  return (
    <div className="plotter-wrapper">
      <div className="plotter-header">
        <span className="plotter-title">Oscilloscope</span>
      </div>
      <canvas ref={canvasRef} className="plotter-canvas" />
    </div>
  );
});

Plotter.displayName = 'Plotter';
