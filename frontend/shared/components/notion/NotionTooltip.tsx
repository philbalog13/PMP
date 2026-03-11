import React, { useId, useState } from 'react';

interface NotionTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function NotionTooltip({ content, children }: NotionTooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      style={{ display: 'inline-flex', position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="n-tooltip"
          style={{
            left: '50%',
            position: 'absolute',
            top: 'calc(100% + 8px)',
            transform: 'translateX(-50%)',
            zIndex: 140,
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
