# Secret Easter Eggs: Solar Supernova Victory & Classic Game References

A high-impact secret easter egg system featuring an interactive 30-shot Sun Supernova event triggering cinematic cosmic destruction and instant match victory, paired with four hidden interactive map tributes honoring Minecraft, Call of Duty, Temple Run, and Halo.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were confirmed during Phase 1 interactive clarification:

- **Sun Blast Victory**: Firing 30 bullets into the Sun triggers an escalating solar instability effect culminating in a full Supernova blast wave and an instant match victory screen with an exclusive secret debriefing badge.
- **Weapon Compatibility**: Any firearm (assault rifles, SMGs, shotguns, sniper rifles, pistols) can register hits against the solar disc when aimed into the sky at the Sun.
- **Classic Game Tributes (Minecraft, CoD, Temple Run, Halo)**: Implemented as rich, hidden interactive map secrets featuring authentic 3D models, procedural audio cues, particle effects, and on-screen accolades.

---

## 1. Overview & Core Concept

### What It Does
- **The Solar Core Supernova**: Players who notice the radiant sun in the sky can shoot it. Each shot causes escalating visual flares, corona instability pulses, and resonant cosmic audio cues. Upon the 30th shot, the sun detonates in a cataclysmic supernova—a blinding shockwave sweeps the atmosphere, solar fire cascades across the sky, and the game triggers an instant "SOLAR DESTROYER" victory with custom debriefing celebration.
- **Hidden Game Reference Secrets**:
  1. **Minecraft Tribute**: A hidden blocky Obsidian & Diamond Ore cache hidden behind destructible walls. Shooting or interacting causes voxel crack particles, the iconic XP ding / block break audio, and an "Achievement Get: Diamonds!" accolade.
  2. **Call of Duty Tribute**: A classic weathered Mystery Box / Teddy Bear shrine with glowing question marks. Interacting triggers the iconic mystery box chime / hitmarker burst and a "Tactical Nuke Inbound" callout banner with an adrenaline reload boost.
  3. **Temple Run Tribute**: An ancient Golden Idol relic resting upon a mossy stone altar in a secluded ruin. Grabbing or shooting the idol triggers the iconic demon monkey screech, a temporary sprint surge, and the "Temple Relic Claimed" accolade.
  4. **Halo Tribute**: A gleaming energy-infused Master Chief 117 pedestal / energy blade shrine. Interacting triggers the iconic choir hum, Grunt Birthday Party confetti burst particles, and the legendary "Killing Spree / Spartan-117" announcer accolade.

---

## 2. User Experience & Visual Design

### Solar Supernova Escalation Stages
```
[Shots 1 - 10]  ──> Mini corona pulses, subtle solar flares, deep sub-bass pulse
[Shots 11 - 20] ──> Expanding orange flare spikes, heat shimmer distortion, warning hiss
[Shots 21 - 29] ──> Crimson solar flares, rapid pulsating corona, HUD telemetry countdown
[Shot 30: CRITICAL] ─> SUPERNOVA DETONATION: Blinding whiteout, expanding shockwave ring,
                       celestial fire particles, camera rumble, and instant match victory!
```

### Visual Identity & Theme
- **Solar Detonation FX**: High-energy radial flash, custom shockwave ring mesh in `celestialGroup`, procedural solar flare canvas expansion, and particle cascades.
- **Easter Egg Accolades**: Clean military HUD overlay medals using crisp monospace typography (`font-mono`) and glowing neon accents (Cyan `#06B6D4`, Gold `#EAB308`, Emerald `#10B981`, Purple `#A855F7`).
- **Secret Objects**:
  - *Minecraft*: Textured 16-bit block with diamond ore inlays and voxel shatter chunks.
  - *CoD*: Weathered wooden box with twin glowing mystery question marks and teddy bear icon.
  - *Temple Run*: Gilded Golden Demon Idol with metallic shine and glowing amber eyes.
  - *Halo*: Plasma cyan energy blade silhouette on a carbon-fiber UNSC tribute plinth.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Directional Raycast Sun Hit Detection
- **Chosen Approach**: When firing any firearm, calculate the dot product between the bullet direction and the directional sun vector `environment.activeSunVector.clone().normalize()`. If the angular threshold is within ~0.08 radians (about 4.5 degrees) and unobstructed by map ceilings, count a sun hit.
- **Why**: Eliminates the need for a physical mesh collider in the far plane, ensures zero performance impact on standard ballistics, and feels intuitive whether using iron sights, red dots, or high-magnification snipers.

### Decision 2: Instant Match Victory Flow
- **Chosen Approach**: At the 30th shot, trigger a 2.5-second cinematic slow-motion supernova explosion in the skybox with heavy bass rumble, followed by `engine.endMatch(true)` and passing an `easterEgg: 'solar_supernova'` tag to `GameOverModal`.
- **Why**: Gives the player a satisfying cinematic spectacle before cleanly transitioning to the victory screen.

### Decision 3: Discoverable Map Relics with Audio-Visual Payoff
- **Chosen Approach**: Place 2 easter egg shrines in Bermuda (e.g. Shipyard alcove and Clocktower basement/ruins) and 2 in Desert Outpost (e.g. subterranean bunker corner and rocky ridge overlook). Each relic has a subtle ambient hum and interaction prompt (`[F] Inspect Secret` or direct weapon hit).
- **Why**: Encourages exploration across both maps without cluttering the competitive combat flow.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│                              Game Engine                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Player Firing   │      │ Environment Sky  │      │  Secret Manager  │
│ (controller.ts)  │      │(environment.ts)  │      │(easter_eggs.ts)  │
└─────────┬────────┘      └─────────┬────────┘      └─────────┬────────┘
          │                         │                         │
          │ Dot-product raycast     │ Dynamic Celestial Disc  │ Interactive
          │ to activeSunVector      │ Supernova Shockwave     │ Map Shrines
          ▼                         ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Easter Egg Event Bus                            │
│  • Sun Hit Counter (0-30)        • Minecraft Voxel Shatter             │
│  • Solar Corona Flare Pulse      • CoD Mystery Box Jingle & Nuke Alert │
│  • Supernova Explosion VFX       • Temple Run Idol Demon Roar          │
│  • Instant Match Victory Trigger • Halo Energy Plinth Confetti Blast   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        HUD & Victory Overlay                           │
│  • Accolade Banner popups        • Special Solar Destroyer Victory     │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping
- `src/game/easter_eggs.ts`: Dedicated manager for tracking sun hits, registering the 4 interactive tribute props, and dispatching secret rewards.
- `src/game/environment.ts`: Adds `pulseSunHit(hitCount)` and `triggerSupernovaAnimation(onComplete)` to animate the sun texture, spawn shockwave rings, and trigger the whiteout flash.
- `src/game/audio.ts`: Procedural sound synthesis for:
  - Solar hit hum & crescendo resonant chord
  - Supernova cataclysmic blast & sub-bass drop
  - Minecraft XP ding & wood/stone block shatter
  - CoD mystery box jingle / tactical siren
  - Temple Run demon monkey roar
  - Halo monk chant chord & Grunt Birthday Party celebration sound
- `src/game/controller.ts`: Integrates solar aim check during `simulateBallistics` and shrine interaction via `[F]` key or bullet impact.
- `src/components/GameOverModal.tsx`: Displays the secret "SOLAR COLLAPSE // EASTER EGG UNLOCKED" badge and special debriefing text when won via supernova.
