/**
 * @file src/components/UI/Chat.tsx
 * @description The user interface for the in-game chat system.
 * Handles message display, input, and channel switching (Global, Party, etc.).
 * @importance Essential: Vital for social interaction and providing real-time feedback to the player.
 */
import React, { useState, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, MessageSquare, X } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";

interface ChatProps {
  onSendMessage: (text: string) => void;
}

export const Chat = memo(({ onSendMessage }: ChatProps) => {
  const messages = useGameStore((state) => state.messages);
  const [isOpen, setIsOpen] = useState(true); 
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className={`fixed bottom-8 left-4 lg:left-8 z-100 transition-all duration-300 pointer-events-auto ${isOpen ? "w-[calc(100vw-2rem)] sm:w-80 lg:w-96" : "w-12 h-12"}`}>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-[#1a1410]/95 backdrop-blur-md border-2 border-[#4a3a2a] rounded shadow-2xl flex flex-col h-[300px] lg:h-[400px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 sm:py-3 border-b border-[#4a3a2a] bg-black/20">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-[#c2a472]" />
                <span className="text-[10px] font-fantasy uppercase tracking-widest text-[#f4e4bc]">World Chat</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors text-xs p-1"
              >
                _
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[9px] sm:text-[10px] font-serif italic text-stone-600 uppercase tracking-widest">Silence falls upon the realm...</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || `msg-${idx}-${msg.timestamp}`} className="group">
                    <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5">
                      {msg.role && msg.role !== 'player' && (
                        <span className={`text-[6px] sm:text-[7px] px-1 rounded font-black tracking-tighter uppercase mr-1 ${
                          msg.role === 'dev' ? 'bg-amber-500 text-black' : 
                          msg.role === 'admin' ? 'bg-red-600 text-white' : 
                          'bg-blue-600 text-white'
                        }`}>
                          {msg.role.toUpperCase()}
                        </span>
                      )}
                      <span 
                        className="text-[10px] sm:text-[11px] font-fantasy font-bold uppercase tracking-wide px-1 sm:px-1.5 py-0.5 rounded-sm bg-black/40"
                        style={{ color: msg.color }}
                      >
                        {msg.sender}
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-mono text-stone-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#e2d1b0] leading-relaxed wrap-break-word font-serif ml-1">
                      {msg.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-2 sm:p-3 bg-black/40 border-t border-[#4a3a2a]">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Whisper to the void..."
                  className="w-full bg-black/60 border border-[#4a3a2a] p-2 sm:p-3 pr-10 text-xs sm:text-sm italic font-serif text-[#f4e4bc] placeholder:text-stone-700 focus:outline-none focus:border-[#c2a472] transition-colors rounded-sm"
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a3a2a] hover:text-[#c2a472] disabled:hover:text-[#4a3a2a] transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2d221a] border-2 border-[#4a3a2a] rounded shadow-2xl flex items-center justify-center text-[#c2a472] hover:border-[#c2a472] transition-all"
          >
            <MessageSquare size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

Chat.displayName = "Chat";
