import { useEffect } from 'react';

export default function useScrollReveal(sectionRef, contentVersion) {
  useEffect(() => {
    const section = sectionRef.current;
    const motion = window.matchMedia?.('(prefers-reduced-motion: no-preference)');
    if (!section || !motion) return undefined;

    const blocks = Array.from(section.querySelectorAll('[data-scroll-reveal-block]'));
    let frame = 0;

    function update() {
      frame = 0;
      if (!motion.matches) {
        section.removeAttribute('data-scroll-reveal');
        blocks.forEach(block => block.style.removeProperty('--reveal-progress'));
        return;
      }

      const viewport = window.innerHeight;
      // Measure stationary outer elements so rotating text cannot affect progress.
      const positions = blocks.map(block => block.getBoundingClientRect().top);
      blocks.forEach((block, index) => {
        const progress = Math.min(1, Math.max(0, (viewport * 0.94 - positions[index]) / (viewport * 0.34)));
        const eased = progress * progress * (3 - 2 * progress);
        block.style.setProperty('--reveal-progress', eased.toFixed(4));
      });
      section.setAttribute('data-scroll-reveal', 'true');
    }

    function queueUpdate() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    queueUpdate();
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    motion.addEventListener?.('change', queueUpdate);
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(queueUpdate) : null;
    resize?.observe(section);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      motion.removeEventListener?.('change', queueUpdate);
      resize?.disconnect();
      section.removeAttribute('data-scroll-reveal');
      blocks.forEach(block => block.style.removeProperty('--reveal-progress'));
    };
  }, [sectionRef, contentVersion]);
}
