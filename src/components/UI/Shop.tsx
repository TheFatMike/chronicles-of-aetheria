/**
 * @file src/components/UI/Shop.tsx
 * @description The shop interface for buying and selling items with NPC merchants.
 */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem } from "@shared/types";
import { Shop as ShopType, ShopItem } from "@shared/types";
import * as Icons from "lucide-react";
import { ShoppingBag, X, Coins, ArrowRight } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useScaffold } from "./GameScaffold";
import { formatGold, formatGoldDetailed } from "../../lib/currency";
import { ITEMS } from "@shared/data/items";
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
        className="bg-aetheria-950/95 backdrop-blur-xl w-full max-w-2xl rounded-2xl border-2 border-aetheria-800 shadow-aetheria-lg pointer-events-auto overflow-hidden flex flex-col max-h-[85%]"
      >
        {/* Header */}
        <div className="bg-aetheria-400 px-6 py-4 flex items-center justify-between border-b-2 border-aetheria-800">
          <div className="flex items-center gap-3">
            <div className="bg-aetheria-950 p-2 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-aetheria-400" />
            </div>
            <div>
              <h2 className="text-aetheria-950 font-black uppercase tracking-widest text-lg leading-tight">{shop.name}</h2>
              <p className="text-aetheria-950/70 text-[10px] font-bold uppercase tracking-wider">Merchant NPC</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-aetheria-950/10 rounded-full transition-colors group"
          >
            <X className="w-6 h-6 text-aetheria-950 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-aetheria-800">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-3 font-black text-xs uppercase tracking-[0.2em] transition-all ${
              activeTab === 'buy' ? 'bg-aetheria-400/10 text-aetheria-400 border-b-2 border-aetheria-400' : 'text-aetheria-600 hover:text-aetheria-200'
            }`}
          >
            Buy Items
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-3 font-black text-xs uppercase tracking-[0.2em] transition-all ${
              activeTab === 'sell' ? 'bg-aetheria-400/10 text-aetheria-400 border-b-2 border-aetheria-400' : 'text-aetheria-600 hover:text-aetheria-200'
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
                    className={`bg-black/40 border border-aetheria-800 rounded-xl p-4 flex items-center gap-4 group transition-all hover:border-aetheria-400/50 ${!canBuy ? 'opacity-70' : ''}`}
                    onMouseEnter={(e) => handleItemHover(item, e)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 ${
                      item.rarity === 'legendary' ? 'border-orange-500 bg-orange-500/10' :
                      item.rarity === 'epic' ? 'border-purple-500 bg-purple-500/10' :
                      item.rarity === 'rare' ? 'border-blue-500 bg-blue-500/10' :
                      item.rarity === 'uncommon' ? 'border-green-500 bg-green-500/10' :
                      'border-aetheria-800 bg-aetheria-900'
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        item.rarity === 'legendary' ? 'text-orange-500' :
                        item.rarity === 'epic' ? 'text-purple-500' :
                        item.rarity === 'rare' ? 'text-blue-500' :
                        item.rarity === 'uncommon' ? 'text-green-500' :
                        'text-aetheria-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-aetheria-200 font-bold text-sm leading-tight">{item.name}</h3>
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
                          ? 'bg-aetheria-400 text-aetheria-950 hover:bg-aetheria-200 shadow-lg active:scale-95' 
                          : 'bg-aetheria-800 text-aetheria-600 cursor-not-allowed'
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
                    className="bg-black/40 border border-aetheria-800 rounded-xl p-4 flex items-center gap-4 group transition-all hover:border-aetheria-400/50"
                    onMouseEnter={(e) => handleItemHover(item, e)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 ${
                      item.rarity === 'legendary' ? 'border-orange-500 bg-orange-500/10' :
                      item.rarity === 'epic' ? 'border-purple-500 bg-purple-500/10' :
                      item.rarity === 'rare' ? 'border-blue-500 bg-blue-500/10' :
                      item.rarity === 'uncommon' ? 'border-green-500 bg-green-500/10' :
                      'border-aetheria-800 bg-aetheria-900'
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        item.rarity === 'legendary' ? 'text-orange-500' :
                        item.rarity === 'epic' ? 'text-purple-500' :
                        item.rarity === 'rare' ? 'text-blue-500' :
                        item.rarity === 'uncommon' ? 'text-green-500' :
                        'text-aetheria-400'
                      }`} />
                      {item.quantity && item.quantity > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-aetheria-950 border border-aetheria-800 px-1.5 py-0.5 rounded text-[10px] font-black text-aetheria-200">
                          {item.quantity}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-aetheria-200 font-bold text-sm leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Coins className="w-3 h-3 text-aetheria-400" />
                        <span className="text-xs font-black text-green-500">
                          +{formatGoldDetailed(item.sellPrice)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onSell(item.inventoryIndex)}
                      className="px-4 py-2 bg-aetheria-800 hover:bg-green-900/40 text-aetheria-600 hover:text-green-400 border border-transparent hover:border-green-500/50 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      Sell
                    </button>
                  </motion.div>
                );
              }) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-aetheria-400/5 flex items-center justify-center border-2 border-aetheria-800 border-dashed">
                    <Icons.PackageX className="w-10 h-10 text-aetheria-800" />
                  </div>
                  <div>
                    <h3 className="text-aetheria-200 font-bold uppercase tracking-widest">No Items to Sell</h3>
                    <p className="text-aetheria-600 text-xs">Your inventory is empty or contains non-sellable items.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/60 p-6 border-t-2 border-aetheria-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-aetheria-600 text-[10px] font-black uppercase tracking-widest">Your Balance</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-aetheria-200 font-display font-black text-2xl">{formatGoldDetailed(playerGold)}</span>
                <Coins className="w-5 h-5 text-[#fbbf24]" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-aetheria-600">
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
