/*
 * UI — every interface string in Arabic and English.
 *
 * Two display modes, set by store.settings.lang:
 *   "bi" (default) — Arabic with English beneath it
 *   "ar"           — Arabic only, for immersion
 *
 * Values may be a string or a function of the interpolated values, so the
 * two languages can put numbers in different places.
 *
 * NOT translated on purpose: the Kuwaiti example sentences, the per-item
 * verdicts on the التحقق screen, and the vocabulary itself. Those are the
 * material being learned — rendering them in English would defeat the app.
 */
const UI = {
  // ── chrome ──
  brandSub: { ar: "تدريب اللهجة الكويتية", en: "Kuwaiti dialect training" },
  streakTitle: { ar: "أيام متتالية", en: "Days in a row" },
  langBi: { ar: "ع + EN", en: "ع + EN" },
  langAr: { ar: "ع", en: "ع" },
  langBiTitle: { ar: "عربي وإنجليزي", en: "Arabic and English" },
  langArTitle: { ar: "عربي فقط", en: "Arabic only" },

  tabToday: { ar: "اليوم", en: "Today" },
  tabWords: { ar: "الكلمات", en: "Words" },
  tabVerify: { ar: "التحقق", en: "Verify" },
  tabPacks: { ar: "الحزم", en: "Packs" },
  tabStats: { ar: "إحصائيات", en: "Stats" },

  // ── today ──
  doneTitle: { ar: "ما قصرت! 🎉", en: "Nicely done! 🎉" },
  doneBody: {
    ar: (n) => `خلصت جلسة اليوم — ${n} مراجعة. العقل يثبت المعلومة وقت الراحة، فالباقي على باچر.`,
    en: (n) => `Session complete — ${n} reviews. Memory consolidates while you rest, so the rest is tomorrow's job.`,
  },
  cellDue: { ar: "مستحقة اليوم", en: "Due today" },
  cellNew: { ar: "كلمات يديدة", en: "New words" },
  cellReviewed: { ar: "راجعتها اليوم", en: "Reviewed today" },
  startSession: { ar: (n) => `ابدأ الجلسة (${n})`, en: (n) => `Start session (${n})` },
  nothingDue: {
    ar: "✅ ماكو شي مستحق الحين — رجعلنا باچر، التباعد هو السر.",
    en: "✅ Nothing due right now — come back tomorrow. The spacing is the whole point.",
  },
  challengeTitle: { ar: "تحدي اليوم — استخدمها بمحادثة حقيقية", en: "Today's challenge — use these in a real conversation" },
  challengeNote: {
    ar: "الاسترجاع بمحادثة صجية أقوى تثبيت للذاكرة — علّم على اللي استخدمتها.",
    en: "Retrieving a word in real conversation is the strongest form of practice — tick off the ones you used.",
  },
  challengeEmpty: { ar: "راجع كم كلمة أول، وبنطلع لك تحدي يومي منها.", en: "Review a few words first and a daily challenge will be drawn from them." },
  captureTitle: { ar: "صيد اليوم — سمعت كلمة يديدة؟", en: "Today's catch — heard a new word?" },
  captureNote: {
    ar: "نفس عادتك اللي بنيت فيها القائمة: أي كلمة تصيدها من مجلس أو اجتماع، سجلها على طول قبل لا تنطير.",
    en: "The same habit that built your list: catch a word in a majlis or a meeting and log it before it slips away.",
  },
  captureBtn: { ar: "＋ سجل كلمة صدتها", en: "＋ Capture a word" },

  // ── card ──
  modeLearn: { ar: "كلمة يديدة — تعرّف عليها", en: "New word — get to know it" },
  modeLearnPair: { ar: "نداء ورد — تعرّف عليهم", en: "Call & response — learn the pair" },
  modeRecall: { ar: "شنو معناها؟", en: "What does it mean?" },
  modeProduce: { ar: "شلون تقولها بالعربي؟", en: "How do you say it in Arabic?" },
  modeCloze: { ar: "كمّل الفراغ", en: "Fill in the blank" },
  modeRespond: { ar: "شنو الرد؟", en: "What's the reply?" },
  replyLabel: { ar: "↓ الرد", en: "↓ the reply" },
  respondHint: { ar: "قالوها لك — رد عليهم بصوتك قبل لا تقلب", en: "Someone just said this to you — reply out loud before flipping" },
  produceHint: { ar: "قلها بصوتك قبل لا تقلب", en: "Say it out loud before flipping" },
  flip: { ar: "اقلب البطاقة", en: "Flip the card" },
  flipHint: {
    ar: "جاوب بصوتك أو براسك قبل لا تقلب — الاسترجاع هو التمرين",
    en: "Answer aloud or in your head first — the retrieval is the exercise",
  },
  endSession: { ar: "إنهاء الجلسة", en: "End session" },
  g1: { ar: "نسيت", en: "Forgot" },
  g1sub: { ar: "أشوفها بعد شوي", en: "show it again soon" },
  g2: { ar: "صعبة", en: "Hard" },
  g2sub: { ar: "طلعت بجهد", en: "got it with effort" },
  g3: { ar: "زين", en: "Good" },
  g3sub: { ar: "تذكرتها", en: "remembered it" },
  g4: { ar: "سهلة", en: "Easy" },
  g4sub: { ar: "من عيوني", en: "instantly" },

  // ── words ──
  wordsTitle: { ar: (n) => `الكلمات (${n})`, en: (n) => `Words (${n})` },
  addNew: { ar: "＋ كلمة يديدة", en: "＋ New word" },
  close: { ar: "إغلاق", en: "Close" },
  searchPlaceholder: { ar: "دور بالعربي أو الإنجليزي…", en: "Search in Arabic or English…" },
  allRegisters: { ar: "كل السجلات", en: "All registers" },
  allTopics: { ar: "كل المواضيع", en: "All topics" },
  noResults: { ar: "ماكو نتائج", en: "No results" },
  archive: { ar: "أرشفة", en: "Archive" },
  confirmArchive: {
    ar: "تبي تأرشف هالكلمة؟ (تختفي من التدريب، وتقدر ترجعها من النسخة الاحتياطية)",
    en: "Archive this word? It leaves training; a backup can bring it back.",
  },
  stateNew: { ar: "يديدة", en: "new" },
  stateYoung: { ar: "طرية", en: "fresh" },
  stateSettling: { ar: "قاعدة تثبت", en: "settling in" },
  stateMature: { ar: "راسخة", en: "mature" },
  nextDue: { ar: "التالية", en: "next" },

  // ── backup ──
  backupTitle: { ar: "النسخ الاحتياطي", en: "Backup" },
  backupNote: {
    ar: "تقدمك محفوظ بهالجهاز فقط — خذ نسخة بين فترة وفترة، أو انقل فيها تقدمك لجهاز ثاني.",
    en: "Your progress lives on this device only — take a copy now and then, or use one to move to another device.",
  },
  backupBtn: { ar: "نسخة احتياطية", en: "Back up" },
  restoreBtn: { ar: "استعادة", en: "Restore" },
  newPerDay: { ar: "يديدة باليوم", en: "New per day" },
  exportNote: {
    ar: "انسخ النص كله واحفظه بأي مكان أمين — أو نزّله كملف إذا جهازك يسمح.",
    en: "Copy all of this text and keep it somewhere safe — or download it as a file where your browser allows.",
  },
  copyBtn: { ar: "نسخ", en: "Copy" },
  copied: { ar: "تم النسخ ✓", en: "Copied ✓" },
  dlBtn: { ar: "تنزيل ملف", en: "Download file" },
  importNote: {
    ar: "الصق نص النسخة الاحتياطية هني، أو اختر الملف. ⚠ الاستعادة تستبدل تقدمك الحالي كله.",
    en: "Paste your backup text here, or choose the file. ⚠ Restoring replaces all current progress.",
  },
  impPlaceholder: { ar: "الصق النص هني…", en: "Paste the text here…" },
  impPaste: { ar: "استعادة من النص", en: "Restore from text" },
  pickFile: { ar: "اختر ملف", en: "Choose file" },
  restored: { ar: "تمت الاستعادة ✅", en: "Restored ✅" },
  badBackup: { ar: "النص مو صالح — تأكد إنك ناسخ النسخة كاملة", en: "That text isn't valid — make sure you copied the whole backup" },
  dlUnavailable: { ar: "التنزيل مو متاح هني — انسخ النص بدالها", en: "Downloads aren't available here — copy the text instead" },
  copyManual: { ar: "اختر النص وانسخه يدويًا", en: "Select the text and copy it manually" },

  // ── add form ──
  fWord: { ar: "الكلمة أو العبارة (عربي)", en: "Word or phrase (Arabic)" },
  fMeaning: { ar: "المعنى (English)", en: "Meaning (English)" },
  fTranslit: { ar: "النطق (translit)", en: "Pronunciation (translit)" },
  fRegister: { ar: "السجل", en: "Register" },
  fTopic: { ar: "الموضوع", en: "Topic" },
  fExample: { ar: "جملة مثال (كويتي) — وين سمعتها؟", en: "Example sentence (Kuwaiti) — where did you hear it?" },
  fNote: { ar: "ملاحظة", en: "Note" },
  fSave: { ar: "حفظ الكلمة", en: "Save word" },
  fOptional: { ar: "اختياري", en: "optional" },
  needWord: { ar: "اكتب الكلمة أول", en: "Type the word first" },

  // ── verify ──
  verifyTitle: { ar: "التحقق من قوائم الذكاء الاصطناعي", en: "Verifying the AI lists" },
  verifyNote: {
    ar: (d, t) => `راجعت كل القوائم اللي جمعتها من قبل، كلمة كلمة. الحكم مكتوب على كل وحدة — اللي تعتمدها تدخل التدريب بمعناها المصحح، واللي ترفضها تنحفظ بالأرشيف. (${d}/${t} خلصت)`,
    en: (d, t) => `Every list you collected earlier, audited item by item. Each carries its verdict — approve one and it enters training with the corrected meaning; archive it and it stays out. (${d}/${t} done)`,
  },
  oldGloss: { ar: "ترجمة القائمة القديمة", en: "The old list's gloss" },
  approve: { ar: "✓ ضيفها للتدريب", en: "✓ Add to training" },
  approveCorrected: { ar: " (بالمعنى المصحح)", en: " (corrected meaning)" },
  rejectBtn: { ar: "أرشفها", en: "Archive it" },
  verifyDone: { ar: "خلصت التحقق كله — القائمة صارت نظيفة.", en: "All verified — the list is clean." },
  vOkMsa: { ar: "سليمة — فصحى", en: "Sound — MSA" },
  vOkKw: { ar: "سليمة — كويتية", en: "Sound — Kuwaiti" },
  vWrongGloss: { ar: "المعنى غلط", en: "Wrong meaning" },
  vMisspelled: { ar: "إملاء غلط", en: "Misspelled" },
  vNotKuwaiti: { ar: "مو كويتية", en: "Not Kuwaiti" },
  vFabricated: { ar: "مختلقة", en: "Fabricated" },
  vDoubtful: { ar: "مشكوك فيها", en: "Doubtful" },

  // ── packs ──
  packsTitle: { ar: "حزم التوسع", en: "Expansion packs" },
  packsNote: {
    ar: "عشان التطبيق يكبر وياك: كل حزمة مجموعة مدروسة تنضاف للتدريب لما تقرر إنك جاهز لها — مو كلها مرة وحدة.",
    en: "So the app grows with you: each pack is a curated set that joins your training when you decide you're ready — not all at once.",
  },
  packCards: { ar: (n) => `${n} بطاقة`, en: (n) => `${n} cards` },
  added: { ar: "مضافة ✓", en: "Added ✓" },
  addPack: { ar: "أضف الحزمة", en: "Add pack" },

  // ── stats ──
  statsTitle: { ar: "إحصائياتك", en: "Your stats" },
  statActive: { ar: (t) => `كلمة داخل التدريب (من ${t})`, en: (t) => `words in training (of ${t})` },
  statMature: { ar: "راسخة (ثبات ٣ أسابيع+)", en: "mature (3+ weeks stable)" },
  statRetention: { ar: "نسبة التذكر (٣٠ يوم)", en: "retention (30 days)" },
  statStreak: { ar: "أيام متتالية 🔥", en: "days in a row 🔥" },
  forecastTitle: { ar: "المستحق خلال الأسبوع الياي", en: "Due over the coming week" },
  forecastToday: { ar: "اليوم", en: "Today" },
  distTitle: { ar: "التوزيع", en: "Breakdown" },
  distLine: {
    ar: (kw, msa, ph, pair) => `${kw} كويتي صرف · ${msa} فصحى بالحچي · ${ph} عبارات · ${pair} نداء ورد`,
    en: (kw, msa, ph, pair) => `${kw} pure Kuwaiti · ${msa} MSA-in-speech · ${ph} phrases · ${pair} call & response`,
  },
  tipLow: {
    ar: "💡 نسبة التذكر تحت ٨٠٪ — قلل الكلمات اليديدة باليوم شوي، والجودة قبل الكمية.",
    en: "💡 Retention is under 80% — ease off the new-words-per-day. Quality before quantity.",
  },
  tipHigh: {
    ar: "💡 نسبة تذكرك عالية وايد — تقدر تزيد الكلمات اليديدة باليوم.",
    en: "💡 Your retention is very high — you can raise the new words per day.",
  },
  whyTitle: { ar: "ليش التطبيق مبني چذي؟", en: "Why the app works this way" },
  whyBody: {
    ar: "الجدولة على خوارزمية FSRS للتكرار المتباعد — تراجع الكلمة قبل ما تنساها بشوي، وهذا أكفأ وقت للتثبيت. كل مراجعة استرجاع نشط (تجاوب قبل ما تقلب) لأن الاختبار يثبت أقوى من إعادة القراءة، والبطاقة تتدرج من التعرف إلى الإنتاج إلى إكمال الجملة لأن الصعوبة المدروسة تبني ذاكرة أمتن. وتحدي الاستخدام اليومي ينقل الكلمة من التطبيق إلى لسانك.",
    en: "Scheduling runs on FSRS spaced repetition — each word returns just before you'd forget it, the most efficient moment to reinforce it. Every review is active retrieval (you answer before flipping) because testing fixes memory harder than re-reading, and cards escalate from recognition to production to completing a sentence, because desirable difficulty builds sturdier recall. The daily usage challenge is what moves a word from the app onto your tongue.",
  },

  // ── labels ──
  regKw: { ar: "كويتي", en: "Kuwaiti" },
  regMsa: { ar: "فصحى بالحچي", en: "MSA in speech" },
  regPhrase: { ar: "عبارة", en: "Phrase" },
  regPair: { ar: "نداء ورد", en: "Call & response" },
  regTip: { ar: "ملاحظة", en: "Note" },
  regIdiom: { ar: "مثل", en: "Proverb" },
};

/** Topic labels — Arabic is the stored value, English shown alongside. */
const TOPIC_EN = {
  "نقاش": "Discussion",
  "شغل": "Work",
  "مجتمع": "Society",
  "سياسة": "Politics",
  "اقتصاد": "Economy",
  "تعليم": "Education",
  "ثقافة": "Culture",
  "علوم": "Science",
  "عمران": "Urbanism",
  "يومي": "Everyday",
  "مجاملات": "Courtesies",
  "أمثال": "Proverbs",
  "إنتاج": "Production",
  "بحر وتراث": "Sea & heritage",
  "تحية": "Greetings",
  "ضيافة": "Hospitality",
  "مناسبات": "Occasions",
  "عزاء": "Condolences",
};
