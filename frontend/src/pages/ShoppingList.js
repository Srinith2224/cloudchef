import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Page, { PageHeader } from '../components/Page';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { api } from '../api/client';
import { useUI } from '../context/UIContext';
import { UNITS, prettyNumber, unitLabel } from '../lib/format';
import '../styles/pages/lists.css';

const stepFor = (unit) => (['g', 'ml'].includes(unit) ? 50 : ['kg', 'l'].includes(unit) ? 0.5 : 1);

function Item({ item, onToggle, onQuantity, onDelete }) {
  const step = stepFor(item.unit);
  return (
    <motion.li layout className={`sl-item ${item.checked ? 'is-checked' : ''}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30, transition: { duration: 0.16 } }}>
      <button type="button" className="sl-item__check" onClick={() => onToggle(item)} aria-pressed={item.checked} aria-label={item.checked ? `Move ${item.ingredient} back to the list` : `Mark ${item.ingredient} as bought`}>
        <Icon name="check" />
      </button>
      <div className="sl-item__main">
        <span className="sl-item__name">{item.ingredient}</span>
        <span className="sl-item__qty">{prettyNumber(item.quantity)} {unitLabel(item.unit, item.quantity)}</span>
      </div>
      {!item.checked && (
        <div className="sl-item__stepper">
          <button type="button" className="icon-btn" onClick={() => onQuantity(item, Math.max(step, item.quantity - step))} disabled={item.quantity <= step} aria-label="Less"><Icon name="remove" /></button>
          <button type="button" className="icon-btn" onClick={() => onQuantity(item, item.quantity + step)} aria-label="More"><Icon name="add" /></button>
        </div>
      )}
      <a className="icon-btn sl-item__buy" href={`https://www.swiggy.com/instamart/search?query=${encodeURIComponent(item.ingredient)}`} target="_blank" rel="noopener noreferrer" aria-label={`Buy ${item.ingredient} on Instamart`} title="Buy on Instamart">
        <Icon name="storefront" />
      </a>
      <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(item)} aria-label={`Remove ${item.ingredient}`}><Icon name="close" /></button>
    </motion.li>
  );
}

export default function ShoppingList() {
  const { toast, confirm } = useUI();
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api('/cart').then((d) => setItems(d.items)).catch((err) => { setItems([]); toast(err.message, 'error'); });
  }, [toast]);

  const sync = async (request, optimistic) => {
    const before = items;
    if (optimistic) setItems(optimistic);
    try {
      const data = await request();
      setItems(data.items);
    } catch (err) {
      setItems(before);
      toast(err.message, 'error');
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await sync(() => api('/cart/add', { method: 'POST', body: { ingredient: name.trim(), quantity: qty || 1, unit } }));
    setName('');
    setQty('1');
    setUnit('');
    setAdding(false);
    document.getElementById('sl-name')?.focus();
  };

  const toggle = (item) => sync(
    () => api('/cart/update', { method: 'POST', body: { ingredientId: item._id, checked: !item.checked } }),
    items.map((i) => (i._id === item._id ? { ...i, checked: !i.checked } : i))
  );
  const setQuantity = (item, quantity) => sync(
    () => api('/cart/update', { method: 'POST', body: { ingredientId: item._id, quantity } }),
    items.map((i) => (i._id === item._id ? { ...i, quantity } : i))
  );
  const remove = (item) => sync(
    () => api('/cart/delete', { method: 'DELETE', body: { ingredientId: item._id } }),
    items.filter((i) => i._id !== item._id)
  );
  const clear = async (onlyChecked) => {
    if (!onlyChecked) {
      const ok = await confirm({ title: 'Clear the whole list?', message: 'Every item will be removed.', confirmLabel: 'Clear list', danger: true });
      if (!ok) return;
    }
    sync(() => api('/cart/clear', { method: 'DELETE', body: { onlyChecked } }), onlyChecked ? items.filter((i) => !i.checked) : []);
  };

  const share = async () => {
    const text = `Shopping list\n${toBuy.map((i) => `• ${i.ingredient} – ${prettyNumber(i.quantity)} ${unitLabel(i.unit, i.quantity)}`.trim()).join('\n')}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Shopping list', text });
      else { await navigator.clipboard.writeText(text); toast('List copied. Paste it anywhere.'); }
    } catch { /* closed */ }
  };

  const toBuy = useMemo(() => (items || []).filter((i) => !i.checked), [items]);
  const inBasket = useMemo(() => (items || []).filter((i) => i.checked), [items]);

  return (
    <Page title="Shopping list" className="sl">
      <PageHeader
        title="Shopping list"
        subtitle={items?.length ? `${toBuy.length} to buy${inBasket.length ? `, ${inBasket.length} in the basket` : ''}.` : 'Add items yourself, or send ingredients from any recipe.'}
        actions={toBuy.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={share}><Icon name="ios_share" />Share list</button>}
      />

      <form className="sl-add" onSubmit={add}>
        <input id="sl-name" className="input sl-add__name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item, e.g. Tomatoes" aria-label="Item name" maxLength={80} />
        <input className="input sl-add__qty" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" aria-label="Quantity" />
        <select className="select sl-add__unit" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
          <option value="">unit</option>
          {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || adding}>{adding ? <Spinner /> : <><Icon name="add" />Add</>}</button>
      </form>

      {!items ? (
        <div className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 60, borderRadius: 16 }} />)}</div>
      ) : !items.length ? (
        <EmptyState icon="shopping_basket" title="Your list is empty" action={<Link to="/explore" className="btn btn-primary"><Icon name="travel_explore" />Pick a recipe</Link>}>
          Open any recipe and tap “Add all to shopping list”, or type an item above.
        </EmptyState>
      ) : (
        <>
          {toBuy.length > 0 ? (
            <ul className="sl-list">
              <AnimatePresence initial={false}>
                {toBuy.map((item) => <Item key={item._id} item={item} onToggle={toggle} onQuantity={setQuantity} onDelete={remove} />)}
              </AnimatePresence>
            </ul>
          ) : (
            <div className="notice notice--success sl-done"><Icon name="task_alt" />Everything is in the basket. Nice shopping.</div>
          )}

          {inBasket.length > 0 && (
            <section className="sl-basket">
              <div className="sl-basket__head">
                <h2>In the basket</h2>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => clear(true)}><Icon name="delete_sweep" />Remove these</button>
              </div>
              <ul className="sl-list">
                <AnimatePresence initial={false}>
                  {inBasket.map((item) => <Item key={item._id} item={item} onToggle={toggle} onQuantity={setQuantity} onDelete={remove} />)}
                </AnimatePresence>
              </ul>
            </section>
          )}

          <button type="button" className="btn btn-quiet btn-sm sl-clear" onClick={() => clear(false)}><Icon name="delete" />Clear whole list</button>
        </>
      )}
    </Page>
  );
}
