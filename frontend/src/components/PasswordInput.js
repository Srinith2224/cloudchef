import React, { useState } from 'react';
import Icon from './Icon';

export default function PasswordInput({ id, value, onChange, placeholder, autoComplete = 'current-password', ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group">
      <Icon name="lock" />
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{ paddingRight: 52 }}
        {...rest}
      />
      <span className="input-group__end">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'visibility_off' : 'visibility'} />
        </button>
      </span>
    </div>
  );
}
