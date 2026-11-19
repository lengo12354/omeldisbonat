import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import './AppSelect.css';

export default function AppSelect({ value, onChange, options, label, icon: Icon, className = '', compact = false }) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const optionRefs = useRef([]);
    const menuId = useId();
    const selected = options.find(option => String(option.value) === String(value)) || options[0];

    const showMenu = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const width = Math.max(rect.width, 180);
        const height = Math.min(options.length * 38 + 12, 260);
        const below = window.innerHeight - rect.bottom >= height || rect.top < height;
        setPosition({ top: below ? rect.bottom + 6 : rect.top - height - 6, left: Math.min(rect.left, window.innerWidth - width - 12), width });
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return undefined;
        const selectedIndex = Math.max(0, options.findIndex(option => String(option.value) === String(value)));
        optionRefs.current[selectedIndex]?.focus();
        const onPointerDown = event => {
            if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
        };
        const onKeyDown = event => {
            if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
        };
        const onWindowChange = event => {
            if (event.type === 'scroll' && menuRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onWindowChange);
        window.addEventListener('scroll', onWindowChange, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onWindowChange);
            window.removeEventListener('scroll', onWindowChange, true);
        };
    }, [open, options, value]);

    const choose = option => {
        onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
    };

    return <>
        <button ref={triggerRef} type="button" className={`app-select ${compact ? 'app-select--compact' : ''} ${className}`} onClick={() => open ? setOpen(false) : showMenu()} onKeyDown={event => { if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); showMenu(); } }} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}>
            {Icon && <Icon size={16} aria-hidden="true" />}
            <span>{selected?.label || ''}</span>
            <ChevronDown size={15} aria-hidden="true" />
        </button>
        {open && position && createPortal(<div ref={menuRef} id={menuId} className="app-select-menu" role="menu" aria-label={label} style={position}>
            {options.map((option, index) => <button key={String(option.value)} ref={element => { optionRefs.current[index] = element; }} type="button" role="menuitemradio" aria-checked={String(option.value) === String(value)} onClick={() => choose(option)} onKeyDown={event => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); optionRefs.current[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus(); }
                if (event.key === 'Home') { event.preventDefault(); optionRefs.current[0]?.focus(); }
                if (event.key === 'End') { event.preventDefault(); optionRefs.current[options.length - 1]?.focus(); }
            }}>{option.label}</button>)}
        </div>, document.body)}
    </>;
}
