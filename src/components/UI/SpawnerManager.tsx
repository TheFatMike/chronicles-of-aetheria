/**
 * @file src/components/UI/SpawnerManager.tsx
 * @description A specialized editor tool for creating and managing entity spawners.
 * Allows for precise control over spawn intervals, mob types, and radii.
 * @importance Essential: Vital for populating the world with content and managing the game's challenge level.
 */
import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Users, Target, RefreshCw, RotateCcw, Activity, Zap, Shield, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';

interface SpawnerManagerProps {
  onClose: () => void;
  playerPos: [number, number, number];
  socket: any;
}

const SPAWNER_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  slime:  { bg: 'bg-green-900/40',  border: 'border-green-700/50',  text: 'text-green-400',  dot: 'bg-green-400' },
  wolf:   { bg: 'bg-orange-900/40', border: 'border-orange-700/50', text: 'text-orange-400', dot: 'bg-orange-400' },
  guard:  { bg: 'bg-blue-900/40',   border: 'border-blue-700/50',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  enemy:  { bg: 'bg-red-900/40',    border: 'border-red-700/50',    text: 'text-red-400',    dot: 'bg-red-400' },
  npc:    { bg: 'bg-blue-900/40',   border: 'border-blue-700/50',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  default:{ bg: 'bg-aetheria-900',     border: 'border-aetheria-800',     text: 'text-amber-400',  dot: 'bg-amber-400' },
};

function getSpawnerColors(spawner: any) {
  const cls = (spawner.entityClass || '').toLowerCase();
  if (cls in SPAWNER_COLORS) return SPAWNER_COLORS[cls];
  if (spawner.type === 'npc') return SPAWNER_COLORS.npc;
  if (spawner.type === 'enemy') return SPAWNER_COLORS.enemy;
  return SPAWNER_COLORS.default;
}

export const SpawnerManager: React.FC<SpawnerManagerProps> = ({ onClose, playerPos, socket }) => {
  const spawners = useGameStore(useShallow(state => Object.values(state.spawners)));
  const entities = useGameStore(useShallow(state => Object.values(state.entities)));
  const players  = useGameStore(useShallow(state => state.players));
  const currentPlayerId = useGameStore(state => state.id);
  const devMode  = useGameStore(state => state.devMode);

  const localPlayer = currentPlayerId ? players[currentPlayerId] : null;
  const isDevRole   = localPlayer?.role === 'dev';

  // Count live entities per spawner
  const entityCountMap: Record<string, number> = {};
  for (const ent of entities) {
    if (ent.spawnerId) {
      entityCountMap[ent.spawnerId] = (entityCountMap[ent.spawnerId] || 0) + 1;
    }
  }

  // Request fresh spawner list from server
  const handleRefresh = useCallback(() => {
    socket?.emit('get_spawners');
  }, [socket]);

  // Dev-only: reload spawners from worldObjects on server
  const handleReload = useCallback(() => {
    socket?.emit('request_spawner_reload');
  }, [socket]);

  // Pull spawners on mount
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const totalEntities = entities.filter(e => e.spawnerId).length;
  const activeSpawners = spawners.filter(s => (entityCountMap[s.id] || 0) > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-6 top-24 bottom-24 w-88 bg-aetheria-950/97 backdrop-blur-xl border-2 border-aetheria-800 rounded-2xl flex flex-col z-50 shadow-aetheria-lg overflow-hidden"
      style={{ width: '340px' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-aetheria-800 flex items-center justify-between bg-linear-to-r from-red-900/20 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <Target className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="font-black text-aetheria-200 uppercase tracking-wider text-sm">Realm Spawners</h2>
            <p className="text-[9px] text-aetheria-600 font-mono">SERVER MEMORY · LIVE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Refresh from server"
            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {isDevRole && (
            <button
              onClick={handleReload}
              title="Reload spawners from worldObjects (Dev)"
              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-aetheria-600 hover:text-aetheria-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-px bg-aetheria-800/40 border-b border-aetheria-800">
        <div className="bg-aetheria-950/80 p-3 text-center">
          <div className="text-lg font-black text-aetheria-200">{spawners.length}</div>
          <div className="text-[9px] text-aetheria-600 uppercase font-bold">Spawners</div>
        </div>
        <div className="bg-aetheria-950/80 p-3 text-center">
          <div className="text-lg font-black text-green-400">{activeSpawners}</div>
          <div className="text-[9px] text-aetheria-600 uppercase font-bold">Active</div>
        </div>
        <div className="bg-aetheria-950/80 p-3 text-center">
          <div className="text-lg font-black text-amber-400">{totalEntities}</div>
          <div className="text-[9px] text-aetheria-600 uppercase font-bold">Entities</div>
        </div>
      </div>

      {/* Spawner List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {spawners.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-aetheria-900 border-2 border-aetheria-800 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-aetheria-600" />
            </div>
            <div className="text-aetheria-600 italic text-sm">No spawners received from server.</div>
            <button
              onClick={handleRefresh}
              className="mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        )}

        <AnimatePresence>
          {spawners.map((spawner, i) => {
            const colors   = getSpawnerColors(spawner);
            const liveCount  = entityCountMap[spawner.id] || 0;
            const maxCount   = spawner.maxEntities || 0;
            const fillPct    = maxCount > 0 ? (liveCount / maxCount) * 100 : 0;
            const isFull     = liveCount >= maxCount;
            const distX      = spawner.pos[0] - playerPos[0];
            const distZ      = spawner.pos[2] - playerPos[2];
            const dist       = Math.sqrt(distX * distX + distZ * distZ).toFixed(0);

            return (
              <motion.div
                key={spawner.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-xl border-2 p-3 space-y-2 ${colors.bg} ${colors.border}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isFull ? 'bg-green-400 shadow-[0_0_4px_#4ade80]' : colors.dot} ${!isFull ? 'animate-pulse' : ''}`} />
                    <span className={`font-bold text-xs uppercase truncate ${colors.text}`}>{spawner.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-mono text-aetheria-600 bg-black/30 px-1.5 py-0.5 rounded">
                      LVL {spawner.level}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${spawner.type === 'npc' ? 'border-blue-500/40 text-blue-400 bg-blue-900/20' : 'border-red-500/40 text-red-400 bg-red-900/20'}`}>
                      {spawner.type}
                    </span>
                  </div>
                </div>

                {/* Entity fill bar */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-aetheria-600 font-bold uppercase flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5" /> Entities
                    </span>
                    <span className="text-[9px] font-mono text-aetheria-400">{liveCount} / {maxCount}</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isFull ? 'bg-green-500' : 'bg-amber-500'}`}
                      animate={{ width: `${fillPct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-1.5 text-[9px] text-aetheria-600">
                  <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-1">
                    <Users className="w-2.5 h-2.5" />
                    <span className="truncate">{spawner.entityClass}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-1">
                    <Zap className="w-2.5 h-2.5" />
                    <span>R={spawner.spawnRadius}u · T={spawner.respawnTime}s</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-1 col-span-2">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span className="font-mono truncate">
                      {spawner.pos[0].toFixed(1)}, {spawner.pos[1].toFixed(1)}, {spawner.pos[2].toFixed(1)}
                    </span>
                    <span className="ml-auto text-[#6b5a4a] shrink-0">{dist}m away</span>
                  </div>
                </div>

                {/* Spawner ID */}
                <div className="text-[8px] font-mono text-aetheria-800 truncate">{spawner.id}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 bg-black/20 border-t border-aetheria-800 space-y-2">
        <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
          <Shield className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[9px] text-aetheria-600 leading-relaxed">
            Spawners are managed via the <span className="text-amber-400 font-bold">World Sculptor</span> (bottom-right). Place <span className="text-amber-400">spawner_slime</span>, <span className="text-amber-400">spawner_wolf</span>, or <span className="text-amber-400">spawner_guard</span> objects, then export &amp; restart the server.
          </p>
        </div>
        {devMode && (
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-aetheria-900 hover:bg-aetheria-800 text-amber-400 border border-amber-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Sync
            </button>
            {isDevRole && (
              <button
                onClick={handleReload}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
              >
                <RotateCcw className="w-3 h-3" /> Reload
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
