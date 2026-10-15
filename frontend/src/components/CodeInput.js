import React, { useRef } from 'react';

/** Six separate boxes for a verification code. Supports paste and backspace. */
export default function CodeInput({ value, onChange, length = 6, autoFocus = true, invalid = false }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const setAt = (index, char) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join('').slice(0, length));
  };

  const onInput = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return setAt(index, '');
    if (raw.length > 1) {
      // Pasted or autofilled several digits
      const merged = (digits.slice(0, index).join('') + raw).slice(0, length);
      onChange(merged);
      refs.current[Math.min(merged.length, length - 1)]?.focus();
      return undefined;
    }
    setAt(index, raw);
    if (index < length - 1) refs.current[index + 1]?.focus();
    return undefined;
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      setAt(index - 1, '');
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className={`code-input ${invalid ? 'is-invalid' : ''}`} role="group" aria-label="Verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="code-input__box"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={digit}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
