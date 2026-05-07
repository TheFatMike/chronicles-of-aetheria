import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";

interface KeybindingProps {
  enabled: boolean;
  onEscape: () => void;
  onHotbarUse: (index: number) => void;
}

export const useKeybindings = ({ enabled, onEscape, onHotbarUse }: KeybindingProps) => {
  const { setActiveMenu, activeMenu, setTarget, currentTarget } = useGameStore();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const key = e.key.toLowerCase();
      const isEditorOpen = useGameStore.getState().isEditorOpen;

      // If editor is open, we only allow Escape. All other game hotkeys are suppressed.
      if (isEditorOpen && e.key !== "Escape") {
        return;
      }
      
      // Escape first
      if (e.key === "Escape") {
        if (activeMenu) {
          setActiveMenu(null);
        } else if (currentTarget) {
          setTarget(null);
        } else {
          onEscape();
        }
        return;
      }

      // Hotbar Number Keys
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        const index = key === "0" ? 9 : parseInt(key) - 1;
        onHotbarUse(index);
        return;
      }

      // Hotkeys (only if no menu is open, or to toggle specific menus)
      switch (key) {
        case "i":
          setActiveMenu(activeMenu === 'inventory' ? null : 'inventory');
          break;
        case "m":
          setActiveMenu(activeMenu === 'map' ? null : 'map');
          break;
        case "c":
          setActiveMenu(activeMenu === 'menu' ? null : 'menu');
          break;
        case "q":
          setActiveMenu(activeMenu === 'quests' ? null : 'quests');
          break;
        case "k":
          setActiveMenu(activeMenu === 'skills' ? null : 'skills');
          break;
      }
    };


    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, activeMenu, currentTarget, setActiveMenu, setTarget, onEscape]);
};
