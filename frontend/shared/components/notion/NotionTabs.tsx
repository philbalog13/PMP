import React from 'react';

export interface NotionTabOption<T extends string = string> {
  label: string;
  value: T;
  count?: number;
  icon?: React.ReactNode;
}

interface NotionTabsProps<T extends string = string> {
  value: T;
  options: NotionTabOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function NotionTabs<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
}: NotionTabsProps<T>) {
  return (
    <div className="n-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className="n-tabs-trigger"
            data-active={active}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                style={{
                  borderRadius: '999px',
                  fontFamily: 'var(--n-font-mono)',
                  fontSize: 'var(--n-text-xs)',
                  minWidth: '20px',
                  padding: '0 6px',
                  textAlign: 'center',
                  background: active ? 'var(--n-accent-light)' : 'var(--n-bg-tertiary)',
                  color: active ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
