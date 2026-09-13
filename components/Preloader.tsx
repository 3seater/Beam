'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BeamMark } from './BeamMark';

export function Preloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Only show once per browser session
    if (sessionStorage.getItem('beam-loaded')) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem('beam-loaded', '1');

    const timer = setTimeout(() => setVisible(false), 1900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -32 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            background: 'radial-gradient(ellipse at 20% 0%, #6599c9 0%, transparent 50%), radial-gradient(ellipse at 95% 100%, #579dbd 0%, transparent 55%), #224568',
          }}
        >
          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ width: 80, height: 80, position: 'relative' }}
          >
            {/* Glow ring behind the mark */}
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.45, 0], scale: [0.6, 1.5, 1.8] }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.35 }}
              style={{
                position: 'absolute',
                inset: '-40%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(121,214,252,0.55) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <BeamMark sculptural className="w-full h-full" />
          </motion.div>

          {/* Wordmark */}
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
            style={{
              fontSize: '32px',
              fontWeight: 500,
              letterSpacing: '-1.5px',
              color: 'rgba(255,255,255,0.92)',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
            }}
          >
            beam
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
