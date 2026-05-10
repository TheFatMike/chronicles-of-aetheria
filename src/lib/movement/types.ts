/**
 * @file src/lib/movement/types.ts
 * @description Defines the configuration and state interfaces for the movement and physics systems.
 * Provides the data structures for camera states, movement configs, and physical properties.
 * @importance Essential: Ensures type safety and consistent data structures across the movement library.
 */
import * as THREE from "three";

export interface MovementConfig {
  MOVE_SPEED: number;
  FRICTION: number;
  GRAVITY: number;
  JUMP_FORCE: number;
  SENSITIVITY: number;
  MIN_RADIUS: number;
  MAX_RADIUS: number;
}

export interface CameraState {
  theta: number;
  phi: number;
  radius: number;
  isLeftMouseDown: boolean;
  isRightMouseDown: boolean;
  lastX: number;
  lastY: number;
}

export interface MovementState {
  velocity: THREE.Vector3;
  isGrounded: boolean;
  isMoving: boolean;
}
