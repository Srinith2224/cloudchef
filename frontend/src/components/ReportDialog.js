import React, { useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { api } from '../api/client';
import { useUI } from '../context/UIContext';

const REASONS = ['Spam or advertising', 'Not a real recipe', 'Offensive content', 'Copied from someone else', 'Something else'];

export default function ReportDialog({ open, onClose, recipe }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useUI();

  const submit = async () => {
    setBusy(true);
    try {
      const text = details.trim() ? `${reason}: ${details.trim()}` : reason;
      const res = await api('/reports', { method: 'POST', body: { reportedItem: recipe._id, type: 'recipe', reason: text } });
      toast(res.message);
      onClose();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report this recipe" size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={busy}>{busy ? <Spinner /> : 'Send report'}</button>
        </>
      )}
    >
      <div className="stack">
        <div className="report__reasons" role="radiogroup" aria-label="Reason">
          {REASONS.map((r) => (
            <label key={r} className={`report__reason ${reason === r ? 'is-active' : ''}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="report-details">Details (optional)</label>
          <textarea id="report-details" className="textarea" rows={3} maxLength={400} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything that helps the admin understand" />
        </div>
      </div>
    </Modal>
  );
}
