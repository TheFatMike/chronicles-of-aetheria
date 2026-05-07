import { useEffect, useRef } from "react";
import nipplejs from "nipplejs";
import { useGameStore } from "../../store/useGameStore";

export const VirtualJoystick = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const setJoystickPos = useGameStore((state) => state.setMobileJoystickPos);
  const isMobile = useGameStore((state) => state.isMobile);

  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    const manager = nipplejs.create({
      zone: containerRef.current,
      mode: "static",
      position: { left: "80px", bottom: "80px" },
      color: "white",
      size: 120,
    });

    manager.on("move" as any, ((_evt: any, data: any) => {
      // data.vector.x/y are in range [-1, 1]
      setJoystickPos({ x: data.vector.x, y: data.vector.y });
    }) as any);

    manager.on("end" as any, () => {
      setJoystickPos(null);
    });

    return () => {
      manager.destroy();
    };
  }, [isMobile, setJoystickPos]);

  if (!isMobile) return null;

  return (
    <div 
      ref={containerRef} 
      id="joystick-zone"
      className="fixed bottom-0 left-0 w-48 h-48 pointer-events-auto z-50"
      style={{ touchAction: "none" }}
    />
  );
};
