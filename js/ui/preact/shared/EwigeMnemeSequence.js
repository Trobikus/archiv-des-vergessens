import { h, useState, useEffect } from '../setup.js';

export function EwigeMnemeSequence({ dominantPath, lang = 'de', onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Phase 0: Fade in overlay
    const t1 = setTimeout(() => setPhase(1), 500);
    // Phase 1: Core pulsates + Ash rain
    const t2 = setTimeout(() => setPhase(2), 2500);
    // Phase 2: Character dissolve starts
    const t3 = setTimeout(() => setPhase(3), 6000);
    // Phase 3: Stamp Seal appears
    const t4 = setTimeout(() => setPhase(4), 8500);
    // Phase 4: Text disappears, seal fades, complete
    const t5 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  // Text changes per phase
  let text = '';
  if (phase >= 1 && phase < 3) {
    text = lang === 'de' ? 'Das Archiv vibriert...' : 'The archive resonates...';
  } else if (phase >= 3) {
    text = lang === 'de' ? 'Die Mneme verewigt sich.' : 'The Mneme immortalizes itself.';
  }

  // Path specific classes
  const pathClass = dominantPath ? `path-${dominantPath}` : 'path-neutral';

  return h('div', { 
    class: `prestige-sequence-container ${pathClass}`,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      opacity: phase >= 0 ? 1 : 0,
      transition: 'opacity 1s ease'
    }
  }, [
    // Background Ambient
    h('div', { class: 'path-ambient-overlay' }),
    
    // Ash rain
    (phase >= 1) && h('div', { class: 'ash-rain' }),

    // Center content
    h('div', { 
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2
      }
    }, [
      // Core Character / Entity (Dissolves)
      (phase >= 1 && phase < 4) && h('div', { 
        class: phase >= 2 ? 'character-dissolve' : '',
        style: {
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'var(--color-primary, #d4af37)',
          boxShadow: '0 0 60px var(--color-primary-glow, rgba(212,175,55,0.6))',
          marginBottom: '3rem',
          transition: 'all 2s ease'
        }
      }),

      // Dramatic Text
      h('div', {
        class: 'cinzel glow-text',
        style: {
          fontSize: '2rem',
          opacity: (phase >= 1 && phase < 4) ? 1 : 0,
          transition: 'opacity 1s ease',
          textAlign: 'center',
          letterSpacing: '2px',
          marginBottom: '2rem',
          color: 'var(--color-primary, #fff)'
        }
      }, text),

      // Prestige Seal
      (phase >= 3) && h('div', {
        class: 'prestige-seal cinzel',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: '-50%',
          marginTop: '-100px',
          width: '100%',
          textAlign: 'center'
        }
      }, lang === 'de' ? 'VEREWIGUNG' : 'ETERNITY')
    ])
  ]);
}
