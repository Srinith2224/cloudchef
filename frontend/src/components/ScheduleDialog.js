import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import Modal from './Modal';
import Icon from './Icon';
import Spinner from './Spinner';
import { api } from '../api/client';
import { toDateKey } from '../lib/format';
import { useUI } from '../context/UIContext';

const MEALS = [
  { id: 'Breakfast', icon: 'egg_alt' },
  { id: 'Lunch', icon: 'lunch_dining' },
  { id: 'Dinner', icon: 'dinner_dining' },
  { id: 'Snack', icon: 'cookie' }
];

const defaultMeal = () => {
  const h = new Date().getHours();
  if (h < 10) return 'Breakfast';
  if (h < 15) return 'Lunch';
  return 'Dinner';
};

/** Pick a day (next two weeks as chips, or any date) and a meal slot. */
export default function ScheduleDialog({ open, onClose, recipe, onScheduled }) {
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const [date, setDate] = useState(toDateKey(today));
  const [meal, setMeal] = useState(defaultMeal);
  const [busy, setBusy] = useState(false);
  const { toast } = useUI();
  const navigate = useNavigate();

  const save = async () => {
    setBusy(true);
    try {
      await api('/calendar', { method: 'POST', body: { recipeId: recipe._id, date, mealTime: meal } });
      const d = new Date(`${date}T12:00:00`);
      const when = isToday(d) ? 'today' : isTomorrow(d) ? 'tomorrow' : format(d, 'EEE d MMM');
      toast(`Added to ${meal.toLowerCase()} ${when}`, 'success', { action: { label: 'View plan', onClick: () => navigate('/planner') } });
      onScheduled?.();
      onClose();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add to meal plan" size="md"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? <Spinner /> : <><Icon name="event_available" />Add to plan</>}
          </button>
        </>
      )}
    >
      <p className="muted small" style={{ marginBottom: 16 }}>{recipe?.title}</p>
      <div className="schedule__label">Day</div>
      <div className="schedule__days">
        {days.map((d) => {
          const key = toDateKey(d);
          return (
            <button key={key} type="button" className={`schedule__day ${date === key ? 'is-active' : ''}`} onClick={() => setDate(key)} aria-pressed={date === key}>
              <span>{isToday(d) ? 'Today' : format(d, 'EEE')}</span>
              <strong>{format(d, 'd')}</strong>
              <span>{format(d, 'MMM')}</span>
            </button>
          );
        })}
      </div>
      <label className="schedule__other">
        <span>Or pick another date</span>
        <input type="date" className="input" value={date} min={toDateKey(today)} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>

      <div className="schedule__label">Meal</div>
      <div className="schedule__meals">
        {MEALS.map((m) => (
          <button key={m.id} type="button" className={`schedule__meal ${meal === m.id ? 'is-active' : ''}`} onClick={() => setMeal(m.id)} aria-pressed={meal === m.id}>
            <Icon name={m.icon} />{m.id}
          </button>
        ))}
      </div>
    </Modal>
  );
}
