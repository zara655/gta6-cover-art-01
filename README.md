# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/zara655/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/zara655/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice City Cover Studio** turns any photo and a caption into GTA-style multi-panel cover art, entirely in the browser — no uploads, no network, no libraries. Pick a photo (or drop one in), choose a poster layout (2×2 grid, hero + 2, triptych, wide + 2), click any panel to drag its crop and zoom, grade each panel with neon-sunset looks (Vice Sunset, Neon Nights, Golden Hour, Mono Noir, Acid Trip), set the tag/caption/subtitle lettering, and export a PNG at square, portrait, wide, or story size. The renderer adds the poster finish for you: sun glow, film grain, vignette, and white keylines between panels.

## Run it

```sh
node main.ts
```

That hands the entry in (copies `app/` and `screenshots/` to `/output` and writes `dossier.json`). To use the studio itself, serve the app locally:

```sh
node serve.ts
```

then open http://localhost:8080. Add `?shot=cover&photo=pier&caption=Sunset%20Heist` (or `?shot=editor&…`) for the fixed screenshot scenes listed in `shots.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=cgsv8n01&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
