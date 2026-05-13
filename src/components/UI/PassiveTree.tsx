/**
 * @file src/components/UI/PassiveTree.tsx
 * @description Renders the interactive passive skill tree for the player's class.
 * Allows allocating passive points to unlock stat bonuses and combat modifiers.
 */
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Target, Zap, Shield, Heart, Brain, ScrollText } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { getClassPassives } from "@shared/data/passives";
import { PassiveNode, Character } from '@shared/types';

interface PassiveTreeProps {
  character: Character;
  onClose: () => void;
  onAllocate?: (nodeId: string) => void;
}

export const PassiveTree = ({ character, onClose, onAllocate }: PassiveTreeProps) => {
  const nodes = useMemo(() => getClassPassives(character.class), [character.class]);
  const allocated = character.passives || {};
  const points = character.passivePoints || 0;

  const canAllocate = (node: PassiveNode) => {
    if (points <= 0) return false;
    const currentPoints = allocated[node.id] || 0;
    if (currentPoints >= node.maxPoints) return false;

    // Check dependencies
    if (node.dependencies && node.dependencies.length > 0) {
      return node.dependencies.every(depId => {
        const depNode = nodes.find(n => n.id === depId);
        if (!depNode) return true;
        return (allocated[depId] || 0) >= depNode.maxPoints;
      });
    }

    return true;
  };

  const isUnlocked = (node: PassiveNode) => {
    if (!node.dependencies || node.dependencies.length === 0) return true;
    return node.dependencies.every(depId => {
      const depNode = nodes.find(n => n.id === depId);
      if (!depNode) return true;
      return (allocated[depId] || 0) >= depNode.maxPoints;
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none p-4 pt-[2vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-aetheria-950/98 backdrop-blur-2xl border-4 border-aetheria-400/30 rounded-3xl shadow-aetheria-lg pointer-events-auto relative w-full max-w-5xl h-[750px] max-h-[82vh] flex flex-col overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
        
        {/* Animated Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-aetheria-400/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-aetheria-600/10 rounded-full blur-[120px] animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-aetheria-400/20 bg-aetheria-400/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-aetheria-400/20 rounded-2xl border border-aetheria-400/30 shadow-inner">
              <Zap className="w-6 h-6 text-aetheria-400" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black text-aetheria-200 uppercase tracking-tighter flex items-center gap-3">
                Talent Specialization
                <span className="text-xs bg-aetheria-400/20 px-2 py-0.5 rounded border border-aetheria-400/40 text-aetheria-400">
                  {character.class.toUpperCase()}
                </span>
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                 <Sparkles size={12} className="text-aetheria-400 animate-pulse" />
                 <p className="text-[10px] text-aetheria-600 uppercase tracking-[0.2em] font-black">Refine your destiny</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-aetheria-600 uppercase tracking-widest font-black mb-1">Available Points</p>
              <div className="text-3xl font-mono font-black text-aetheria-400 drop-shadow-[0_0_100px_rgba(var(--color-aetheria-400-rgb),0.3)]">
                {points.toString().padStart(2, '0')}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 bg-aetheria-950 rounded-xl border border-aetheria-400/20 hover:border-aetheria-400 hover:bg-aetheria-400/10 transition-all active:scale-95 group"
            >
              <X className="w-6 h-6 text-aetheria-600 group-hover:text-aetheria-200" />
            </button>
          </div>
        </div>

        {/* Tree Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-black/40 flex flex-col">
           {/* SVG Connections Layer (Global within canvas) */}
           <div className="absolute inset-0 overflow-auto custom-scrollbar">
             <div className="relative min-w-full min-h-full" style={{ width: '800px', height: '600px', margin: '0 auto' }}>
               <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <defs>
                    <linearGradient id="link-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-aetheria-400)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--color-aetheria-400)" stopOpacity="0.1" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  {nodes.map(node => (
                    node.dependencies?.map(depId => {
                      const dep = nodes.find(n => n.id === depId);
                      if (!dep) return null;
                      
                      const isDepMastered = (allocated[depId] || 0) >= dep.maxPoints;

                      return (
                        <line
                          key={`${node.id}-${depId}`}
                          x1={dep.position.x}
                          y1={dep.position.y}
                          x2={node.position.x}
                          y2={node.position.y}
                          stroke={isDepMastered ? "var(--color-aetheria-400)" : "var(--color-aetheria-800)"}
                          strokeWidth={2}
                          strokeDasharray={isDepMastered ? "none" : "5,5"}
                          opacity={isDepMastered ? 0.8 : 0.3}
                          filter={isDepMastered ? "url(#glow)" : "none"}
                          style={{ transition: 'all 0.5s ease' }}
                        />
                      );
                    })
                  ))}
               </svg>

               {/* Branch Labels (Relative to tree content) */}
               {Array.from(new Set(nodes.map(n => n.branch))).map((branch) => {
                 const branchNodes = nodes.filter(n => n.branch === branch);
                 const avgX = branchNodes.reduce((sum, n) => sum + n.position.x, 0) / branchNodes.length;
                 return (
                   <div 
                     key={branch}
                     className="absolute top-4 pointer-events-none"
                     style={{ 
                       left: avgX,
                       transform: 'translateX(-50%)'
                     }}
                   >
                     <div className="px-6 py-2 bg-aetheria-400/10 border border-aetheria-400/30 rounded-full backdrop-blur-md shadow-lg">
                       <span className="text-[11px] font-black uppercase tracking-[0.3em] text-aetheria-200 whitespace-nowrap">{branch}</span>
                     </div>
                     <div className="h-8 w-px bg-linear-to-b from-aetheria-400/40 to-transparent mx-auto" />
                   </div>
                 );
               })}

               {/* Nodes Layer */}
               <div className="absolute inset-0">
                  {nodes.map(node => {
                    const currentPoints = allocated[node.id] || 0;
                    const mastered = currentPoints >= node.maxPoints;
                    const unlocked = isUnlocked(node);
                    const allocatable = canAllocate(node);

                    return (
                      <motion.div
                        key={node.id}
                        initial={false}
                        className="absolute group"
                        style={{ 
                          left: node.position.x, 
                          top: node.position.y,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {/* Node Button */}
                        <button
                          disabled={!allocatable && !mastered}
                          onClick={() => allocatable && onAllocate?.(node.id)}
                          className={`
                            w-16 h-16 rounded-2xl border-2 flex items-center justify-center relative transition-all duration-300
                            ${mastered ? 'bg-aetheria-400/20 border-aetheria-400 shadow-[0_0_20px_rgba(var(--color-aetheria-400-rgb),0.3)] scale-110' : 
                              unlocked ? 'bg-aetheria-400/10 border-aetheria-400/40 hover:border-aetheria-400 hover:bg-aetheria-400/20' : 
                              'bg-black/60 border-aetheria-800 opacity-50 grayscale pointer-events-none'}
                          `}
                        >
                          <span className={`text-2xl transition-transform duration-300 ${mastered ? 'scale-125 rotate-6' : 'group-hover:scale-110'}`}>
                            {node.icon}
                          </span>

                          {/* Points Counter Bubble */}
                          <div className={`
                            absolute -bottom-2 -right-2 w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-black
                            ${mastered ? 'bg-aetheria-400 text-aetheria-950 border-aetheria-950' : 
                              currentPoints > 0 ? 'bg-aetheria-400 text-aetheria-950 border-aetheria-950' : 
                              'bg-aetheria-900 text-aetheria-600 border-aetheria-800'}
                          `}>
                            {currentPoints}/{node.maxPoints}
                          </div>

                          {/* Hover Info Tooltip */}
                          <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 bg-aetheria-950 border-2 border-aetheria-400/40 p-3 rounded-xl shadow-2xl translate-y-2 group-hover:translate-y-0">
                             <h4 className="text-[11px] font-black text-aetheria-400 uppercase tracking-wide mb-1">{node.name}</h4>
                             <p className="text-[10px] text-aetheria-200 leading-tight mb-2 opacity-80">{node.description}</p>
                             {!unlocked && (
                               <div className="pt-2 border-t border-aetheria-800 flex items-center gap-1.5">
                                 <Shield size={10} className="text-red-500" />
                                 <span className="text-[8px] text-red-500 uppercase font-black">Requires previous talent</span>
                               </div>
                             )}
                             {allocatable && (
                                <div className="pt-2 border-t border-aetheria-800 flex items-center gap-1.5">
                                 <Sparkles size={10} className="text-aetheria-400" />
                                 <span className="text-[8px] text-aetheria-400 uppercase font-black">Click to learn</span>
                               </div>
                             )}
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
               </div>
             </div>
           </div>
        </div>

        {/* Footer Info */}
        <div className="px-8 py-4 border-t border-aetheria-400/10 bg-aetheria-950/50 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-aetheria-400 shadow-[0_0_5px_var(--color-aetheria-400)]" />
                 <span className="text-[9px] text-aetheria-600 uppercase font-black tracking-widest">Mastered</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-aetheria-400 shadow-[0_0_5px_var(--color-aetheria-400)]" />
                 <span className="text-[9px] text-aetheria-600 uppercase font-black tracking-widest">Unlocked</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-aetheria-800" />
                 <span className="text-[9px] text-aetheria-600 uppercase font-black tracking-widest">Locked</span>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <ScrollText size={14} className="text-aetheria-600" />
              <p className="text-[10px] text-aetheria-600 italic">Choose wisely, for your soul cannot be easily unbound...</p>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
