'use client';

import { useState, useId, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  question: string;
  answer: string;
}

export interface AccordionProps {
  items: AccordionItem[];
  mode?: 'single' | 'multiple';
  className?: string;
}

const contentV = {
  collapsed: { height: 0, opacity: 0 },
  open: { height: 'auto', opacity: 1 },
};

const transition = { duration: 0.30, ease: [0.22, 1, 0.36, 1] as const };

export function Accordion({ items, mode = 'single', className = '' }: AccordionProps) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  const uid = useId();

  function toggle(i: number) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); }
      else { if (mode === 'single') next.clear(); next.add(i); }
      return next;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); }
  }

  return (
    <div className={`divide-y divide-white/10 ${className}`} role="list">
      {items.map((item, i) => {
        const isOpen = openSet.has(i);
        const triggerId = `${uid}-t-${i}`;
        const contentId = `${uid}-c-${i}`;

        return (
          <div key={i} role="listitem">
            <button
              id={triggerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => toggle(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="flex w-full items-center justify-between gap-4 py-4 px-1 text-left
                         text-white/80 font-normal text-lg tracking-tight
                         hover:text-white transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
            >
              <span>{item.question}</span>
              <motion.span
                aria-hidden="true"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={transition}
                className="shrink-0 text-white/50"
              >
                <ChevronDown size={18} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={contentId}
                  role="region"
                  aria-labelledby={triggerId}
                  key={contentId}
                  variants={contentV}
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  transition={transition}
                  style={{ overflow: 'hidden' }}
                >
                  <p className="px-1 pb-5 pt-1 text-white/65 text-base leading-relaxed">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
