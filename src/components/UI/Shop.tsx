/**
 * @file src/components/UI/Shop.tsx
 * @description The shop interface for buying and selling items with NPC merchants.
 */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem } from "../../types";
import { Shop as ShopType, ShopItem } from "../../store/types";
import * as Icons from "lucide-react";
import { ShoppingBag, X, Coins, ArrowRight } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useScaffold } from "./GameScaffold";
import { formatGold, formatGoldDetailed } from "../../lib/currency";
import { ITEMS } from "../../data/items";
import { ItemTooltip } from "./ItemTooltip";

interface ShopProps {
  shop: ShopType;
  playerGold: number;
  playerInventory: (InventoryItem | null)[];
  onClose: () => void;
  onBuy: (itemId: string, price: number) => void;
  onSell: (inventoryIndex: number) => void;
}

export const Shop = React.memo(({ shop, playerGold, playerInventory, onClose, onBuy, onSell }: ShopProps) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [hoveredItem, setHoveredItem] = useState<{item: InventoryItem, x: number, y: number} | null>(null);
  const { toLogical } = useScaffold();

  const handleItemHover = (item: InventoryItem, e: React.MouseEvent) => {
    const logical = toLogical(e.clientX, e.clientY);
    setHoveredItem({ item, x: logical.x, y: logical.y });
  };

  const shopItems = useMemo(() => {
    return shop.items.map(si => {
      const itemData = ITEMS[si.itemId];
      if (!itemData) return null;
      return { ...itemData, price: si.price };
    }).filter(Boolean) as (InventoryItem & { price: number })[];
  }, [shop]);

  const sellableItems = useMemo(() => {
    return playerInventory.map((item, index) => {
      if (!item) return null;
      // For now, sell price is 50% of the item's value if it were in a shop, or a default
      // We can add a 'value' property to items later.
      const sellPrice = Math.floor((ITEMS[item.itemId]?.type === 'material' ? 5 : 20) * (item.quantity || 1));
      return { ...item, sellPrice, inventoryIndex: index };
    }).filter(Boolean) as (InventoryItem & { sellPrice: number, inventoryIndex: number })[];
  }, [playerInventory]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center pointer-events-none p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#1a140f]/95 backdrop-blur-xl w-full max-w-2xl rounded-2xl border-2 border-[#4a3a2a] shadow-[0_0_100px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="bg-[#c2a472] px-6 py-4 flex items-center justify-between border-b-2 border-[#4a3a2a]">
          <div className="flex items-center gap-3">
            <div className="bg-[#1a140f] p-2 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-[#c2a472]" />
            </div>
            <div>
              <h2 className="text-[#1a140f] font-black uppercase tracking-widest text-lg leading-tight">{shop.name}</h2>
              <p className="text-[#1a140f]/70 text-[10px] font-bold uppercase tracking-wider">Merchant NPC</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#1a140f]/10 rounded-full transition-colors group"
          >
            <X className="w-6 h-6 text-[#1a140f] group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#4a3a2a]">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-3 font-black text-xs uppercase tracking-[0.2em] transition-all ${
              activeTab === 'buy' ? 'bg-[#c2a472]/10 text-[#c2a472] border-b-2 border-[#c2a472]' : 'text-[#8b6b4d] hover:text-[#f4e4bc]'
            }`}
          >
            Buy Items
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-3 font-black text-xs uppercase tracking-[0.2em] transition-all ${
              activeTab === 'sell' ? 'bg-[#c2a472]/10 text-[#c2a472] border-b-2 border-[#c2a472]' : 'text-[#8b6b4d] hover:text-[#f4e4bc]'
            }`}
          >
            Sell Items
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeTab === 'buy' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shopItems.map((item) => {
                const canAfford = playerGold >= item.price;
                const hasSpace = playerInventory.some(s => 
                  s === null || (s.itemId === item.itemId && s.stackable && (s.quantity || 0) < (s.maxStack || 99))
                );
                const canBuy = canAfford && hasSpace;
                const Icon = (Icons[item.icon as keyof typeof Icons] || Icons.HelpCircle) as any;

                return (
                  <motion.div
                    key={item.itemId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`bg-black/40 border border-[#4a3a2a] rounded-xl p-4 flex items-center gap-4 group transition-all hover:border-[#c2a472]/50 ${!canBuy ? 'opacity-70' : ''}`}
                    onMouseEnter={(e) => handleItemHover(item, e)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 ${
                      item.rarity === 'legendary' ? 'border-orange-500 bg-orange-500/10' :
                      item.rarity === 'epic' ? 'border-purple-500 bg-purple-500/10' :
                      item.rarity === 'rare' ? 'border-blue-500 bg-blue-500/10' :
                      item.rarity === 'uncommon' ? 'border-green-500 bg-green-500/10' :
                      'border-[#4a3a2a] bg-[#2d221a]'
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        item.rarity === 'legendary' ? 'text-orange-500' :
                        item.rarity === 'epic' ? 'text-purple-500' :
                        item.rarity === 'rare' ? 'text-blue-500' :
                        item.rarity === 'uncommon' ? 'text-green-500' :
                        'text-[#c2a472]'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[#f4e4bc] font-bold text-sm leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Coins className="w-3 h-3 text-[#fbbf24]" />
                        <span className={`text-xs font-black ${canAfford ? 'text-[#fbbf24]' : 'text-red-500'}`}>
                          {formatGoldDetailed(item.price)}
                        </span>
                        {!hasSpace && <span className="text-[8px] text-red-500 ml-2 font-bold uppercase">Inventory Full</span>}
                      </div>
                    </div>
                    <button
                      disabled={!canBuy}
                      onClick={() => onBuy(item.itemId, item.price)}
                      className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                        canBuy 
                          ? 'bg-[#c2a472] text-[#1a140f] hover:bg-[#d4b98a] shadow-lg active:scale-95' 
                          : 'bg-[#4a3a2a] text-[#8b6b4d] cursor-not-allowed'
                      }`}
                    >
                      Buy
                    </button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sellableItems.length > 0 ? sellableItems.map((item) => {
                const Icon = (Icons[item.icon as keyof typeof Icons] || Icons.HelpCircle) as any;

                return (
                  <motion.div
                    key={`${item.itemId}-${item.inventoryIndex}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-black/40 border border-[#4a3a2a] rounded-xl p-4 flex items-center gap-4 group transition-all hover:border-[#c2a472]/50"
                    onMouseEnter={(e) => handleItemHover(item, e)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 ${
                      item.rarity === 'legendary' ? 'border-orange-500 bg-orange-500/10' :
                      item.rarity === 'epic' ? 'border-purple-500 bg-purple-500/10' :
                      item.rarity === 'rare' ? 'border-blue-500 bg-blue-500/10' :
                      item.rarity === 'uncommon' ? 'border-green-500 bg-green-500/10' :
                      'border-[#4a3a2a] bg-[#2d221a]'
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        item.rarity === 'legendary' ? 'text-orange-500' :
                        item.rarity === 'epic' ? 'text-purple-500' :
                        item.rarity === 'rare' ? 'text-blue-500' :
                        item.rarity === 'uncommon' ? 'text-green-500' :
                        'text-[#c2a472]'
                      }`} />
                      {item.quantity && item.quantity > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-[#1a140f] border border-[#4a3a2a] px-1.5 py-0.5 rounded text-[10px] font-black text-[#f4e4bc]">
                          {item.quantity}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[#f4e4bc] font-bold text-sm leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Coins className="w-3 h-3 text-[#fbbf24]" />
                        <span className="text-xs font-black text-green-500">
                          +{formatGoldDetailed(item.sellPrice)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onSell(item.inventoryIndex)}
                      className="px-4 py-2 bg-[#4a3a2a] hover:bg-green-900/40 text-[#8b6b4d] hover:text-green-400 border border-transparent hover:border-green-500/50 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      Sell
                    </button>
                  </motion.div>
                );
              }) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-[#c2a472]/5 flex items-center justify-center border-2 border-[#4a3a2a] border-dashed">
                    <Icons.PackageX className="w-10 h-10 text-[#4a3a2a]" />
                  </div>
                  <div>
                    <h3 className="text-[#f4e4bc] font-bold uppercase tracking-widest">No Items to Sell</h3>
                    <p className="text-[#8b6b4d] text-xs">Your inventory is empty or contains non-sellable items.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/60 p-6 border-t-2 border-[#4a3a2a] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[#8b6b4d] text-[10px] font-black uppercase tracking-widest">Your Balance</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[#f4e4bc] font-display font-black text-2xl">{formatGoldDetailed(playerGold)}</span>
                <Coins className="w-5 h-5 text-[#fbbf24]" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[#8b6b4d]">
            <Icons.MousePointer2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Hover for Details</span>
          </div>
        </div>
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredItem && (
          <ItemTooltip item={hoveredItem.item} x={hoveredItem.x} y={hoveredItem.y} />
        )}
      </AnimatePresence>
    </div>
  );
});

Shop.displayName = "Shop";
