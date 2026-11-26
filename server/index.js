"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { WebSocketServer, WebSocket } = require("ws");
const { Gen9BattleService, FORMAT_ID } = require("./gen9-engine");
const { AutoAuditLab } = require("./auto-audit");
const gen9Service = new Gen9BattleService();
const autoAuditLab = new AutoAuditLab({ battleService: gen9Service });

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  });
  res.end(body);
}
function readJson(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("リクエストが大きすぎます。"));
        req.destroy();
        return;
      }
      body += chunk.toString("utf8");
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (_) { reject(new Error("JSON形式が正しくありません。")); }
    });
    req.on("error", reject);
  });
}
async function handleGen9Api(req, res, url) {
  const requestId = crypto.randomUUID();
  try {
    if (req.method === "GET" && url.pathname === "/api/gen9/health") {
      return sendJson(res, 200, {
        ok:true,
        engine:"pokemon-showdown",
        format:FORMAT_ID,
        generation:9,
        generationRange:"1-9",
        dex:"National Dex",
        mechanics:{megaEvolution:true,dynamax:false,terastallization:true}
      });
    }
    if (req.method === "GET" && url.pathname === "/api/gen9/catalog") {
      return sendJson(res, 200, gen9Service.catalog());
    }
    if (req.method === "POST" && url.pathname === "/api/gen9/battles") {
      const body = await readJson(req);
      console.info("[gen9-api] CPU battle start", requestId, "teamSize=" + (Array.isArray(body.playerTeam) ? body.playerTeam.length : "invalid"));
      const snapshot = await gen9Service.createBattle({
        playerTeam:body.playerTeam,
        opponentTeam:body.opponentTeam,
        player1Name:body.playerName || "プレイヤー",
        player2Name:body.opponentName || "CPU",
        kind:"cpu"
      });
      return sendJson(res, 201, snapshot);
    }
    const actionMatch = url.pathname.match(/^\/api\/gen9\/battles\/([a-f0-9]+)\/action$/);
    if (req.method === "POST" && actionMatch) {
      const body = await readJson(req);
      const snapshot = await gen9Service.submitCpuAction(
        actionMatch[1], body.token, body.action || {}, body.cursor || 0
      );
      return sendJson(res, 200, snapshot);
    }
    const battleMatch = url.pathname.match(/^\/api\/gen9\/battles\/([a-f0-9]+)$/);
    if (req.method === "GET" && battleMatch) {
      const token = url.searchParams.get("token");
      const cursor = Number(url.searchParams.get("cursor") || 0);
      const session = gen9Service.get(battleMatch[1], token);
      return sendJson(res, 200, gen9Service.snapshot(session, "p1", cursor));
    }
    if (req.method === "DELETE" && battleMatch) {
      const token = url.searchParams.get("token");
      gen9Service.get(battleMatch[1], token);
      gen9Service.destroy(battleMatch[1]);
      return sendJson(res, 200, { ok:true });
    }
    return sendJson(res, 404, { error:"National Dex API endpoint not found." });
  } catch (error) {
    console.error("[gen9-api] request failed", requestId, req.method, url.pathname, error?.stack || error);
    if (res.destroyed || res.writableEnded) return;
    return sendJson(res, Number(error?.statusCode) || 400, {
      ok:false,
      code:"GEN9_API_REQUEST_FAILED",
      requestId,
      error:error?.message || "National Dex API error."
    });
  }
}

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 10000);
const HOST = "0.0.0.0";
const ROOM_TTL_MS = 20 * 60 * 1000;
const MAX_TEAM_SIZE = 6;
const MAX_MESSAGE_BYTES = 512 * 1024;
const rooms = new Map();
const gen9Rooms = new Map();
const randomMatchQueue = [];
const clients = new WeakMap();
const MIME = {
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
  ".svg":"image/svg+xml",".ico":"image/x-icon",".gif":"image/gif",".txt":"text/plain; charset=utf-8",
  ".woff2":"font/woff2",".mp3":"audio/mpeg",".wav":"audio/wav"
};

function send(socket, payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}
function broadcast(room, payload, exceptId) {
  for (const player of room.players.values()) {
    if (player.id !== exceptId) send(player.socket, payload);
  }
}
function safeString(value, max) {
  return String(value == null ? "" : value).trim().slice(0,max);
}
function safeSlug(value, max) {
  const text = safeString(value,max).toLowerCase();
  return /^[a-z0-9-]+$/.test(text) ? text : "";
}
function safeStatBlock(value, keys, max) {
  const source = value && typeof value === "object" ? value : {};
  const out = {};
  for (const key of keys) {
    const number = Number(source[key]);
    out[key] = Number.isFinite(number) ? Math.max(0,Math.min(max,Math.floor(number))) : 0;
  }
  return out;
}
function sanitizeGen9Team(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_TEAM_SIZE) {
    throw new Error("チームは1〜6匹にしてください。");
  }
  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("ポケモン " + (index + 1) + " のデータが不正です。");
    }
    const speciesId = safeSlug(raw.speciesId || raw.species,64);
    const uid = safeString(raw.uid,96);
    if (!speciesId || !uid) throw new Error("ポケモンIDが不正です。");

    const rawMoves = raw.moves == null ? [] : raw.moves;
    if (!Array.isArray(rawMoves)) throw new Error("技データは配列で送信してください。");
    if (rawMoves.length > 4) throw new Error("技は4つまで設定できます。");
    const moves = rawMoves.map((move, moveIndex) => {
      const moveValue = typeof move === "string" ? move : move?.id || move?.name;
      const moveId = safeString(moveValue,64);
      if (!moveId) throw new Error("技 " + (moveIndex + 1) + " のIDが不正です。");
      return {id:moveId};
    });

    return {
      uid,
      speciesId,
      name:safeString(raw.name,48),
      level:raw.level,
      shiny:!!raw.shiny,
      mark:raw.mark ? safeString(raw.mark,48) : null,
      nature:raw.nature == null || raw.nature === "" ? "まじめ" : safeString(raw.nature,32),
      ivs:raw.ivs,
      evs:raw.evs,
      abilityId:raw.abilityId == null ? raw.ability : raw.abilityId,
      heldItem:raw.heldItem == null ? raw.item : raw.heldItem,
      teraType:raw.teraType,
      gender:raw.gender,
      moves
    };
  });
}
function sanitizeTeam(input, allowPartial = false) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_TEAM_SIZE ||
      (!allowPartial && input.length !== MAX_TEAM_SIZE)) {
    throw new Error(allowPartial ? "チームは1〜6匹にしてください。" : "チームは6匹にしてください。");
  }
  const statKeys = ["hp","atk","def","spa","spd","spe"];
  return input.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("ポケモンデータが不正です。");
    const speciesId = safeSlug(raw.speciesId,64);
    const uid = safeString(raw.uid,96);
    if (!speciesId || !uid) throw new Error("ポケモンIDが不正です。");
    const moves = Array.isArray(raw.moves) ? raw.moves.slice(0,4).map((move) => {
      const id = safeSlug(typeof move === "string" ? move : move?.id,64);
      return id ? {id} : null;
    }).filter(Boolean) : [];
    return {
      uid,
      speciesId,
      name:safeString(raw.name,48),
      level:Math.max(1,Math.min(100,Math.floor(Number(raw.level)||50))),
      shiny:!!raw.shiny,
      mark:raw.mark ? safeString(raw.mark,48) : null,
      nature:safeString(raw.nature || "まじめ",16),
      ivs:safeStatBlock(raw.ivs,statKeys,31),
      evs:safeStatBlock(raw.evs,statKeys,252),
      abilityId:safeSlug(raw.abilityId,64),
      heldItem:safeSlug(raw.heldItem,64),
      teraType:safeString(raw.teraType,16),
      moves
    };
  });
}
function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries=0;tries<100;tries++) {
    let code = "";
    for (let i=0;i<6;i++) code += alphabet[crypto.randomInt(0,alphabet.length)];
    if (!rooms.has(code) && !gen9Rooms.has(code)) return code;
  }
  throw new Error("ルームを作成できませんでした。もう一度試してください。");
}
function removeRandomQueueEntry(socket) {
  const index = randomMatchQueue.findIndex(entry => entry.socket === socket);
  if (index < 0) return false;
  randomMatchQueue.splice(index, 1);
  return true;
}
function detach(socket, reason) {
  const state = clients.get(socket);
  if (!state) return;
  if (state.randomQueued) {
    removeRandomQueueEntry(socket);
    clients.set(socket,{});
    send(socket,{type:"gen9-random-cancelled",reason:reason || "disconnect"});
    return;
  }
  if (state.gen9RoomCode) {
    const gameRoom = gen9Rooms.get(state.gen9RoomCode);
    clients.set(socket,{});
    if (gameRoom) {
      for (const [side,player] of gameRoom.players.entries()) {
        if(player.id===state.playerId)gameRoom.players.delete(side);
      }
      gameRoom.lastActive = Date.now();
      for (const peer of gameRoom.players.values()) {
        send(peer.socket,{type:"gen9-peer-left",reason:reason || "disconnect"});
        try { peer.socket.close(1000,"opponent disconnected"); } catch (_) {}
      }
      if (gameRoom.battleId) gen9Service.destroy(gameRoom.battleId);
      gen9Rooms.delete(gameRoom.code);
    }
    return;
  }
  if (!state.roomCode) return;
  const room = rooms.get(state.roomCode);
  clients.set(socket,{});
  if (!room) return;
  const player = room.players.get(state.playerId);
  if (player) room.players.delete(state.playerId);
  room.lastActive = Date.now();
  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    room.phase = "closed";
    broadcast(room,{type:"peer-left",reason:reason || "disconnect"});
    for (const peer of room.players.values()) {
      try { peer.socket.close(1000,"room closed"); } catch (_) {}
    }
    rooms.delete(room.code);
  }
}
function assignClient(socket, room, player) {
  clients.set(socket,{roomCode:room.code,playerId:player.id});
  player.socket = socket;
  room.players.set(player.id,player);
  room.lastActive = Date.now();
}
function makePlayer(socket, name, team) {
  return {
    id:crypto.randomUUID(),
    name:safeString(name || "トレーナー",18) || "トレーナー",
    team,
    socket
  };
}
function assignGen9Client(socket, room, player) {
  clients.set(socket,{gen9RoomCode:room.code,playerId:player.id});
  player.socket=socket;
  room.players.set(player.side,player);
  room.lastActive=Date.now();
}
function makeGen9Player(socket,name,team,side) {
  return {id:crypto.randomUUID(),side,name:safeString(name || "トレーナー",18) || "トレーナー",team,socket,token:null};
}
async function startGen9RoomBattle(room, p1, player) {
  room.phase = "starting";
  try {
    const p1Snapshot=await gen9Service.createBattle({
      playerTeam:p1.team,opponentTeam:player.team,
      player1Name:p1.name,player2Name:player.name,kind:"online"
    });
    const engineSession=gen9Service.get(p1Snapshot.battleId,p1Snapshot.token,"p1");
    const p2Snapshot=gen9Service.snapshot(engineSession,"p2",0);
    p1.token=p1Snapshot.token;
    player.token=p2Snapshot.token;
    room.battleId=p1Snapshot.battleId;
    room.tokens={p1:p1.token,p2:player.token};
    room.cursors={p1:p1Snapshot.logCursor||0,p2:p2Snapshot.logCursor||0};
    room.actions=new Map();
    room.phase="active";
    room.turn=1;
    const matchType=room.matchType==="random"?"random":"private";
    send(p1.socket,{type:"gen9-match-ready",roomCode:room.code,side:"p1",snapshot:p1Snapshot,playerName:p1.name,opponent:player.name,matchType});
    send(player.socket,{type:"gen9-match-ready",roomCode:room.code,side:"p2",snapshot:p2Snapshot,playerName:player.name,opponent:p1.name,matchType});
  } catch(error) {
    const message=error.message || "Showdown対戦を開始できませんでした。";
    console.error("[gen9-match] battle startup failed", room.code, room.matchType || "private", error?.stack || error);
    for(const p of room.players.values())send(p.socket,{type:"gen9-room-error",message});
    gen9Rooms.delete(room.code);
    for(const p of room.players.values())try{p.socket.close(1011,"battle startup failed");}catch(_){}
    if(room.battleId)gen9Service.destroy(room.battleId);
  }
}
async function joinGen9Room(socket,payload) {
  detach(socket,"replaced");
  const code=safeString(payload.roomCode,6).toUpperCase();
  const room=gen9Rooms.get(code);
  if(!room||room.phase!=="waiting"||room.players.size!==1) {
    send(socket,{type:"error",message:"そのプライベートルームは見つからないか、すでに満員です。"});
    return;
  }
  const team=gen9Service.validateTeam(sanitizeGen9Team(payload.team));
  const player=makeGen9Player(socket,payload.playerName,team,"p2");
  assignGen9Client(socket,room,player);
  const p1=room.players.get("p1");
  await startGen9RoomBattle(room,p1,player);
}
async function joinGen9RandomQueue(socket,payload) {
  detach(socket,"replaced");
  const team=gen9Service.validateTeam(sanitizeGen9Team(payload.team));
  // Discard stale queue entries before choosing the oldest available opponent.
  for(let i=randomMatchQueue.length-1;i>=0;i--){
    if(randomMatchQueue[i].socket.readyState!==WebSocket.OPEN){
      randomMatchQueue.splice(i,1);
    }
  }
  const waitingIndex=randomMatchQueue.findIndex(entry=>entry.socket!==socket);
  if(waitingIndex<0){
    randomMatchQueue.push({
      socket,
      team,
      name:safeString(payload.playerName || "トレーナー",18) || "トレーナー",
      joinedAt:Date.now()
    });
    clients.set(socket,{randomQueued:true});
    send(socket,{type:"gen9-random-queued",position:randomMatchQueue.length});
    console.info("[gen9-matchmaking] player queued", "queueSize="+randomMatchQueue.length);
    return;
  }
  const waiting=randomMatchQueue.splice(waitingIndex,1)[0];
  clients.set(waiting.socket,{});
  const code=makeRoomCode();
  const p1=makeGen9Player(waiting.socket,waiting.name,waiting.team,"p1");
  const p2=makeGen9Player(socket,payload.playerName,team,"p2");
  const room={
    code,players:new Map(),phase:"starting",battleId:null,tokens:null,
    actions:new Map(),cursors:{p1:0,p2:0},turn:1,
    createdAt:Date.now(),lastActive:Date.now(),resolving:false,matchType:"random"
  };
  gen9Rooms.set(code,room);
  assignGen9Client(waiting.socket,room,p1);
  assignGen9Client(socket,room,p2);
  console.info("[gen9-matchmaking] players paired", "room="+code);
  await startGen9RoomBattle(room,p1,p2);
}
async function handleGen9Action(socket,payload) {
  const client=clients.get(socket)||{};
  const room=client.gen9RoomCode?gen9Rooms.get(client.gen9RoomCode):null;
  const player=room?.players.get(client.playerId===room.players.get("p1")?.id?"p1":"p2");
  if(!room||!player||room.phase!=="active") {
    send(socket,{type:"error",message:"第9世代の対戦ルームに参加していません。"});
    return;
  }
  if(room.resolving) {
    send(socket,{type:"error",message:"相手の行動を処理中です。"});
    return;
  }
  if(room.actions.has(player.side)) {
    send(socket,{type:"error",message:"このターンの行動は送信済みです。"});
    return;
  }
  try {
    gen9Service.validateAction(room.battleId,player.token,player.side,payload.action||{});
    room.actions.set(player.side,payload.action||{});
    send(socket,{type:"gen9-action-accepted",turn:room.turn});
    if(room.actions.size<2)return;
    room.resolving=true;
    const updates=await gen9Service.submitOnlineTurn(
      room.battleId,room.tokens.p1,room.tokens.p2,
      {p1:room.actions.get("p1"),p2:room.actions.get("p2")},
      room.cursors.p1,room.cursors.p2
    );
    room.actions.clear();
    room.turn+=1;
    room.cursors={p1:updates.p1.logCursor||room.cursors.p1,p2:updates.p2.logCursor||room.cursors.p2};
    room.phase=updates.p1.done?"ended":"active";
    for(const [side,update] of [["p1",updates.p1],["p2",updates.p2]]) {
      const recipient=room.players.get(side);
      if(recipient)send(recipient.socket,{type:"gen9-battle-update",snapshot:update});
    }
    room.lastActive=Date.now();
  } catch(error) {
    room.actions.delete(player.side);
    send(socket,{type:"error",message:error.message || "行動を処理できませんでした。"});
  } finally {
    room.resolving=false;
  }
}
function sanitizeAction(action, player, opponent) {
  if (!action || typeof action !== "object") throw new Error("行動データが不正です。");
  const actorUid = safeString(action.actorUid,96);
  const actor = player.team.find((mon) => mon.uid === actorUid);
  if (!actor) throw new Error("自分のチームにいないポケモンの行動です。");
  const slot = Math.max(0,Math.min(1,Math.floor(Number(action.slot)||0)));
  if (action.switchTo != null) {
    const switchTo = Math.floor(Number(action.switchTo));
    if (!Number.isInteger(switchTo) || switchTo < 0 || switchTo >= player.team.length) {
      throw new Error("交代先が不正です。");
    }
    return {actorUid,moveId:null,targetUid:null,slot,switchTo,mega:!!action.mega};
  }
  const moveId = safeSlug(action.moveId,64);
  if (!moveId || !actor.moves.some((move) => move.id === moveId)) {
    throw new Error("そのポケモンが覚えていない技です。");
  }
  const targetUid = action.targetUid == null ? null : safeString(action.targetUid,96);
  if (targetUid && !opponent.team.some((mon) => mon.uid === targetUid)) {
    throw new Error("攻撃対象が不正です。");
  }
  return {actorUid,moveId,targetUid,slot,mega:!!action.mega};
}
function handleMessage(socket, payload) {
  const state = clients.get(socket) || {};
  const type = safeString(payload?.type,40);
  if(type==="create-gen9-room") {
    detach(socket,"replaced");
    const team=gen9Service.validateTeam(sanitizeGen9Team(payload.team));
    const code=makeRoomCode();
    const player=makeGen9Player(socket,payload.playerName,team,"p1");
    const room={code,players:new Map(),phase:"waiting",battleId:null,tokens:null,actions:new Map(),cursors:{p1:0,p2:0},turn:1,createdAt:Date.now(),lastActive:Date.now(),resolving:false};
    gen9Rooms.set(code,room);
    assignGen9Client(socket,room,player);
    send(socket,{type:"gen9-room-created",roomCode:code,playerId:player.id});
    return;
  }
  if(type==="join-gen9-room") {
    void joinGen9Room(socket,payload).catch(error=>send(socket,{type:"error",message:error.message || "プライベートルームに参加できませんでした。"}));
    return;
  }
  if(type==="random-match-join") {
    void joinGen9RandomQueue(socket,payload).catch(error=>{
      console.error("[gen9-matchmaking] queue join failed",error?.stack||error);
      send(socket,{type:"error",message:error.message || "ランダムマッチに参加できませんでした。"});
    });
    return;
  }
  if(type==="random-match-cancel") {
    const removed=removeRandomQueueEntry(socket);
    const state=clients.get(socket)||{};
    if(state.randomQueued)clients.set(socket,{});
    send(socket,{type:"gen9-random-cancelled",wasQueued:removed || !!state.randomQueued});
    console.info("[gen9-matchmaking] queue cancel", "removed="+(removed || !!state.randomQueued));
    return;
  }
  if(type==="gen9-action") {
    void handleGen9Action(socket,payload);
    return;
  }
  if(type==="leave-gen9-room") {
    detach(socket,"leave");
    send(socket,{type:"gen9-left-room"});
    return;
  }
  if(type==="gen9-forfeit") {
    const client=clients.get(socket)||{};
    const room=client.gen9RoomCode?gen9Rooms.get(client.gen9RoomCode):null;
    const side=room?.players.get("p1")?.id===client.playerId?"p1":"p2";
    if(room&&room.phase==="active") {
      const winner=side==="p1"?"p2":"p1";
      room.phase="ended";
      const p=room.players.get(winner);
      if(p)send(p.socket,{type:"gen9-forfeit-win"});
      const forfeiter=room.players.get(side);
      if(forfeiter)send(forfeiter.socket,{type:"gen9-forfeit-lost"});
      if(room.battleId)gen9Service.destroy(room.battleId);
    }
    return;
  }
  if (type === "create-room") {
    detach(socket,"replaced");
    const team = sanitizeTeam(payload.team);
    const code = makeRoomCode();
    const room = {
      code,hostId:null,players:new Map(),phase:"waiting",turn:1,actions:new Map(),
      createdAt:Date.now(),lastActive:Date.now(),snapshotTurn:0
    };
    const player = makePlayer(socket,payload.playerName,team);
    room.hostId = player.id;
    rooms.set(code,room);
    assignClient(socket,room,player);
    send(socket,{type:"room-created",roomCode:code,playerId:player.id});
    return;
  }
  if (type === "join-room") {
    detach(socket,"replaced");
    const code = safeString(payload.roomCode,6).toUpperCase();
    const room = rooms.get(code);
    if (!room || room.phase !== "waiting" || room.players.size !== 1) {
      send(socket,{type:"error",message:"そのルームは見つからないか、すでに満員です。"});
      return;
    }
    const team = sanitizeTeam(payload.team);
    const player = makePlayer(socket,payload.playerName,team);
    assignClient(socket,room,player);
    send(socket,{type:"room-joined",roomCode:room.code,playerId:player.id});
    room.phase = "active";
    room.turn = 1;
    const players = Array.from(room.players.values()).map((p) => ({id:p.id,name:p.name,team:p.team}));
    broadcast(room,{type:"match-ready",roomCode:room.code,hostId:room.hostId,players});
    return;
  }

  const room = state.roomCode ? rooms.get(state.roomCode) : null;
  const player = room ? room.players.get(state.playerId) : null;
  if (type === "ping") { send(socket,{type:"pong",at:Date.now()}); return; }
  if (type === "leave-room") {
    detach(socket,"leave");
    send(socket,{type:"left-room"});
    return;
  }
  if (type === "forfeit") {
    if (!room || !player) return;
    room.phase = "ended";
    broadcast(room,{type:"forfeit",playerId:player.id},player.id);
    return;
  }
  if (!room || !player) {
    send(socket,{type:"error",message:"ルームに参加してから操作してください。"});
    return;
  }
  room.lastActive = Date.now();

  if (type === "turn-action") {
    if (room.phase !== "active") {
      send(socket,{type:"error",message:"このルームは対戦中ではありません。"});
      return;
    }
    const turn = Math.floor(Number(payload.turn));
    if (turn !== room.turn) {
      send(socket,{type:"error",message:"ターンがずれています。相手の画面を確認してください。"});
      return;
    }
    if (room.actions.has(player.id)) {
      send(socket,{type:"error",message:"このターンの行動はすでに送信されています。"});
      return;
    }
    const opponent = Array.from(room.players.values()).find((p) => p.id !== player.id);
    if (!opponent) return;
    const action = sanitizeAction(payload.action,player,opponent);
    room.actions.set(player.id,{playerId:player.id,action});
    if (room.actions.size === 2) {
      const actions = Array.from(room.actions.values());
      broadcast(room,{type:"turn-actions",roomCode:room.code,turn:room.turn,actions});
    } else {
      send(socket,{type:"action-accepted",turn});
    }
    return;
  }

  if (type === "battle-snapshot") {
    if (player.id !== room.hostId) {
      send(socket,{type:"error",message:"対戦状態を送信できるのはルーム作成者だけです。"});
      return;
    }
    const battle = payload.battle;
    if (!battle || typeof battle !== "object" || !Array.isArray(battle.playerTeam) || !Array.isArray(battle.enemyTeam)) {
      send(socket,{type:"error",message:"対戦状態の形式が不正です。"});
      return;
    }
    const turn = Math.floor(Number(battle.turn));
    if (!Number.isInteger(turn) || turn < 1 || turn > 10000) {
      send(socket,{type:"error",message:"対戦ターンが不正です。"});
      return;
    }
    if (!room.snapshotTurn) {
      if (turn !== 1) return;
      room.snapshotTurn = 1;
    } else {
      if (turn !== room.turn + 1 && turn !== room.turn) {
        send(socket,{type:"error",message:"対戦状態のターンが一致しません。"});
        return;
      }
      if (turn > room.turn) {
        room.turn = turn;
        room.actions.clear();
      }
    }
    const json = JSON.stringify(battle);
    if (Buffer.byteLength(json,"utf8") > MAX_MESSAGE_BYTES) {
      send(socket,{type:"error",message:"対戦データが大きすぎます。"});
      return;
    }
    if (battle.result) room.phase = "ended";
    broadcast(room,{type:"battle-snapshot",turn,battle},player.id);
    return;
  }

  send(socket,{type:"error",message:"未対応のメッセージです。"});
}

const server = http.createServer((req,res) => {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  if (requestUrl.pathname.startsWith("/api/audit/")) {
    void autoAuditLab.handle(req, res, requestUrl).catch(error => {
      console.error("[audit-lab] API request failed:", error?.stack || error);
      if (!res.headersSent && !res.destroyed) {
        sendJson(res, 500, { error: "自動検証APIで内部エラーが発生しました。" });
      } else if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    });
    return;
  }
  if (requestUrl.pathname.startsWith("/api/gen9/")) {
    void handleGen9Api(req, res, requestUrl);
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405,{"Content-Type":"text/plain; charset=utf-8","Allow":"GET, HEAD"});
    res.end("Method Not Allowed");
    return;
  }
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/health" || url.pathname === "/healthz") {
    res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});
    res.end("ok");
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch (_) { res.writeHead(400); res.end("Bad path"); return; }
  if (pathname.includes("\0")) { res.writeHead(400); res.end("Bad path"); return; }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/,"");
  const target = path.resolve(ROOT,relative);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  let file = target;
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file,"index.html");
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error("Not a file");
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200,{
      "Content-Type":MIME[ext] || "application/octet-stream",
      "Content-Length":stat.size,
      "Cache-Control":ext === ".html" ? "no-cache" : "public, max-age=1800",
      "X-Content-Type-Options":"nosniff"
    });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  } catch (_) {
    res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});
    res.end("Not Found");
  }
});

const wss = new WebSocketServer({noServer:true,maxPayload:MAX_MESSAGE_BYTES});
server.on("upgrade",(req,socket,head) => {
  let pathname = "/";
  try { pathname = new URL(req.url || "/", "http://localhost").pathname; } catch (_) {}
  if (pathname !== "/ws") {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req,socket,head,(ws) => wss.emit("connection",ws,req));
});

wss.on("connection",(socket) => {
  clients.set(socket,{});
  let messageCount = 0;
  let windowStarted = Date.now();
  socket.on("message",(buffer) => {
    const now = Date.now();
    if (now - windowStarted > 10000) { windowStarted = now; messageCount = 0; }
    messageCount++;
    if (messageCount > 40) {
      send(socket,{type:"error",message:"短時間に送信しすぎです。少し待ってください。"});
      socket.close(1008,"rate limit");
      return;
    }
    let payload;
    try { payload = JSON.parse(buffer.toString("utf8")); }
    catch (_) { send(socket,{type:"error",message:"メッセージ形式が不正です。"}); return; }
    try { handleMessage(socket,payload); }
    catch (error) {
      send(socket,{type:"error",message:error.message || "サーバー内部エラー"});
    }
  });
  socket.on("close",() => detach(socket,"disconnect"));
  socket.on("error",() => detach(socket,"socket-error"));
});

const cleanup = setInterval(() => {
  const now = Date.now();
  gen9Service.removeExpired();
  for(let i=randomMatchQueue.length-1;i>=0;i--){
    const entry=randomMatchQueue[i];
    if(now-entry.joinedAt>ROOM_TTL_MS || entry.socket.readyState!==WebSocket.OPEN){
      randomMatchQueue.splice(i,1);
      if(clients.get(entry.socket)?.randomQueued)clients.set(entry.socket,{});
      send(entry.socket,{type:"gen9-random-cancelled",reason:"expired"});
    }
  }
  for (const room of gen9Rooms.values()) {
    if(now-room.lastActive>ROOM_TTL_MS) {
      for(const player of room.players.values())send(player.socket,{type:"error",message:"第9世代ルームの有効期限が切れました。"});
      if(room.battleId)gen9Service.destroy(room.battleId);
      for(const player of room.players.values())try{player.socket.close(1000,"room expired");}catch(_){}
      gen9Rooms.delete(room.code);
    }
  }
  for (const room of rooms.values()) {
    if (now - room.lastActive > ROOM_TTL_MS) {
      broadcast(room,{type:"error",message:"ルームの有効期限が切れました。"});
      for (const player of room.players.values()) {
        try { player.socket.close(1000,"room expired"); } catch (_) {}
      }
      rooms.delete(room.code);
    }
  }
},60000);
cleanup.unref();

server.listen(PORT,HOST,() => {
  console.log("[pokemon-champions-online] listening on " + HOST + ":" + PORT);
  void autoAuditLab.init().catch(error => {
    console.error("[audit-lab] initialization failed:", error?.message || error);
  });
});
function shutdown() {
  clearInterval(cleanup);
  for (const room of gen9Rooms.values()) {
    if(room.battleId)gen9Service.destroy(room.battleId);
    for(const player of room.players.values())try{send(player.socket,{type:"error",message:"サーバーを再起動しています。"});player.socket.close(1012,"server restart");}catch(_){}
  }
  for (const room of rooms.values()) {
    broadcast(room,{type:"error",message:"サーバーを再起動しています。"});
    for (const player of room.players.values()) {
      try { player.socket.close(1012,"server restart"); } catch (_) {}
    }
  }
  wss.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(0),5000).unref();
}
process.on("SIGTERM",shutdown);
process.on("SIGINT",shutdown);
