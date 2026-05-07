import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Radio, Users, Box, Terminal } from 'lucide-react';

export const DebugOverlay = () => {
  const { connected, playersCount, entitiesCount, devMode } = useGameStore(
    useShallow((s) => ({
      connected: s.connected,
      playersCount: Object.keys(s.players).length,
      entitiesCount: Object.keys(s.entities).length,
      devMode: s.devMode
    }))
  );
  const [fps, setFps] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'd') {
        setShow(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let frames = 0;
    let lastTime = performance.now();
    const update = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = now;
      }
      requestAnimationFrame(update);
    };
    const handle = requestAnimationFrame(update);
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!devMode && !show) return null;

  return (
    <div className="fixed top-20 right-6 z-60 pointer-events-none select-none">
      <AnimatePresence>
        {(show || devMode) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 w-64 space-y-3 font-mono text-[10px] text-zinc-400"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5 text-zinc-100">
                <Terminal size={12} className="text-emerald-500" />
                SYSTEM DEBUG
              </span>
              <span className={fps < 30 ? 'text-red-500' : 'text-emerald-500'}>{fps} FPS</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Radio size={12} className={connected ? 'text-emerald-500' : 'text-red-500'} />
                  SOCKET
                </span>
                <span className={connected ? 'text-emerald-400' : 'text-red-500'}>
                  {connected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users size={12} />
                  PLAYERS
                </span>
                <span className="text-zinc-200">{playersCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Box size={12} />
                  ENTITIES
                </span>
                <span className="text-zinc-200">{entitiesCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity size={12} />
                  DEV MODE
                </span>
                <span className={devMode ? 'text-amber-500' : 'text-zinc-500'}>
                  {devMode ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 text-[9px] text-zinc-500 italic">
              Shift + Alt + D to toggle
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
