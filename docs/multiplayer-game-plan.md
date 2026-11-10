# Multiplayer game: plan (draft, 10 November 2026)

A real-time multiplayer game on a static site: **no accounts, no database, no game server of ours.** We provide the map, the characters and the rules. Each player's progress lives in their own browser.

## The one hard fact

GitHub Pages cannot run game logic, and browsers cannot connect to each other without help finding each other. So "no server" really means **one of the players' browsers acts as the host**, and the players connect directly with WebRTC. The only outside service needed is a tiny "introduction" step. Everything else stays private and free.

## Decisions to make (recommendations first)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | How do players find each other? | **Room codes** through a free public introduction relay (Trystero or PeerJS), with a **copy and paste code fallback** that needs no relay at all. |
| 2 | Who runs the game? | The **host's browser** (host-authoritative). Others send their inputs; the host sends back 20 snapshots a second. |
| 3 | Game type for version 1 | **Coin Rush**: a top-down map, 2 to 6 players, collect coins for 2 minutes, most coins wins. Easy to understand, short rounds, no violence, fair on phones. |
| 4 | Chat | **No free text.** Emoji and a few quick phrases only. Keeps the site safe for ads and for children. |
| 5 | Names | Chosen locally, checked against a word filter, shown only to people in the room. |
| 6 | Saving | `localStorage`: name, character look, coins, wins, unlocked looks. A **save code** to copy to another device (no server). |
| 7 | Ads | Only on the lobby and info pages, **never during a round**. |

## What players see

1. **Game page** `/games/coin-rush/` with a how-to-play section, FAQ and the same SEO structure as the other games.
2. **Pick a character:** body colour, hat, face, name. Saved in the browser.
3. **Play alone** (against bots, works offline) or **Play with friends**.
4. Play with friends: a consent line ("To connect, your browser contacts an introduction service and your friends' browsers see your network address") then **Create room** (shows a 5-letter code and a share link) or **Join room** (type the code).
5. Lobby shows who is in, then the host starts the round. Result screen shows the ranking and a Play again button.

## How it works inside

- **Transport interface** with three implementations: `LocalTransport` (bots and tests), `WebRtcTransport` (real play), `ManualTransport` (copy and paste codes). The game code never knows which one is used.
- **Host-authoritative simulation:** a fixed 20 ticks a second loop in pure TypeScript (`lib/games/coin-rush.ts`), the same style as the existing games, so it is unit-testable with Vitest and has no DOM.
- **Client:** draws on a `<canvas>`, sends its direction and actions, interpolates the host's snapshots. A little local prediction for the player's own character keeps it smooth.
- **Maps:** tile grids stored as JSON in `content/games/maps/` (walls, spawn points, coin spots). Start with 3 maps, add more over time without code changes.
- **Characters:** drawn in code (shapes and colours), so there are no image files and no licensing issues. Hats and faces are data.
- **Mobile:** an on-screen joystick, large touch targets, keyboard (arrows or WASD) on desktop. Landscape and portrait both work.
- **Bundle:** loaded on demand with `next/dynamic`, like the tools, so other pages keep their size. Target under 150 KB for the game chunk (the relay library is the largest part).

## Privacy and policy (must be right before launch)

- The site's promise is "nothing is sent". This game is the **one exception, and only after the player clicks Connect.** The offline and bot modes send nothing.
- Update the privacy policy and the game page: what the relay sees (room code and connection details), that peers see each other's network address, and that nothing is stored on our side.
- Update the Content Security Policy to allow only the chosen relay's address, and only on the game page.
- Update the privacy e2e test: it must still prove that the game page sends nothing until Connect is pressed.
- No personal data is collected, so no accounts, no cookies beyond the existing consent rules.

## Phases

| Phase | Work | Done when |
| --- | --- | --- |
| 0 | Decide the open questions below | You approve this plan |
| 1 | Engine, map renderer, characters, solo play with bots, save to browser | Playable offline on phone and desktop |
| 2 | Transport interface, `LocalTransport`, deterministic tests | Simulation tests pass, two simulated clients agree |
| 3 | `WebRtcTransport`, room codes through the relay, `ManualTransport` fallback | Two browsers play one round |
| 4 | Lobby, names, quick phrases, ready and rematch, disconnect handling | Four players finish a round, a dropped player does not freeze the game |
| 5 | Polish: sounds (optional), 3 maps, 8 hats, touch controls, accessibility (keyboard, reduced motion, text alternative for status) | Passes the accessibility and responsive tests |
| 6 | Game page SEO, guide article, privacy and CSP updates, performance budget, real-device testing | Passes the full e2e suite, tested on two real phones over mobile data |

Phases 1 and 2 need no outside service and are useful on their own, because they give the site a good solo game even if multiplayer is delayed.

## Testing

- **Vitest:** rules, scoring, collisions, snapshot encoding, save and load, name filter.
- **Playwright:** two browser pages in one test join the same room over real WebRTC on localhost, play a round and compare scores. Plus the privacy, accessibility, responsive and performance tests every page already has.
- **Manual:** two phones on different networks, because office and mobile networks block direct connections more than home Wi-Fi.

## Risks

- **Some networks block direct connections** (strict mobile carriers and company Wi-Fi). Without a relay for traffic ("TURN") roughly 10 to 20 percent of pairs cannot connect. Mitigation: show a clear "could not connect" message and suggest another network; a paid TURN service is only added if this proves common.
- **The free introduction relay can disappear or be slow.** Mitigation: the copy and paste fallback, and an easy swap to another relay since it sits behind the transport interface.
- **Cheating.** The host could change its own score. We accept this: it is a friendly game with no prizes and no ranking across rooms.
- **Hosts leaving.** Version 1 ends the round for everyone with a clear message. Host migration is a later improvement.
- **Phones pause background tabs,** so a player who switches apps appears to disconnect. Mitigation: a short reconnect window.
- **Moderation:** no free text and a name filter keep this small. A report link by email is enough for now.
- **AdSense:** a game page needs real content around it (how to play, strategy tips, FAQ) so it is not judged thin.

## Open questions for you

1. Is **Coin Rush** the right first game, or do you want something else (tag, capture the flag, a shared hangout map, racing)?
2. How many players: 2 to 4, or up to 6 or 8?
3. Are you comfortable using a **free public introduction relay**, disclosed on the page? If not, version 1 is copy and paste codes only, which is private but clumsier.
4. Quick phrases and emoji only, or do you want free text chat (needs moderation and raises the AdSense risk)?
5. Should the game wait until the AdSense review is decided? It does not need to, but more thin pages before the review is the risk we are managing now.
