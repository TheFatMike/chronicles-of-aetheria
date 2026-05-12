import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";

/**
 * Hook to poll the server health status and update the game store.
 */
export const useServerStatus = () => {
  const connected = useGameStore((state) => state.connected);
  const setConnected = useGameStore((state) => state.setConnected);

  useEffect(() => {
    let interval: any;
    
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/health");
        setConnected(res.ok);
      } catch (e) {
        setConnected(false);
      }
    };

    if (!connected) {
      checkStatus();
      interval = setInterval(checkStatus, 5000);
    }
    
    return () => clearInterval(interval);
  }, [connected, setConnected]);

  return connected;
};
