# Conflict Regale — Game Design Notes

## Goal

Conflict Regale is a fair, approachable two-lane arena battler inspired by lane-based mobile strategy games. The first prototype focuses on readable combat and quick testing without over-levelled opponents deciding the match immediately.

## Current arena

- Babylon.js renders a top-down 3D arena.
- A river divides the two sides of the map.
- Two bridges at the left and right lanes are the only intended river crossings.
- Player 1 starts at the bottom; the opponent starts at the top.
- Each side has two destructible towers.

## Units and cards

The player has eight cards and sees four at once. The hand can be paged with the arrow buttons. Cards currently include Warrior, Knight, Ranger, Brute, Scout, Guard, Mage, and Champion.

Every card has a cost, damage, range, health, and movement speed. Elixir starts at 5, regenerates smoothly at one point every 2.5 seconds, and is capped at 10. The UI shows a filling meter with one tick per elixir level.

Troops are assembled from local Babylon.js primitives rather than image assets. Outfits and weapons identify their roles:

- Rangers use bows and arrows.
- Mages use cloaks, pointed hats, staffs, and fireballs.
- Knights and Guards use armor, swords, and shields.
- Brutes and Champions use heavy hammers; Brutes also have a fur caveman outfit.
- Scouts use hoods and sashes.

All troops and towers have floating health bars with numeric health values. Melee weapons animate during attacks, while ranged units launch visible projectiles.

## Combat rules

- Troops seek the nearest enemy tower as their default objective.
- Enemy troops within 16 world units take priority, so opposing troops interrupt tower attacks and fight each other instead of walking through one another.
- Troops navigate toward the nearest bridge when crossing the river.
- Towers automatically attack enemy troops within five world units.
- A tower or troop is removed when its health reaches zero.

## Single-player testing

Single Player starts a local match without networking. The bot has its own finite elixir pool: it starts at 5, regenerates at exactly the same rate as the player, and must pay card costs. It deploys strong units with only a modest health bonus, making it challenging without infinite-resource cheating.

## Match flow

Destroying all enemy towers produces a Victory screen. Losing all player towers produces a Defeat screen. Both outcomes offer a Play Again button that reloads the prototype.

## Multiplayer foundation

Host and Join use PeerJS with its public broker for testing. Unit spawn messages are sent across the connection. This is prototype networking only; authoritative combat state, matchmaking, reconnection, and anti-cheat validation are future work.

## Local structure

- `index.html` — menu, game HUD, cards, elixir meter, and result screen.
- `css/style.css` — responsive overlay and card/HUD styling.
- `js/game.js` — Babylon.js scene, units, towers, combat, bot, cards, and match flow.
- `js/network.js` — PeerJS host/join flow and game-start messaging.
- `lib/` — locally downloaded Babylon.js and PeerJS runtime files.
