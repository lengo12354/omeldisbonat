import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './AppDatePicker.css';

const pad = value => String(value).padStart(2, '0');
const toValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromValue = value => {
    const [year, month, day] = String(value || '').split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : new Date();
};

export default function AppDatePicker({ value, onChange, label }) {
    const [open, setOpen] = useState(false);
    const [shownMonth, setShownMonth] = useState(() => fromValue(value));
    const [position, setPosition] = useState(null);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const panelId = useId();
    const selected = fromValue(value);

    const show = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const width = 302;
        const height = 360;
        const below = window.innerHeight - rect.bottom >= height || rect.top < height;
        setPosition({ top: below ? rect.bottom + 7 : rect.top - height - 7, left: Math.max(10, Math.min(rect.left, window.innerWidth - width - 10)), width });
        setShownMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = event => {
            if (!buttonRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
        };
        const onKey = event => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
        const onWindowChange = event => {
            if (event.type === 'scroll' && panelRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onWindowChange, true);
        window.addEventListener('resize', onWindowChange);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onWindowChange, true);
            window.removeEventListener('resize', onWindowChange);
        };
    }, [open]);

    const changeMonth = amount => setShownMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    const choose = date => { onChange(toValue(date)); setOpen(false); buttonRef.current?.focus(); };
    const first = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index - offset + 1));

    return <>
        <button ref={buttonRef} type="button" className="app-date-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => open ? setOpen(false) : show()}>
            <CalendarDays size={16} /><span>{selected.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' })}</span><ChevronRight size={15} />
        </button>
        {open && position && createPortal(<div ref={panelRef} id={panelId} className="app-date-panel" role="dialog" aria-label={label} style={position}>
            <div className="app-date-nav"><button type="button" onClick={() => changeMonth(-12)} aria-label="Année précédente"><ChevronsLeft size={16} /></button><button type="button" onClick={() => changeMonth(-1)} aria-label="Mois précédent"><ChevronLeft size={16} /></button><strong>{first.toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => changeMonth(1)} aria-label="Mois suivant"><ChevronRight size={16} /></button><button type="button" onClick={() => changeMonth(12)} aria-label="Année suivante"><ChevronsRight size={16} /></button></div>
            <div className="app-date-weekdays">{['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(day => <span key={day}>{day}</span>)}</div>
            <div className="app-date-days">{days.map(date => <button key={toValue(date)} type="button" className={`${date.getMonth() !== first.getMonth() ? 'outside' : ''} ${toValue(date) === value ? 'selected' : ''} ${toValue(date) === toValue(new Date()) ? 'today' : ''}`} aria-label={date.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={toValue(date) === value} onClick={() => choose(date)}>{date.getDate()}</button>)}</div>
            <div className="app-date-footer"><button type="button" onClick={() => choose(new Date())}>Aujourd’hui</button></div>
        </div>, document.body)}
    </>;
}
