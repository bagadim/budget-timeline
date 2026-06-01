'use client';

import { useState } from 'react';
import { PALETTE } from '@/lib/palette';

export function ColorSwatch({
  color,
  options = PALETTE,
  onChange,
}: {
  color: string;
  options?: readonly string[];
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Change color"
        onClick={() => setOpen((o) => !o)}
        className="h-3.5 w-3.5 rounded"
        style={{ background: color }}
      />
      {open && (
        <div className="absolute z-10 mt-1 flex w-32 flex-wrap gap-1 rounded-md border border-zinc-200 bg-white p-1.5 shadow-lg">
          {options.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className="h-4 w-4 rounded"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
