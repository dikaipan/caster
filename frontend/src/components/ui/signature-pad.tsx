'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange?: (signature: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({ 
  onSignatureChange, 
  width = 400, 
  height = 200,
  className = '' 
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing style
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [width, height]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      // Touch event - use first touch point
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      // Touch end event - use changedTouches
      return {
        x: (e.changedTouches[0].clientX - rect.left) * scaleX,
        y: (e.changedTouches[0].clientY - rect.top) * scaleY,
      };
    } else {
      // Mouse event - TypeScript type guard ensures this is MouseEvent
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      return {
        x: (mouseEvent.clientX - rect.left) * scaleX,
        y: (mouseEvent.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const signature = canvas.toDataURL('image/png');
        onSignatureChange?.(signature);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange?.(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="cursor-crosshair touch-none w-full"
          style={{ touchAction: 'none', height: `${height}px` }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Tanda tangan di sini
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature}
          className="text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Hapus Tanda Tangan
        </Button>
      </div>
    </div>
  );
}

