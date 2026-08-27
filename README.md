# خوش كلام — Kuwaiti Dialect Trainer

A personal, self-contained web app for growing an elevated Kuwaiti Arabic
vocabulary — the words and phrases that make you a sharper conversationalist
in the diwaniya, the boardroom, and everywhere in between. Built for a native
speaker: the goal is register expansion, not learning Arabic.

**No build step, no dependencies, no server.** Open `index.html` and start.

## Running it

- **Locally:** open `index.html` in any browser, or serve the folder
  (`python3 -m http.server`) to get offline caching + install-to-homescreen.
- **Hosted:** any static host works. For GitHub Pages: repo → Settings →
  Pages → deploy from `main` branch root. On your phone, "Add to Home
  Screen" makes it a full-screen daily app.

Progress lives in the browser's `localStorage`. Use **الكلمات → تصدير JSON**
regularly to back up, and **استيراد** to move progress between devices.

## The learning science it's built on

| Principle | Research | How the app applies it |
|---|---|---|
| Spaced repetition | Cepeda et al. 2006; FSRS (Ye et al.) | Every card is scheduled by the FSRS-4.5 algorithm — reviews land just before you'd forget, at a 90% target retention |
| Retrieval practice ("testing effect") | Roediger & Karpicke 2006 | You answer *before* flipping, every time. No passive re-reading |
| Desirable difficulties | Bjork & Bjork | Cards escalate: recognition (AR→meaning) → production (meaning→AR, harder and more useful for speaking) → cloze inside a Kuwaiti sentence |
| Contextual encoding | — | Every curated word carries an example sentence in real Kuwaiti register, set in real situations (ديوانية debates, work, occasions) |
| Interleaving | Rohrer & Taylor 2007 | Sessions shuffle topics and exercise types instead of blocking |
| Generation & transfer | Slamecka & Graf 1978 | The daily **تحدي اليوم** picks 3 recently-studied words to deliberately use in a real conversation that day |
| Habit protection | — | New cards are throttled (default 8/day) so the review load stays sustainable; streak + due counts keep the daily loop honest |

## How it keeps making you better

1. **صيد اليوم (capture):** the same habit that built your original list —
   hear a word in a majlis, capture it in ten seconds, and it enters the
   scheduler automatically.
2. **حزم التوسع (packs):** curated sets you add when ready — discussion
   connectors, Kuwaiti occasion phrases and their correct replies, living
   proverbs, and corrected terminology for film/space/economics.
3. **التحقق (verification queue):** the old AI-supplied lists were audited
   item by item. Many entries were fabricated (e.g. «تفقيم = spacetime»),
   wrongly glossed (انقلاب is a *coup*, not a revolution), or from the wrong
   dialect (مصاري and زلمة are Levantine — a Kuwaiti says فلوس and ريّال).
   Each item shows its verdict; you approve corrected entries into training
   or archive the junk.

## Register honesty

Cards are tagged so the Kuwaiti emphasis never blurs:

- **كويتي** — pure dialect (فنّش، طماشة، جوّز عن، عساك على القوة)
- **فصحى بالحچي** — MSA vocabulary as used inside educated Kuwaiti speech
  (most of the discussion/economy vocabulary — that mixed register *is* how
  serious talk sounds in Kuwait)
- **عبارة** — ready-made phrases and their replies
- **نداء ورد** — fixed call-and-response exchanges (السلام عليكم → وعليكم
  السلام, عساك على القوة → الله يقويك, عظم الله أجركم → أجرنا وأجركم).
  These drill one-directionally: the app gives the call, you produce the
  response until it's automatic. New pairs are threaded in as every 4th
  new card so they interleave with vocabulary

A few of your originally captured items were ambiguous (اسواف، مناج،
طب طبة، لعوزكم) — they're kept with a ⚠ note stating the best reading and
what to confirm with family elders rather than a silent guess.

## Files

```
index.html            shell
css/styles.css        dark, Arabic-first UI
js/fsrs.js            FSRS-4.5 scheduler (self-contained)
js/seed-manual.js     your captured list, curated (196 cards)
js/seed-packs.js      expansion packs (60 cards)
js/seed-verify.js     audited AI lists with verdicts (103 items)
js/seed-responses.js  call-and-response pairs (32 exchanges)
js/app.js             session engine, cloze builder, stats, storage
sw.js                 offline cache
```
