import React, { useState, useEffect, useRef, useCallback } from 'react';
import mascotImg from '../../../imgs/ghost_mascot.png';

/**
 * ============================================================================
 * TUNABLE GHOST MASCOT CONSTANTS
 * ============================================================================
 */
// Size specifications (responsive widths in pixels)
export const GHOST_SIZE_DESKTOP_PX = 60; // Desktop size: 48 to 72px
export const GHOST_SIZE_MOBILE_PX = 46;  // Mobile size: 40 to 56px

// Speed & motion (pixels per second)
export const MIN_SPEED_PX_SEC = 35;
export const MAX_SPEED_PX_SEC = 55;
export const PAUSE_MIN_MS = 600;
export const PAUSE_MAX_MS = 1600;

// Bobbing & hovering
export const BOB_AMPLITUDE_PX = 8; // vertical sine-wave float: 6 to 10px
export const BOB_FREQUENCY = 0.0028; // cycles per ms (gentle hovering tempo)
export const MAX_TILT_DEG = 2.5; // slight tilt in direction of travel: 1 to 3 degrees

// Orientation: Set FACES_RIGHT_BY_DEFAULT = true so it faces right when moving right, and flips left when moving left.
export const FACES_RIGHT_BY_DEFAULT = true;

// Vanish & Respawn timings
export const VANISH_DURATION_MS = 600; // 500 to 700ms
export const RESPAWN_DELAY_MS = 10000; // exactly 10 seconds
export const APPEAR_DURATION_MS = 1000; // ~1 second gradual fade-in

// Viewport boundary margin (pixels from edges)
export const VIEWPORT_MARGIN_PX = 24;

/**
 * Synthesize a soft, tiny, playful 8-bit / spooky "boo!" sound using the Web Audio API.
 * Zero external audio files or network requests required.
 */
function playTinyBooSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    masterGain.connect(ctx.destination);

    // Warm fundamental oscillator (spooky descending "booo-uu")
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now); // Start at A4
    osc1.frequency.exponentialRampToValueAtTime(260, now + 0.18);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.5);

    // Subtle ethereal sub-harmonic
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.5);

    // Bandpass filter to soften timbre
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.55);
    osc2.stop(now + 0.55);

    // Clean up AudioContext once playback concludes
    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch {
        // Ignore
      }
    }, 800);
  } catch {
    // Gracefully handle browsers with audio policy restrictions
  }
}

export const GhostMascot: React.FC = () => {
  // Current position and orientation state
  const [posX, setPosX] = useState<number>(100);
  const [posY, setPosY] = useState<number>(180);
  const [facingRight, setFacingRight] = useState<boolean>(true);
  const [tiltDeg, setTiltDeg] = useState<number>(0);
  const [bobOffset, setBobOffset] = useState<number>(0);

  // Lifecycle states: 'roaming' | 'vanishing' | 'hidden' | 'appearing'
  const [mascotState, setMascotState] = useState<'roaming' | 'vanishing' | 'hidden' | 'appearing'>('roaming');

  // Animation and physics refs
  const posRef = useRef({ x: 100, y: 180 });
  const startPosRef = useRef({ x: 100, y: 180 });
  const targetPosRef = useRef({ x: 200, y: 250 });
  const moveStartTimeRef = useRef<number>(0);
  const moveDurationRef = useRef<number>(3000);
  const isMovingRef = useRef<boolean>(false);
  const pauseEndTimeRef = useRef<number>(0);
  const reqFrameRef = useRef<number | null>(null);
  const respawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive mascot size
  const [mascotSize, setMascotSize] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 775) {
      return GHOST_SIZE_MOBILE_PX;
    }
    return GHOST_SIZE_DESKTOP_PX;
  });

  // Calculate random target within safe viewport bounds
  const getSafeRandomPoint = useCallback((currentW: number, currentH: number, size: number) => {
    const maxX = Math.max(VIEWPORT_MARGIN_PX, currentW - size - VIEWPORT_MARGIN_PX);
    const maxY = Math.max(VIEWPORT_MARGIN_PX, currentH - size - VIEWPORT_MARGIN_PX);

    const x = Math.round(VIEWPORT_MARGIN_PX + Math.random() * (maxX - VIEWPORT_MARGIN_PX));
    const y = Math.round(VIEWPORT_MARGIN_PX + Math.random() * (maxY - VIEWPORT_MARGIN_PX));

    return { x, y };
  }, []);

  // Pick next random drift target
  const pickNewTarget = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const currentX = posRef.current.x;
    const currentY = posRef.current.y;
    const target = getSafeRandomPoint(w, h, mascotSize);

    // Compute travel distance
    const dx = target.x - currentX;
    const dy = target.y - currentY;
    const distance = Math.hypot(dx, dy);

    // Random speed between MIN and MAX
    const speed = MIN_SPEED_PX_SEC + Math.random() * (MAX_SPEED_PX_SEC - MIN_SPEED_PX_SEC);
    const duration = Math.max(1200, (distance / speed) * 1000);

    // Determine facing direction strictly once per move:
    // If target is to the right, it travels right; otherwise left.
    const isMovingRight = dx >= 0;
    setFacingRight(isMovingRight);

    // Slight organic tilt (1 to 2.5 deg) in direction of travel
    const tilt = isMovingRight ? Math.min(MAX_TILT_DEG, Math.abs(dy / 80)) : -Math.min(MAX_TILT_DEG, Math.abs(dy / 80));
    setTiltDeg(tilt);

    startPosRef.current = { x: currentX, y: currentY };
    targetPosRef.current = target;
    moveStartTimeRef.current = performance.now();
    moveDurationRef.current = duration;
    isMovingRef.current = true;
  }, [mascotSize, getSafeRandomPoint]);

  // Handle window resizing safely
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const newSize = w <= 775 ? GHOST_SIZE_MOBILE_PX : GHOST_SIZE_DESKTOP_PX;
      setMascotSize(newSize);

      // Clamp position inside new bounds
      const maxX = Math.max(VIEWPORT_MARGIN_PX, w - newSize - VIEWPORT_MARGIN_PX);
      const maxY = Math.max(VIEWPORT_MARGIN_PX, h - newSize - VIEWPORT_MARGIN_PX);

      posRef.current.x = Math.min(Math.max(VIEWPORT_MARGIN_PX, posRef.current.x), maxX);
      posRef.current.y = Math.min(Math.max(VIEWPORT_MARGIN_PX, posRef.current.y), maxY);

      setPosX(posRef.current.x);
      setPosY(posRef.current.y);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main animation loop
  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let isTabVisible = true;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && isMovingRef.current) {
        // Reset move start time on unpause to avoid jarring teleportation jumps
        moveStartTimeRef.current = performance.now();
        startPosRef.current = { ...posRef.current };
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial random placement
    if (typeof window !== 'undefined') {
      const initial = getSafeRandomPoint(window.innerWidth, window.innerHeight, mascotSize);
      posRef.current = initial;
      startPosRef.current = initial;
      setPosX(initial.x);
      setPosY(initial.y);
      pickNewTarget();
    }

    const animate = (time: number) => {
      if (isTabVisible && mascotState === 'roaming') {
        // Continuous organic vertical bobbing
        const bob = Math.sin(time * BOB_FREQUENCY) * BOB_AMPLITUDE_PX;
        setBobOffset(bob);

        if (!prefersReducedMotion) {
          if (isMovingRef.current) {
            const elapsed = time - moveStartTimeRef.current;
            const progress = Math.min(1, elapsed / moveDurationRef.current);

            // Smooth organic easing (easeInOutCubic)
            const ease = progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const curX = startPosRef.current.x + (targetPosRef.current.x - startPosRef.current.x) * ease;
            const curY = startPosRef.current.y + (targetPosRef.current.y - startPosRef.current.y) * ease;

            posRef.current = { x: curX, y: curY };
            setPosX(curX);
            setPosY(curY);

            if (progress >= 1) {
              isMovingRef.current = false;
              // Schedule pause between moves
              const pause = PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
              pauseEndTimeRef.current = time + pause;
              setTiltDeg(0);
            }
          } else if (time >= pauseEndTimeRef.current) {
            pickNewTarget();
          }
        }
      }

      reqFrameRef.current = requestAnimationFrame(animate);
    };

    reqFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqFrameRef.current) cancelAnimationFrame(reqFrameRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mascotState, mascotSize, getSafeRandomPoint, pickNewTarget]);

  // Click-to-vanish handler
  const handleClickMascot = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    // Prevent double-clicks during vanish or hidden phases
    if (mascotState !== 'roaming' && mascotState !== 'appearing') {
      return;
    }

    // Play tiny playful "boo" sound
    playTinyBooSound();

    // Trigger vanishing state (smooth fade out + scale down + slight upward drift)
    setMascotState('vanishing');

    if (respawnTimeoutRef.current) clearTimeout(respawnTimeoutRef.current);
    if (appearTimeoutRef.current) clearTimeout(appearTimeoutRef.current);

    // After fade-out duration, hide and pause movement completely
    respawnTimeoutRef.current = setTimeout(() => {
      setMascotState('hidden');

      // After exactly 10 seconds, respawn at a fresh random position
      respawnTimeoutRef.current = setTimeout(() => {
        if (typeof window !== 'undefined') {
          const freshPt = getSafeRandomPoint(window.innerWidth, window.innerHeight, mascotSize);
          posRef.current = freshPt;
          startPosRef.current = freshPt;
          setPosX(freshPt.x);
          setPosY(freshPt.y);
        }

        // Gradually fade-in and scale-up (around 1 second)
        setMascotState('appearing');

        appearTimeoutRef.current = setTimeout(() => {
          setMascotState('roaming');
          pickNewTarget();
        }, APPEAR_DURATION_MS);
      }, RESPAWN_DELAY_MS);
    }, VANISH_DURATION_MS);
  };

  // Teardown timers on unmount
  useEffect(() => {
    return () => {
      if (respawnTimeoutRef.current) clearTimeout(respawnTimeoutRef.current);
      if (appearTimeoutRef.current) clearTimeout(appearTimeoutRef.current);
    };
  }, []);

  // When completely hidden, render nothing to free up pointer events and rendering
  if (mascotState === 'hidden') {
    return null;
  }

  // Determine horizontal flip based on travel direction and default face
  // If FACES_RIGHT_BY_DEFAULT is true: facingRight -> 1, facingLeft -> -1
  // If FACES_RIGHT_BY_DEFAULT is false (faces left originally): facingRight -> -1, facingLeft -> 1
  const scaleX = FACES_RIGHT_BY_DEFAULT ? (facingRight ? 1 : -1) : (facingRight ? -1 : 1);

  // Transition and opacity states
  const isVanishing = mascotState === 'vanishing';
  const isAppearing = mascotState === 'appearing';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: `${mascotSize}px`,
        height: `${mascotSize}px`,
        // Coordinate placement via hardware-accelerated transform
        transform: `translate3d(${posX}px, ${posY + bobOffset}px, 0)`,
        zIndex: 99999,
        pointerEvents: isVanishing ? 'none' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        willChange: 'transform, opacity',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="FileNotFound Ghost Mascot - Click to play"
        onClick={handleClickMascot}
        onTouchEnd={handleClickMascot}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClickMascot(e as unknown as React.MouseEvent);
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          cursor: isVanishing ? 'default' : 'pointer',
          // Mirroring flip & travel tilt applied to inner wrapper
          transform: `scaleX(${scaleX}) rotate(${tiltDeg}deg) ${
            isVanishing ? 'scale(0.65) translateY(-28px)' : isAppearing ? 'scale(1)' : 'scale(1)'
          }`,
          opacity: isVanishing ? 0 : isAppearing ? 1 : 0.95,
          transition: isVanishing
            ? `opacity ${VANISH_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${VANISH_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
            : isAppearing
            ? `opacity ${APPEAR_DURATION_MS}ms cubic-bezier(0, 0, 0.2, 1), transform ${APPEAR_DURATION_MS}ms cubic-bezier(0, 0, 0.2, 1)`
            : 'transform 200ms ease-out',
          willChange: 'transform, opacity, filter',
          // Atmospheric drop shadow underneath the ghost
          filter: 'drop-shadow(0 10px 14px rgba(0, 0, 0, 0.25)) drop-shadow(0 2px 5px rgba(0, 0, 0, 0.15))',
        }}
      >
        <img
          src={mascotImg}
          alt="FileNotFound Ghost Mascot"
          draggable="false"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  );
};
