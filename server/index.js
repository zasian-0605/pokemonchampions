"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { WebSocketServer, WebSocket } = require("ws");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 10000);
const HOST = "0.0.0.0";
const ROOM_TTL_MS = 20 * 60 * 1000;
const MAX_TEAM_SIZE = 6;
const MAX_MESSAGE_BYTES = 512 * 1024;
const rooms = new Map();
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
function sanitizeTeam(input) {
  if (!Array.isArray(input) || input.length !== MAX_TEAM_SIZE) {
    throw new Error("チームは6匹にしてください。");
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
    if (!rooms.has(code)) return code;
  }
  throw new Error("ルームを作成できませんでした。もう一度試してください。");
}
function detach(socket, reason) {
  const state = clients.get(socket);
  if (!state || !state.roomCode) return;
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
});
function shutdown() {
  clearInterval(cleanup);
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
