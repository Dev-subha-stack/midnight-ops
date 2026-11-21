# Project Milestones — Frontline Ops: Tactical FPS

Tracking major development milestones, architecture upgrades, and version releases from initial prototype to `v3.5`.

---

## Milestone 1: Core 3D Engine & Tactical Combat Foundation (`v1.0 – v2.0`)
- [x] Built Three.js first-person engine with collision detection, dynamic weather presets (`Noon`, `Evening`, `Night`), and graphics tiers (`Smooth`, `Standard`, `Extreme RTX`).
- [x] Implemented 5 playable modes: **Team Deathmatch**, **Battle Royale (Bermuda)**, **Free For All**, **Gun Game**, and **Firing Range**.
- [x] Added spring-damper recoil, ADS zoom, bullet drop telemetry, scorestreaks (`UAV`, `Airstrike`, `Sentry`, `Nuke`), frag/tactical equipment, and spatial Web Audio sound effects.

## Milestone 2: Character Models, Enemy Roster & Weapon Grip Fixes (`v2.1 – v2.8`)
- [x] Integrated rigged GLB 3D character models with two-handed firearm attachment alignment for both the player operator and AI bots.
- [x] Fixed weapon-holding visibility and hand/arm pose alignment bugs across player shadows, lobby preview, and enemy combatants.
- [x] Expanded enemy diversity with multi-model GLB enemy presets (`Vanguard Soldier`, `Michelle`, `X-Bot`).

## Milestone 3: Call of Duty HQ UI Redesign & Gunsmith Isolation (`v3.0 – v3.2`)
- [x] Rebuilt the entire lobby, pause menu, settings, scoreboard, and combat HUD from scratch with a dark tactical `#090B0E` + `#A3E635` design language.
- [x] Updated **Gunsmith** 3D inspection view to showcase the customized weapon model directly (isolated from the full operator body) with camo, optic, and reticle previews.
- [x] Standardized clean versioned launch URLs (`/?v=X.Y`).

## Milestone 4: Mobile Gamepad Architecture (`v3.3`)
- [x] Ported and strongly typed the `rokobuljan/gamepad` virtual controller engine (`Gamepad`, `Joystick`, `Button`, `DPad`) to TypeScript.
- [x] Added multi-touch mobile controls (`Auto Detect`, `Always On`, `Off`), floating left movement joystick, touch-look aim surface, weapon swap D-pad, and compact mobile HUD layout.

## Milestone 5: Free Fire / BGMI Controls, Auto-Run & Custom HUD (`v3.4 – v3.5`)
- [x] **v3.4 — RUN Lock & Custom HUD Editor**:
  - Added dedicated **RUN / Auto-Sprint Lock** button with automatic cancel on backward stick pull, ADS, crouch/slide, or respawn.
  - Built interactive **Custom HUD** drag-and-drop editor with per-button scale (`60%–150%`), opacity (`25%–100%`), visibility toggles, touch sensitivity slider, **2-Finger / 3-Finger Claw / 4-Finger Claw** presets, and `localStorage` persistence.
- [x] **v3.5 — Free Fire Draggable Fire Button & Documentation**:
  - Upgraded the primary **FIRE** button from a steady static circle into a **Free Fire-style Draggable Fire Button** featuring an inner sliding fire core, soft outer ring drag follow, real-time drag-to-aim / drag-headshot tracking, and spring-back release.
  - Updated `README.md` and added `MILESTONES.md`.

---

## Upcoming / Next Milestones
- [ ] **Milestone 6**: Cloud profile sync & customizable HUD layout share codes.
- [ ] **Milestone 7**: Additional Battle Royale Bermuda landmarks, squad revive mechanics, and custom sensitivity curves per scope magnification.
