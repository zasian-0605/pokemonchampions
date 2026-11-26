# Pokémon Champions 2D — Online Room Server

This folder contains the WebSocket room relay and a small static-file host for the existing game.

## Deploy on Render

The repository root contains `render.yaml`. Create a Blueprint deployment from this repository and choose the Render workspace you intend to use. The service is named `pokemonchampions-online`.

- Runtime: Node.js
- Build command: `npm --prefix server install`
- Start command: `npm --prefix server start`
- Health check: `/health`
- WebSocket endpoint: `wss://YOUR-SERVICE.onrender.com/ws`

The service also serves the game at its root URL. Open the service URL directly to use the game and its online feature on the same origin. If the game is hosted separately, paste the WebSocket URL into the Online page's server URL field.

## Room protocol

- The room creator hosts the turn simulation in their browser.
- The server creates a six-character room code and relays both players' team data and actions.
- The host resolves a turn with the existing game engine and sends the updated state to the opponent.
- Rooms are held in memory and expire after 20 minutes without activity.

This is a casual, room-code prototype, not a ranked or anti-cheat service. The host browser is authoritative, so a modified host client could cheat. If the host closes the tab or loses connection, the room ends. The server does not store player accounts or saved teams.

## Pokémon Showdown data

The browser retrieves Showdown moves, abilities, and items data for reference metadata. Functions in Showdown's simulator data files are not executed as arbitrary browser code. Only mechanics implemented in this fan game's battle engine are applied; loading an item or ability's description does not guarantee every special effect is reproduced.
