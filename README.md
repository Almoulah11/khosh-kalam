# خوش كلام — Kuwaiti Dialect Trainer

A personal, self-contained web app for growing an elevated Kuwaiti Arabic
vocabulary — the words and phrases that make you a sharper conversationalist
in the diwaniya, the boardroom, and everywhere in between. Built for a native
speaker: the goal is register expansion, not learning Arabic.

**No build step, no dependencies, no server.** Open `index.html` and start.

## Where to run it

Any of these work — pick by how much setup you want:

| Option | Setup | Notes |
|---|---|---|
| **Open the file** | none | Double-click `index.html`. Works offline immediately; no install |
| **Claude Artifact** | `node build.js`, publish `dist/khosh-kalam.html` | A private URL that opens on any device. Single-file build |
| **GitHub Pages** | Settings → Pages → deploy from `main`, root | Free on public repos; paid for private. Best "add to home screen" experience |
| **Netlify / Vercel** | drag the folder onto their dashboard | Free on private code, custom domain, one-minute setup |
| **Local server** | `python3 -m http.server` | Enables the service worker, so offline caching and install-to-homescreen work |

On a phone, whichever URL you use, "Add to Home Screen" turns it into a
full-screen app that launches like any other.

**Progress lives in that browser's `localStorage`** — it is per-device and per-URL,
so moving hosts starts a fresh deck. Under **الكلمات → نسخة احتياطية** you can
copy your whole state as text (or download it as a file where the browser
allows), and **استعادة** takes it back in — that's how you carry a deck from
laptop to phone, or across a move to a different host.

## Building the single-file version

```bash
node build.js     # → dist/khosh-kalam.html, everything inlined
```

The multi-file version in the repo root is the source of truth. Always edit
there and rebuild; never hand-edit `dist/`.

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


## The six practice modes (التدريب)

Production-side work — the vocabulary trainer builds recognition; these build
speech.

| Mode | What it does |
|---|---|
| **الظل** Shadowing | YouTube player with 0.75×/1× speed, an A–B loop for a 15–30s segment, and a session clock targeting 15 minutes. Minutes are logged per session |
| **قراءة جهرية** Read aloud | 14 Arabic texts in large RTL type at a 38ch measure. Tap any word you stumble on; on finishing, each stumble becomes a lexicon phrase (word plus its neighbours, so the phrase rule holds by construction) |
| **لقطة وحدة** One-take | A prompt drawn from 60 interview-style questions, recorded via MediaRecorder. Stopping saves — there is no re-record. Audio goes to IndexedDB and locks for 7 days, then appears in a review queue for a 1–5 rating and notes |
| **الالتفاف** Circumlocution | A concept plus a banned-word list and 45 seconds to convey it anyway. Self-scored; success rate is tracked over time |
| **المعجم** Lexicon | Phrase-only entries (Arabic phrase, gender, plural, gloss, source, domain) on an SM-2 schedule. Review is always production: the English is shown and you produce the Arabic |
| **بنك الرسائل** Message bank | Repeated public questions with your worked Arabic answer, a rehearsal counter, and a last-rehearsed date. Sorted by staleness |

The dashboard (اللوحة, on the stats tab) shows streak, minutes by exercise
over 30 days, lexicon size by domain, the circumlocution success-rate trend,
and how many monologues are awaiting review.

### Two deliberate constraints

**The lexicon refuses bare nouns.** `قرار` is rejected; `القرار الصعب` is
accepted. A phrase is a noun with an adjective or a bound demonstrative, and
the form enforces it rather than suggesting it.

**Shadowing sources are channels, not video IDs.** Individual videos get
deleted and made private; channels don't. The library carries verified
Kuwaiti channels (بدون ورق, منصة, تلفزيون الكويت, قناة الأخبار), a few starter
episodes checked at build time, and a paste box for any link. No video ID in
this repo was invented, and a dead one falls back to its channel.

### On the reading texts

Everything in the reading library is either public-domain classical verse
(زهير, المتنبي, أبو تمام) or original prose written for this app in the style
of an opinion column, literary prose, or Kuwaiti dialect. Nothing is copied
from a living newspaper or author.


## Modern Kuwaiti pragmatics

Vocabulary tells you what a word means; pragmatics tells you which move to
make. A grammatically perfect sentence still lands wrong if it is too blunt,
too formal, too familiar, or missing the ritual the moment required. Three
pieces cover it:

- **A 42-card pack** of the formulaic moves themselves — indirect refusal
  («الموضوع مو بيدي», «أشوف لك شنو أقدر أسوي»), compliment deflection, address
  and deference (بو فلان, عمّي, the طال عمرك → حضرتك → معاليك → سموك ladder),
  hedging, floor management (ترا, «عفوًا خلني أكمل», back-channels), condolence,
  the تعارض ritual, and the modern digital register: greet-then-ask on WhatsApp,
  «تم» versus «تم، يوصلك خلال ساعة», out-of-hours softeners.
- **اقرأ الموقف** — 28 situational-judgement items in the discourse-completion
  format used in pragmatics research. Each names the relationship and the
  setting, because both change the answer. Every distractor is something a real
  person might say; it is wrong only for *this* person in *this* room.
- **سلّم السجل** — 12 register ladders: one intent, three audiences (a close
  friend, a colleague, someone senior). The wrong answer is never
  ungrammatical — it is the right sentence aimed at the wrong person.

The pragmatics cards carry their own register tag (**حركة اجتماعية**) so a
social move is never mistaken for a vocabulary item.

## Bilingual interface

The app ships **bilingual** — Arabic leads, English sits beneath it in a
quieter weight — with a toggle in the header:

- **ع + EN** — every label, button, hint and stat in both languages
- **ع** — Arabic only, for immersion: the English disappears, and so do the
  transliterations and English glosses on cards

Arabic-only mode is not just a chrome change. The `produce` exercise prompts
with the English gloss, so in Arabic-only mode a card that would have been
`produce` becomes a cloze (or plain recall if no cloze can be built) — you
are never shown a blank prompt. The choice is saved with your progress.

Deliberately **not** translated: the Kuwaiti example sentences, the vocabulary
itself, and the per-item verdicts on the التحقق screen. Those are the material
being learned — putting them in English would defeat the app. Verdicts do
quote the English gloss they are correcting, so some English shows there even
in Arabic-only mode; that English *is* the thing under discussion.

Interface strings live in `js/i18n.js` as one `{ ar, en }` table — add a
language or reword a label in one place.

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
js/i18n.js            every interface string, Arabic + English
js/app.js             session engine, cloze builder, stats, storage
sw.js                 offline cache
```
