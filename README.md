# Frontline Ops: Tactical FPS (`v3.5`)

**Frontline Ops** is a browser-based 3D First-Person Shooter powered by **React**, **TypeScript**, **Three.js**, and **Tailwind CSS**, combining Call of Duty-style tactical gunplay, full 3D GLB soldier/enemy models, and Free Fire / BGMI mobile touch mechanics.

---

## Core Features

### Game Modes
- **Team Deathmatch (5v5)**: Task Force 141 vs KORTAC squad combat.
- **Battle Royale (Bermuda — Free Fire Rules)**: 220×220m island combat with EP energy inhalers, launch pads/gliders, shrinking safe zones, danger airstrikes, and **BOOYAH!** victory.
- **Free For All**: Solo skirmish with fast respawns.
- **Gun Game**: 10-tier weapon escalation with every elimination.
- **Firing Range (Training)**: Live DPS telemetry, ballistics rangefinder, moving armored steel targets, and accuracy tracking.

### Combat, Armory & Operator Roster
- **Weapon Arsenal & Gunsmith**: Assault rifles (`M4`, `AK-47`, `SCAR`), SMGs (`MP5`, `Vector`), Shotgun, Sniper Rifle, and Desert Eagle — complete with PBR weapon skins/camos, variable optics (`Iron Sights`, `Reflex`, `Holo 553`, `ACOG 4x`, `Variable 4x–12x`), custom reticle styles/colors, and an isolated 3D Gunsmith weapon inspection stage.
- **3D Character & Multi-Model Enemy Roster**: Rigged GLB operator and enemy variants (`Vanguard Soldier`, `Covert Operative Michelle`, `Cyber Frame X-Bot`) with proper two-handed weapon grip, IK/pose alignment, footsteps, and tactical radio callouts.
- **Tactical Movement & Mechanics**: Tactical sprint, crouch, sprint-slide, dolphin dive, ledge mantling, peek & lean (`<` / `>`), weapon mounting, breath hold steady-aim, frag grenades, tactical smoke/motion sensors, and scorestreaks (`UAV`, `Precision Airstrike`, `Sentry Turret`, `Tactical Nuke`).

### Mobile Touch Controls (`rokobuljan/gamepad` + Free Fire / BGMI Style)
- **Draggable Fire Button (Free Fire Drag-Shot)**: Primary right-side **FIRE** button features an inner sliding core and soft outer-ring drag tracking — drag upward or sideways while shooting to control recoil and land drag-headshots, then release to snap cleanly back.
- **Dedicated RUN / Auto-Sprint Lock**: Toggle continuous forward sprint with automatic disengage on backward joystick pull, ADS, crouch/slide, or respawn.
- **Custom HUD Layout Editor**: Drag and reposition all 12 controls anywhere on screen, tune button size (`60%–150%`), opacity (`25%–100%`), toggle secondary button visibility, adjust touch look sensitivity (`0.4x–2.5x`), or switch between **2-Finger Classic**, **3-Finger Claw**, and **4-Finger Claw** presets (saved in `localStorage`).

---

## Controls

| Action | Desktop (Keyboard / Mouse) | Mobile Touch Gamepad |
| --- | --- | --- |
| Move | `W A S D` / Arrow Keys | Floating Left Analog Stick |
| Auto-Run / Sprint | `Shift` / Double-Tap `Shift` | **RUN** Lock Button / Full Stick Forward |
| Fire | `Left Click` | **Draggable FIRE** (Right) / Quick **FIRE** (Left) |
| Aim Down Sights (ADS) | `Right Click` | **ADS** Toggle |
| Jump / Mantle | `Space` | **JUMP** Button |
| Crouch / Slide / Dive | `C` / `Ctrl` | **CRCH / SLIDE** Button |
| Reload | `R` | **RLD** Button |
| Melee / Variable Zoom | `V` | **KNIFE / ZOOM** Button |
| Frag / Tactical | `G` / `Q` (`X` toggle) | **FRAG** / **TAC** Buttons |
| Peek & Lean | `<` / `>` | HUD Lean Triggers |
| Gunsmith / Pause / Score | `B` / `Esc` or `P` / `Tab` | Top-Right Touch Utility Bar (`HUD`, `TAB`, `ARMORY`, `\|\|`) |

---

## Tech Stack & Project Structure

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **3D Engine**: Three.js (`GLTFLoader`, `SkeletonUtils`, custom procedural/PBR maps, dynamic lighting & shadows)
- **Key Modules**:
  - `src/App.tsx` — HQ lobby, game lifecycle, HUD & modal orchestration
  - `src/game/engine.ts` — Core Three.js loop, maps, weather/graphics, match rules
  - `src/game/controller.ts` — First-person movement, recoil springs, ballistics, mobile & auto-run input
  - `src/game/character_loader.ts` & `src/game/models.ts` — GLB player/bot/weapon rendering
  - `src/game/gamepad/` — Typed multi-touch virtual controller library (`Button`, `Joystick`, `DPad`, `Gamepad`)
  - `src/game/mobile_layout.ts` & `src/components/MobileHudCustomizer.tsx` — Custom HUD presets & persistence
  - `src/components/MobileGamepad.tsx` — In-match touch controls & draggable Fire trigger

---

## Local Development

```bash
npm install
npm run dev      # Starts Vite dev server on http://localhost:3000
npm run lint     # Runs TypeScript type-check (tsc --noEmit)
npm run build    # Builds production bundle into dist/
```

---

## Contact

For collaboration, feedback, or bug reports: **romendraroy4@gmail.com**
