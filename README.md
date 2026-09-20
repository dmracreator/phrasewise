# Phrasewise

A calm, mobile-first daily practice app for beginner **French**, **Mandarin Chinese** and **Arabic**, with English as the translation language. Built for an adult A1/A2 learner who has five minutes and wants to spend them on phrases they'll actually say.

One loop, repeated: **choose a language → hear and read a phrase → pick its English meaning → get immediate feedback → continue.**

No build step, no dependencies, no tracking. Two stylesheets' worth of CSS, ~400 lines of vanilla JavaScript, and a curriculum file.

---

## The screens

| Screen | What it does |
| --- | --- |
| **Home** | Time-aware greeting, daily progress ring, streak, three language cards (accent colour, CEFR level, current collection, Continue), and a Quick practice option for mixed review. |
| **Listening** | "4 of 10" progress, language and collection labels, the phrase on a large card, an 82px play button with an animated waveform, plus Replay and Slow. The English meaning is never shown here. |
| **Translation** | "What does this mean?", the phrase with a replay button, and four large answer choices. Correct turns soft green with a check; incorrect turns rose with a cross **and** highlights the right answer. Continue is fixed near the bottom. |
| **Progress** | Encouraging summary, accuracy / phrases / streak, the phrases that were missed, and Review mistakes · Practise again · Back to home. |

Each language carries one muted, flag-inspired accent that colours the whole session:

| | Accent (light) | Accent (dark) |
| --- | --- | --- |
| French | `#4E6294` slate blue | `#8DA1D2` |
| Mandarin | `#A45247` brick red | `#DA8B7E` |
| Arabic | `#3F7357` sage green | `#7BB593` |
| Quick practice | `#6B5C8A` muted violet | `#A896CB` |

Success and error colours are deliberately separate from every accent, so a wrong answer never reads as "just the Mandarin red".

---

## The curriculum

183 full phrases — 61 French, 60 Mandarin, 62 Arabic — organised into ten collections behind the scenes. The learner sees one collection name at a time, never a wall of categories.

`greet` Greetings & politeness · `people` Introductions & people · `money` Numbers, time & money · `food` Food, drink & cafés · `shop` Shopping · `way` Directions & transport · `trip` Travel, stays & emergencies · `help` Asking for help · `daily` Weather, home & routine · `health` Health & feelings

Every entry carries a script line, a support line and the English:

* **French** — standard spelling plus a plain-English pronunciation hint (`zhuh voo-DRAY an ka-FAY`)
* **Mandarin** — simplified characters plus tone-marked pinyin
* **Arabic** — Modern Standard Arabic script (rendered right-to-left) plus academic transliteration

The bias throughout is whole usable sentences over isolated vocabulary: *"Qu'est-ce que vous me conseillez ?"*, *"请说慢一点。"*, *"هل يمكنك مساعدتي؟"*

### Adding or editing phrases

Everything lives in [`assets/js/curriculum.js`](assets/js/curriculum.js) as plain arrays. Append a row to `FR`, `ZH` or `AR`:

```js
["food", "Une carafe d'eau, s'il vous plaît.", "ewn ka-RAF DOH, seel voo PLEH", "A jug of tap water, please."]
//  ^collection   ^target script                  ^support line                    ^English
```

The collection key must exist in `CATS`. Nothing else needs changing — distractors, counts and progress all derive from the arrays.

To add a **fourth language**, add an entry to `LANGS` (with a BCP-47 `voice` code such as `pt-PT` and a `script` value of `latin`, `zh` or `ar`), add its data array, and add an accent block to the CSS beside the existing `[data-lang="fr"]` rules.

---

## Audio

Playback uses the browser's built-in `speechSynthesis` with the matching voice (`fr-FR`, `zh-CN`, `ar-SA`); Slow drops the rate to 0.5×. There are no audio files to host, which is why the repo is a few hundred kilobytes rather than a few hundred megabytes.

The trade-off: voice quality and availability depend on the device. iOS and macOS Safari ship all three; Chrome on Windows may be missing Arabic, and Linux often has none. The waveform still animates and the phrase stays readable when no voice is installed, so nothing breaks. If you later want studio audio, record one file per phrase, add a `audio` field to each row, and swap the body of `playPhrase()` in `assets/js/app.js` for an `Audio` element.

---

## Run it locally

Opening `index.html` directly works for everything except the manifest. For a faithful preview:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

To see it as intended, open DevTools, switch to device toolbar and pick **iPhone 14** (390 × 844). Below 470px the phone frame drops away and the app fills the screen — that's the real mobile layout.

---

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Phrasewise: beginner phrase practice for French, Mandarin and Arabic"
git branch -M main
git remote add origin git@github.com:YOUR-USERNAME/phrasewise.git
git push -u origin main
```

Then in the repository: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save.**

The site appears at `https://YOUR-USERNAME.github.io/phrasewise/` within a minute or two. `.nojekyll` is included so GitHub serves the files as-is.

Two things worth doing once the URL exists:

1. In `index.html`, change the `og:image` value to the full URL (`https://YOUR-USERNAME.github.io/phrasewise/assets/og-image.png`) — social previews need an absolute address.
2. Open it on your phone and use **Share → Add to Home Screen**. The manifest and icons are already set up, so it launches full-screen without Safari's chrome.

**Custom domain:** add a `CNAME` file containing the bare domain, point a DNS `CNAME` record at `YOUR-USERNAME.github.io`, then set the domain under Settings → Pages.

---

## Structure

```
phrasewise/
├── index.html                    markup for all four screens
├── site.webmanifest              add-to-home-screen metadata
├── .nojekyll                     serve files untouched on Pages
└── assets/
    ├── css/phrasewise.css        design tokens, then components
    ├── js/curriculum.js          the phrases + language config
    ├── js/app.js                 routing, sessions, scoring, audio
    ├── icons/                    SVG + PNG app icons
    └── og-image.png              social preview
```

The CSS defines every colour as a token on `:root`, redefines the set for dark mode, and styles components only through tokens — so both themes stay consistent and adding a theme means editing one block.

## Notes on behaviour

* **Progress is per-browser.** Streak, daily count and position in each language are kept in `localStorage`, wrapped in `try`/`catch` so private windows degrade quietly. There is no account and no server; clearing site data resets it.
* **Distractors** are drawn from the same language and, where possible, the same collection — so a wrong option is plausibly wrong rather than obviously absurd.
* **Accessibility:** tap targets are at least 44px, feedback is announced through an `aria-live` region, focus is visible throughout, the Arabic script carries `dir="rtl"`, and `prefers-reduced-motion` stops the waveform animation.

## Licence

[MIT](LICENSE). The phrase content is standard A1/A2 material and is covered by the same licence — use it, fork it, translate it further.
