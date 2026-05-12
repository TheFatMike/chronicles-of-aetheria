/**
 * @file server/lib/schemas.ts
 * @description Zod schemas for validating incoming socket payloads.
 * Ensures data integrity and prevents malformed data from crashing the server.
 */
import { z } from "zod";

// --- Common Types ---
const PositionSchema = z.tuple([z.number(), z.number(), z.number()]);
const RotationSchema = z.tuple([z.number(), z.number(), z.number()]);

// --- Handlers ---

export const MovePayloadSchema = z.object({
  pos: PositionSchema,
  rot: RotationSchema,
  isMoving: z.boolean(),
  isGrounded: z.boolean().optional(),
});

export const ChatPayloadSchema = z.string().min(1).max(256);

export const PromotePayloadSchema = z.object({
  targetId: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["player", "mod", "admin", "dev", "owner"]).optional(),
  action: z.enum(["promote", "demote"]).optional(),
}).refine(data => data.targetId || data.email, {
  message: "Either targetId or email must be provided",
});

export const SaveWorldObjectSchema = z.object({
  id: z.string(),
  type: z.string(),
  pos: PositionSchema,
  rot: RotationSchema,
  scale: z.union([z.number(), z.array(z.number())]).optional(),
  modelUrl: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  color: z.string().optional(),
});

export const BatchSaveSchema = z.object({
  saves: z.array(z.any()).optional(), // We could nest SaveWorldObjectSchema here if needed
  deletes: z.array(z.object({
    id: z.string(),
    pos: PositionSchema.optional()
  })).optional(),
  terrain: z.array(z.object({
    x: z.number(),
    z: z.number(),
    y: z.number(),
    type: z.string().optional()
  })).optional()
});

export const JoinPayloadSchema = z.object({
  characterId: z.string(),
  pos: PositionSchema.optional(),
  rot: RotationSchema.optional(),
});

// --- Inventory ---
export const LootEntitySchema = z.object({
  targetId: z.string()
});

export const TakeLootItemSchema = z.object({
  targetId: z.string(),
  lootIndex: z.number().int().min(0)
});

export const EquipItemSchema = z.object({
  inventoryIndex: z.number().int().min(0).max(29)
});

export const UnequipItemSchema = z.object({
  slot: z.string()
});

export const MoveItemSchema = z.object({
  fromIndex: z.number().int().min(0).max(29),
  toIndex: z.number().int().min(0).max(29)
});

export const SplitStackSchema = z.object({
  fromIndex: z.number().int().min(0).max(29),
  amount: z.number().int().positive()
});

export const DestroyItemSchema = z.object({
  inventoryIndex: z.number().int().min(0).max(29)
});

export const BankDepositSchema = z.object({
  inventoryIndex: z.number().int().min(0).max(29),
  bankIndex: z.number().int().min(0).max(49).optional(),
  amount: z.number().int().positive().optional(),
  all: z.boolean().optional()
});

export const BankWithdrawSchema = z.object({
  bankIndex: z.number().int().min(0).max(49),
  inventoryIndex: z.number().int().min(0).max(29).optional(),
  amount: z.number().int().positive().optional(),
  all: z.boolean().optional()
});

export const BankMoveSchema = z.object({
  fromIndex: z.number().int().min(0).max(49),
  toIndex: z.number().int().min(0).max(49)
});
