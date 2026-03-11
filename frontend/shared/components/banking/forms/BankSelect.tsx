'use client';

import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface BankSelectOption {
  value:     string;
  label:     string;
  /** Icône à gauche (LucideIcon component) */
  icon?:     React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  disabled?: boolean;
  group?:    string;
}

interface BankSelectProps {
  options:        BankSelectOption[];
  value?:         string | null;
  onChange?:      (value: string) => void;
  placeholder?:   string;
  label?:         string;
  hint?:          string;
  error?:         string;
  disabled?:      boolean;
  required?:      boolean;
  id?:            string;
  name?:          string;
  className?:     string;
  style?:         React.CSSProperties;
  /** Largeur max du dropdown */
  dropdownWidth?: string | number;
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export const BankSelect = forwardRef<HTMLDivElement, BankSelectProps>(
function BankSelect(
  {
    options,
    value,
    onChange,
    placeholder  = 'Sélectionner…',
    label,
    hint,
    error,
    disabled     = false,
    required     = false,
    id,
    name,
    className    = '',
    style,
    dropdownWidth,
  },
  ref,
) {
  const selectId = id ?? `bk-select-${Math.random().toString(36).slice(2, 8)}`;
  const hintId   = `${selectId}-hint`;
  const errorId  = `${selectId}-error`;
  const listId   = `${selectId}-listbox`;

  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(-1);
  const triggerRef            = useRef<HTMLButtonElement>(null);
  const listRef               = useRef<HTMLUListElement>(null);

  const selected = options.find(o => o.value === value) ?? null;
  const hasError = Boolean(error);

  /* ── Fermer au clic extérieur ── */
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!(ref as React.RefObject<HTMLDivElement>)?.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, ref]);

  /* ── Focus premier élément à l'ouverture ── */
  useEffect(() => {
    if (open) {
      const idx = options.findIndex(o => o.value === value && !o.disabled);
      setFocused(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  /* ── Scroll option focused ── */
  useEffect(() => {
    if (!open || focused < 0 || !listRef.current) return;
    const el = listRef.current.children[focused] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focused, open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(i => {
        let next = i + 1;
        while (next < options.length && options[next].disabled) next++;
        return next < options.length ? next : i;
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(i => {
        let prev = i - 1;
        while (prev >= 0 && options[prev].disabled) prev--;
        return prev >= 0 ? prev : i;
      });
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focused >= 0 && !options[focused].disabled) {
        onChange?.(options[focused].value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (e.key === 'Tab') { setOpen(false); }
  }, [open, disabled, focused, options, onChange]);

  /* ══════════════════════════════════════════════════════
     RENDU
     ══════════════════════════════════════════════════════ */
  return (
    <div
      ref={ref}
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-1)', position: 'relative', ...style }}
    >
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize:   'var(--bank-text-sm)',
            fontWeight: 'var(--bank-font-medium)',
            color:      hasError ? 'var(--bank-danger)' : 'var(--bank-text-secondary)',
          }}
        >
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--bank-danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}

      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-describedby={[hint && hintId, hasError && errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={hasError ? 'true' : undefined}
        aria-required={required}
        aria-label={!label ? placeholder : undefined}
        disabled={disabled}
        data-error={hasError || undefined}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setOpen(v => !v)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          'var(--bank-space-2)',
          padding:      'var(--bank-space-3) var(--bank-space-4)',
          borderRadius: 'var(--bank-radius-md)',
          border:       `1px solid ${hasError ? 'var(--bank-danger)' : open ? 'var(--bank-accent)' : 'var(--bank-border-default)'}`,
          background:   disabled ? 'var(--bank-bg-elevated)' : 'var(--bank-bg-surface)',
          color:        selected ? 'var(--bank-text-primary)' : 'var(--bank-text-tertiary)',
          fontSize:     'var(--bank-text-sm)',
          fontWeight:   'var(--bank-font-medium)',
          cursor:       disabled ? 'not-allowed' : 'pointer',
          opacity:      disabled ? 0.55 : 1,
          transition:   'border-color var(--bank-t-fast)',
          textAlign:    'left',
          width:        '100%',
        }}
      >
        {selected?.icon && (
          <selected.icon size={16} strokeWidth={2} style={{ color: 'var(--bank-text-tertiary)', flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          style={{ flexShrink: 0, color: 'var(--bank-text-tertiary)', transition: 'transform var(--bank-t-fast)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label ?? placeholder}
          onKeyDown={handleKeyDown}
          style={{
            position:   'absolute',
            top:        '100%',
            left:       0,
            marginTop:  4,
            width:      dropdownWidth ?? '100%',
            maxHeight:  240,
            overflowY:  'auto',
            borderRadius: 'var(--bank-radius-md)',
            border:     '1px solid var(--bank-border-subtle)',
            background: 'var(--bank-bg-elevated)',
            boxShadow:  'var(--bank-shadow-lg)',
            zIndex:     50,
            listStyle:  'none',
            margin:     0,
            padding:    'var(--bank-space-1)',
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isFocus    = focused === i;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange?.(opt.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
                onMouseEnter={() => !opt.disabled && setFocused(i)}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         'var(--bank-space-2)',
                  padding:     'var(--bank-space-2) var(--bank-space-3)',
                  borderRadius: 'var(--bank-radius-sm)',
                  cursor:      opt.disabled ? 'not-allowed' : 'pointer',
                  background:  isFocus ? 'var(--bank-bg-surface)' : 'transparent',
                  color:       opt.disabled ? 'var(--bank-text-tertiary)' : isSelected ? 'var(--bank-accent)' : 'var(--bank-text-primary)',
                  fontSize:    'var(--bank-text-sm)',
                  fontWeight:  isSelected ? 'var(--bank-font-medium)' : 'var(--bank-font-normal)',
                  opacity:     opt.disabled ? 0.45 : 1,
                  transition:  'background-color var(--bank-t-fast)',
                }}
              >
                {opt.icon && (
                  <opt.icon size={15} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--bank-text-tertiary)' }} />
                )}
                <span style={{ flex: 1 }}>{opt.label}</span>
                {isSelected && (
                  <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hint && !hasError && (
        <span id={hintId} className="bk-caption" style={{ color: 'var(--bank-text-tertiary)' }}>
          {hint}
        </span>
      )}
      {hasError && (
        <span id={errorId} role="alert" style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
});
