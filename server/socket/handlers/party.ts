/**
 * @file server/socket/handlers/party.ts
 * @description Handlers for player party management.
 * Facilitates grouping players together, managing invites, and tracking party state.
 * @importance Essential: Core to the cooperative multiplayer aspect of the game.
 */
import { Server, Socket } from "socket.io";
import { players, parties } from "../../state";
import { serverLogger } from "../../logger";
import crypto from "crypto";

export const handlePartyInvite = (io: Server, socket: Socket, targetId: string) => {
  const player = players.get(socket.id);
  const target = players.get(targetId);

  if (!player || !target || player.id === target.id) return;

  // Check if player is already in a party they don't lead
  if (player.partyId) {
    const party = parties.get(player.partyId);
    if (party && party.leaderId !== socket.id) {
      socket.emit("chat_message", { sender: "PARTY", text: "Only the party leader can invite players.", color: "#ef4444" });
      return;
    }
    if (party && party.members.length >= 5) {
      socket.emit("chat_message", { sender: "PARTY", text: "Party is full.", color: "#ef4444" });
      return;
    }
  }

  if (target.partyId) {
    socket.emit("chat_message", { sender: "PARTY", text: `${target.characterName} is already in a party.`, color: "#ef4444" });
    return;
  }

  // Send invite to target
  io.to(targetId).emit("party_invite_received", {
    fromId: socket.id,
    fromName: player.characterName
  });

  socket.emit("chat_message", { sender: "PARTY", text: `Invite sent to ${target.characterName}.`, color: "#3b82f6" });
};

export const handlePartyAccept = (io: Server, socket: Socket, inviterId: string) => {
  const player = players.get(socket.id);
  const inviter = players.get(inviterId);

  if (!player || !inviter) return;

  let partyId = inviter.partyId;
  let party = partyId ? parties.get(partyId) : null;

  if (!party) {
    // Create new party
    partyId = crypto.randomUUID();
    party = {
      id: partyId,
      leaderId: inviterId,
      members: [inviterId]
    };
    parties.set(partyId, party);
    inviter.partyId = partyId;
    io.to(inviterId).emit("party_update", party);
  }

  if (party.members.length >= 5) {
    socket.emit("chat_message", { sender: "PARTY", text: "Party is full.", color: "#ef4444" });
    return;
  }

  // Join party
  party.members.push(socket.id);
  player.partyId = partyId;

  // Notify all members
  party.members.forEach((mId: string) => {
    io.to(mId).emit("party_update", {
      ...party,
      memberDetails: party.members.map((id: string) => {
        const p = players.get(id);
        return p ? { id: p.id, name: p.characterName, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, class: p.class, color: p.color } : null;
      }).filter(Boolean)
    });
  });

  io.emit("chat_message", { sender: "PARTY", text: `${player.characterName} has joined the party!`, color: "#22c55e" });
};

export const handlePartyLeave = (io: Server, socket: Socket) => {
  const player = players.get(socket.id);
  if (!player || !player.partyId) return;

  const partyId = player.partyId;
  const party = parties.get(partyId);
  if (!party) return;

  party.members = party.members.filter((id: string) => id !== socket.id);
  player.partyId = null;

  if (party.members.length === 0) {
    parties.delete(partyId);
  } else {
    // If leader left, assign new leader
    if (party.leaderId === socket.id) {
      party.leaderId = party.members[0];
    }

    // Notify remaining
    const updateData = {
      ...party,
      memberDetails: party.members.map((id: string) => {
        const p = players.get(id);
        return p ? { id: p.id, name: p.characterName, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, class: p.class, color: p.color } : null;
      }).filter(Boolean)
    };
    party.members.forEach((mId: string) => io.to(mId).emit("party_update", updateData));
  }

  socket.emit("party_update", null);
  io.emit("chat_message", { sender: "PARTY", text: `${player.characterName} has left the party.`, color: "#f97316" });
};
