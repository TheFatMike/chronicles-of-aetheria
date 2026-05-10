import * as THREE from "three";
import { logger } from "../logger";

export class InputHandler {
  private keys: { [key: string]: boolean } = {};
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onBlur: () => void;
  public isRightMouseDown: boolean = false;
  public isLeftMouseDown: boolean = false;
  public isTyping: boolean = false;

  constructor() {
    this.onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.code] = true;
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };
    this.onBlur = () => {
      this.keys = {};
      this.isRightMouseDown = false;
      this.isLeftMouseDown = false;
    };
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.isLeftMouseDown = true;
    if (e.button === 2) this.isRightMouseDown = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.isLeftMouseDown = false;
    if (e.button === 2) this.isRightMouseDown = false;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  public setup() {
    this.keys = {};
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("contextmenu", this.onContextMenu);
    logger.debug("system", "Input listeners attached (WoW Mode).");
  }

  public destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("contextmenu", this.onContextMenu);
    logger.debug("system", "Input listeners detached.");
  }

  public getMovementInput(isEditorOpen: boolean, isWorldLoading: boolean): { direction: THREE.Vector3, turn: number } {
    this.isTyping = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
    const direction = new THREE.Vector3();
    let turn = 0;

    if (!this.isTyping && !isEditorOpen && !isWorldLoading) {
      // 1. Forward / Backward (S is 64% speed)
      if (this.keys["KeyW"] || this.keys["ArrowUp"]) direction.z -= 1;
      if (this.keys["KeyS"] || this.keys["ArrowDown"]) direction.z += 0.64; 

      // 2. Strafe (Q/E)
      if (this.keys["KeyQ"]) direction.x -= 1;
      if (this.keys["KeyE"]) direction.x += 1;

      // 3. Turning vs Strafe (A/D)
      // In WoW, if RMB is held, A/D strafes. Otherwise it turns the character.
      if (this.keys["KeyA"] || this.keys["ArrowLeft"]) {
        if (this.isRightMouseDown) direction.x -= 1;
        else turn += 1;
      }
      if (this.keys["KeyD"] || this.keys["ArrowRight"]) {
        if (this.isRightMouseDown) direction.x += 1;
        else turn -= 1;
      }
    }

    if (direction.lengthSq() > 1) direction.normalize();
    return { direction, turn };
  }

  public isJumpPressed(): boolean {
    return !this.isTyping && this.keys["Space"];
  }
}
