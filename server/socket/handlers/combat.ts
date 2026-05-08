import { Socket, Server } from "socket.io";
import { handleCastSkill } from "../../logic/combat";

export const handleCombatSkill = (io: Server, socket: Socket, data: any) => {
  handleCastSkill(socket, io, data);
};
