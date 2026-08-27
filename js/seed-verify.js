/*
 * SEED_VERIFY — the AI-supplied lists Bader collected earlier, now audited.
 * Each item carries a verdict:
 *   "ok-msa"     سليمة (فصحى صحيحة، تنفع بالحچي الراقي)
 *   "ok-kw"      سليمة (كويتية / خليجية أصيلة)
 *   "wrong-gloss" الكلمة موجودة بس الترجمة المعطاة غلط
 *   "misspelled"  الإملاء غلط
 *   "not-kuwaiti" كلمة حقيقية بس من لهجة ثانية (شامية/عراقية/مصرية)
 *   "fabricated"  مختلقة — لا تستخدمها
 *   "doubtful"    مشكوك فيها — تحتاج تأكيد من أهل اللغة
 * Approving an item adds it to the deck with the CORRECTED gloss (en).
 */
const SEED_VERIFY = [
  // ── القائمة الأولى: «كلمات كويتية» (وهي بالحقيقة فصحى) ──
  { id: "v001", ar: "طبعًا", tr: "ṭabʿan", aiGloss: "Of course", verdict: "ok-msa", en: "of course", reg: "msa", topic: "يومي", fix: "سليمة ومستخدمة، بس هي عربية عامة — مو «كويتية» مثل ما ادعت القائمة." },
  { id: "v002", ar: "تشجيع", tr: "tashjīʿ", aiGloss: "Encouragement", verdict: "ok-msa", en: "encouragement", reg: "msa", topic: "مجتمع", fix: "فصحى سليمة." },
  { id: "v003", ar: "عفوًا", tr: "ʿafwan", aiGloss: "Excuse me", verdict: "ok-msa", en: "excuse me; you're welcome", reg: "msa", topic: "مجاملات", fix: "سليمة — وبالكويتي اليومي تسمع «سامحني» أو «لو سمحت» أكثر." },
  { id: "v004", ar: "تشاور", tr: "tashāwur", aiGloss: "To consult", verdict: "ok-msa", en: "mutual consultation", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v005", ar: "متقدم", tr: "mutaqaddim", aiGloss: "Advanced", verdict: "ok-msa", en: "advanced", reg: "msa", topic: "تعليم", fix: "سليمة." },
  { id: "v006", ar: "مجهول", tr: "majhūl", aiGloss: "Unknown", verdict: "ok-msa", en: "unknown", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v007", ar: "وجهة", tr: "wijha", aiGloss: "Perspective", verdict: "wrong-gloss", en: "destination", reg: "msa", topic: "يومي", fix: "وجهة = destination (وجهتنا لندن). أما perspective فهي «وجهة نظر» كاملة." },
  { id: "v008", ar: "تحديات", tr: "taḥaddiyāt", aiGloss: "Challenges", verdict: "ok-msa", en: "challenges", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v009", ar: "إيمان", tr: "īmān", aiGloss: "Faith", verdict: "ok-msa", en: "faith, belief", reg: "msa", topic: "ثقافة", fix: "سليمة." },
  { id: "v010", ar: "متأخر", tr: "mitʾakhkhir", aiGloss: "Late", verdict: "ok-msa", en: "late", reg: "msa", topic: "يومي", fix: "سليمة." },

  // ── قائمة «الفصحى» ──
  { id: "v011", ar: "تعارف", tr: "taʿāruf", aiGloss: "Acquaintance", verdict: "ok-msa", en: "getting acquainted", reg: "msa", topic: "مجتمع", fix: "سليمة." },
  { id: "v012", ar: "مواطنة", tr: "muwāṭana", aiGloss: "Citizenship", verdict: "ok-msa", en: "citizenship (as a value)", reg: "msa", topic: "مجتمع", fix: "سليمة — والجنسية كوثيقة رسمية تسمى «جنسية»." },
  { id: "v013", ar: "تحقيقات", tr: "taḥqīqāt", aiGloss: "Investigations", verdict: "ok-msa", en: "investigations", reg: "msa", topic: "سياسة", fix: "سليمة." },
  { id: "v014", ar: "استقدام", tr: "istiqdām", aiGloss: "Recruitment", verdict: "ok-msa", en: "bringing in (foreign) labor", reg: "msa", topic: "اقتصاد", fix: "سليمة — بمعنى استقدام العمالة تحديدًا، مو التوظيف عمومًا." },
  { id: "v015", ar: "مستقبل", tr: "mustaqbal", aiGloss: "Future", verdict: "ok-msa", en: "future", reg: "msa", topic: "يومي", fix: "سليمة." },
  { id: "v016", ar: "هوية", tr: "hawiyya", aiGloss: "Identity", verdict: "ok-msa", en: "identity", reg: "msa", topic: "ثقافة", fix: "سليمة." },
  { id: "v017", ar: "مقاصد", tr: "maqāṣid", aiGloss: "Purposes", verdict: "ok-msa", en: "aims, intents", reg: "msa", topic: "نقاش", fix: "سليمة — لفظة راقية فعلًا." },
  { id: "v018", ar: "تكوين", tr: "takwīn", aiGloss: "Formation", verdict: "ok-msa", en: "formation, composition", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v019", ar: "اهتمام", tr: "ihtimām", aiGloss: "Concern/Care", verdict: "ok-msa", en: "interest, care", reg: "msa", topic: "يومي", fix: "سليمة." },
  { id: "v020", ar: "تفاهم", tr: "tafāhum", aiGloss: "Understanding", verdict: "ok-msa", en: "mutual understanding", reg: "msa", topic: "مجتمع", fix: "سليمة." },

  // ── القائمة «المختلطة» ──
  { id: "v021", ar: "جدال", tr: "jidāl", aiGloss: "Argument", verdict: "ok-msa", en: "argument, dispute", reg: "msa", topic: "نقاش", fix: "سليمة — وقارنها بـ«محاورة» اللي عندك بالقائمة." },
  { id: "v022", ar: "ثقافة", tr: "thaqāfa", aiGloss: "Culture", verdict: "ok-msa", en: "culture", reg: "msa", topic: "ثقافة", fix: "سليمة." },
  { id: "v023", ar: "إثبات", tr: "ithbāt", aiGloss: "Proof", verdict: "ok-msa", en: "proof, evidence", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v024", ar: "تجديد", tr: "tajdīd", aiGloss: "Renewal", verdict: "ok-msa", en: "renewal", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v025", ar: "حواس", tr: "ḥawāss", aiGloss: "Senses", verdict: "ok-msa", en: "the senses", reg: "msa", topic: "علوم", fix: "سليمة." },
  { id: "v026", ar: "تصوير", tr: "taṣwīr", aiGloss: "Imaging", verdict: "ok-msa", en: "filming, photography", reg: "msa", topic: "إنتاج", fix: "سليمة — وهي كلمة مجالك." },
  { id: "v027", ar: "ذهنية", tr: "dhihniyya", aiGloss: "Mentality", verdict: "ok-msa", en: "mentality, mindset", reg: "msa", topic: "مجتمع", fix: "سليمة." },
  { id: "v028", ar: "فكر", tr: "fikr", aiGloss: "Thought/Idea", verdict: "ok-msa", en: "thought (as a school of thinking)", reg: "msa", topic: "ثقافة", fix: "سليمة — «فكر» = مدرسة فكرية، أما الفكرة الواحدة فهي «فكرة»." },
  { id: "v029", ar: "وصل", tr: "waṣl", aiGloss: "Connection", verdict: "wrong-gloss", en: "receipt (paper)", reg: "msa", topic: "شغل", fix: "«وصل» بالاستخدام اليومي = إيصال استلام. الاتصال بين الناس = «تواصل»." },
  { id: "v030", ar: "منهج", tr: "manhaj", aiGloss: "Method", verdict: "ok-msa", en: "method; curriculum", reg: "msa", topic: "تعليم", fix: "سليمة — وهي موجودة عندك بالقائمة اليدوية بعد." },
  { id: "v031", ar: "نظام", tr: "niẓām", aiGloss: "System", verdict: "ok-msa", en: "system, order", reg: "msa", topic: "سياسة", fix: "سليمة." },
  { id: "v032", ar: "رأي", tr: "raʾy", aiGloss: "Opinion", verdict: "ok-msa", en: "opinion", reg: "msa", topic: "نقاش", fix: "سليمة — وبالكويتي: «شرايك؟»" },
  { id: "v033", ar: "تفاصيل", tr: "tafāṣīl", aiGloss: "Details", verdict: "ok-msa", en: "details", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v034", ar: "إبداع", tr: "ibdāʿ", aiGloss: "Creativity", verdict: "ok-msa", en: "creativity", reg: "msa", topic: "ثقافة", fix: "سليمة." },
  { id: "v035", ar: "خصوصي", tr: "khuṣūṣi", aiGloss: "Private", verdict: "wrong-gloss", en: "private (tutor/driver)", reg: "msa", topic: "يومي", fix: "بالخليج «خصوصي» تنقال للمدرس الخصوصي والسواق. الشي الخاص عمومًا = «خاص»." },
  { id: "v036", ar: "تغيير", tr: "taghyīr", aiGloss: "Change", verdict: "ok-msa", en: "change", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v037", ar: "فن", tr: "fann", aiGloss: "Art", verdict: "ok-msa", en: "art", reg: "msa", topic: "ثقافة", fix: "سليمة." },
  { id: "v038", ar: "واقع", tr: "wāqiʿ", aiGloss: "Reality", verdict: "ok-msa", en: "reality", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v039", ar: "مثالي", tr: "mithāli", aiGloss: "Ideal", verdict: "ok-msa", en: "ideal", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v040", ar: "حكمة", tr: "ḥikma", aiGloss: "Wisdom", verdict: "ok-msa", en: "wisdom", reg: "msa", topic: "ثقافة", fix: "سليمة." },
  { id: "v041", ar: "سهم", tr: "sahm", aiGloss: "Share/Stock", verdict: "ok-msa", en: "share, stock; arrow", reg: "msa", topic: "اقتصاد", fix: "سليمة." },
  { id: "v042", ar: "تجارة", tr: "tijāra", aiGloss: "Commerce", verdict: "ok-msa", en: "commerce, trade", reg: "msa", topic: "اقتصاد", fix: "سليمة." },
  { id: "v043", ar: "تربية", tr: "tarbiya", aiGloss: "Education", verdict: "wrong-gloss", en: "upbringing, raising", reg: "msa", topic: "مجتمع", fix: "تربية = التنشئة والأخلاق. أما التعليم المدرسي فهو «تعليم». (وزارة التربية تجمعهم عمدًا)." },
  { id: "v044", ar: "عقيدة", tr: "ʿaqīda", aiGloss: "Belief", verdict: "ok-msa", en: "creed, doctrine", reg: "msa", topic: "ثقافة", fix: "سليمة — بس هي أثقل من belief العادية: عقيدة دينية أو مبدأ راسخ." },
  { id: "v045", ar: "سياسة", tr: "siyāsa", aiGloss: "Policy/Politics", verdict: "ok-msa", en: "politics; policy", reg: "msa", topic: "سياسة", fix: "سليمة." },

  // ── قائمة «كويتية» ثانية — وهنا المصايب ──
  { id: "v046", ar: "دقيق", tr: "dagīg", aiGloss: "Minute (time)", verdict: "wrong-gloss", en: "precise; flour", reg: "msa", topic: "يومي", fix: "دقيق = precise (أو الطحين!). الدقيقة الزمنية = «دقيقة»، وجمعها بالكويتي «دقايق»." },
  { id: "v047", ar: "خلج", tr: "—", aiGloss: "Confused", verdict: "fabricated", fix: "ما لها وجود بهالمعنى — لا بالكويتي ولا بالفصحى. المرتبك بالكويتي: «محتار» أو «متلخبط»." },
  { id: "v048", ar: "مصاري", tr: "maṣāri", aiGloss: "Money", verdict: "not-kuwaiti", fix: "شامية/عراقية. الكويتي يقول «فلوس» — وقول «مصاري» بالكويت ينكشف على طول." },
  { id: "v049", ar: "يمكن", tr: "yimkin", aiGloss: "Maybe", verdict: "ok-kw", en: "maybe, perhaps", reg: "kw", topic: "يومي", fix: "سليمة ومستخدمة بالكويتي فعلًا." },
  { id: "v050", ar: "حق", tr: "ḥagg", aiGloss: "Right (rights)", verdict: "wrong-gloss", en: "for, belonging to (dialect)", reg: "kw", topic: "يومي", fix: "الاستخدام الكويتي المميز: «هذا حق منو؟» = لمن هذا. أما الحقوق فمعنى فصيح مشترك." },
  { id: "v051", ar: "زلمة", tr: "zalama", aiGloss: "Guys/People", verdict: "not-kuwaiti", fix: "شامية/عراقية. الكويتي: «ريّال» للرجل و«ربع» للجماعة — «يا زلمة» تكشف المتكلم فورًا." },
  { id: "v052", ar: "سفر", tr: "safar", aiGloss: "Travel", verdict: "ok-msa", en: "travel", reg: "msa", topic: "يومي", fix: "سليمة." },
  { id: "v053", ar: "سبب", tr: "sabab", aiGloss: "Reason", verdict: "ok-msa", en: "reason, cause", reg: "msa", topic: "نقاش", fix: "سليمة." },
  { id: "v054", ar: "زبدة", tr: "zibda", aiGloss: "Essence/Main point", verdict: "ok-kw", en: "the gist, bottom line", reg: "kw", topic: "نقاش", fix: "صحيحة وخليجية أصيلة — «الزبدة؟» = خلاصة الكلام. (موجودة بحزمة التصحيحات بعد)." },
  { id: "v055", ar: "تاريخ", tr: "tārīkh", aiGloss: "Date/History", verdict: "ok-msa", en: "history; date", reg: "msa", topic: "ثقافة", fix: "سليمة." },

  // ── بقية «المختلطة» — الملاحظ فقط، والسليم مجموع ──
  { id: "v056", ar: "تأريف", tr: "—", aiGloss: "Introduction", verdict: "fabricated", fix: "ما لها وجود. التقديم = «تعريف» أو «مقدمة»." },
  { id: "v057", ar: "تغدير", tr: "—", aiGloss: "Sabotage", verdict: "fabricated", fix: "مختلقة. التخريب المتعمد = «تخريب»، والخيانة = «غدر»." },
  { id: "v058", ar: "إنعايه", tr: "—", aiGloss: "Care/Attention", verdict: "misspelled", en: "care, attention", reg: "msa", topic: "مجتمع", fix: "الصح: «عناية»." },
  { id: "v059", ar: "تدوين", tr: "tadwīn", aiGloss: "Documentation", verdict: "wrong-gloss", en: "writing down; blogging", reg: "msa", topic: "ثقافة", fix: "تدوين = الكتابة والتسجيل (ومنها المدونات). التوثيق الرسمي = «توثيق». ولاحظ: نفس القائمة ترجمتها مرة ثانية «cinematography» — وهذا اختلاق صريح." },
  { id: "v060", ar: "تصديق", tr: "taṣdīq", aiGloss: "Verification", verdict: "wrong-gloss", en: "believing; official ratification", reg: "msa", topic: "شغل", fix: "تصديق = التصديق على معاملة أو تصديق الكلام. أما التحقق = «تحقق»." },
  { id: "v061", ar: "انقلاب", tr: "inqilāb", aiGloss: "Revolution", verdict: "wrong-gloss", en: "coup d'état", reg: "msa", topic: "سياسة", fix: "انقلاب = coup. الثورة الشعبية = «ثورة». فرق جوهري بالسياسة!" },
  { id: "v062", ar: "ركيز", tr: "—", aiGloss: "Core", verdict: "misspelled", en: "pillar, cornerstone", reg: "msa", topic: "نقاش", fix: "الصح: «ركيزة» — ركيزة أساسية. والجوهر = «جوهر»." },
  { id: "v063", ar: "انهيتاط", tr: "—", aiGloss: "Decline", verdict: "misspelled", en: "decadence, decline", reg: "msa", topic: "ثقافة", fix: "الصح: «انحطاط»." },
  { id: "v064", ar: "إقدام", tr: "iqdām", aiGloss: "Initiative", verdict: "wrong-gloss", en: "boldness, daring", reg: "msa", topic: "نقاش", fix: "إقدام = الجرأة والشجاعة على الفعل. المبادرة = «مبادرة» (وهي عندك بالقائمة)." },
  { id: "v065", ar: "تطوير / تطور", tr: "taṭwīr / taṭawwur", aiGloss: "Development", verdict: "ok-msa", en: "developing (s.th.) / evolving", reg: "msa", topic: "نقاش", fix: "الاثنتين سليمات — تطوير: أنت تطور شي، تطور: الشي يتطور بروحه." },
  { id: "v066", ar: "بقية المختلطة (٥٠ كلمة)", tr: "—", aiGloss: "—", verdict: "ok-msa", fix: "الباقي فصحى سليمة بمجملها: تحليل، صداقة، مستند، استشارات، علم، تكامل، مشاركة، حرية، وسائل، حلم، رسالة، تصميم، آفاق، حقيقة، تدبر، أمل، مفاهيم، دعوة، تفكير، تواصل، فهم، إجراء، تثقيف، موقف، تكريم، تفويض، استخدام، شركاء، قدرة، تفاعل، سعادة، مراجعة، معارضة، مدنية، ثبات، تقدير، وضع، مفهوم. استخدمها بثقة — بس هي فصحى عامة، مو لهجة كويتية." },

  // ── قوائم السينما والفضاء والفيزياء — تحذير عام + أبرز الاختلاقات ──
  { id: "v067", ar: "قوائم السينما/الفضاء/الفيزياء", tr: "—", aiGloss: "—", verdict: "doubtful", fix: "هالقوائم فيها نسبة اختلاق عالية جدًا — لا تعتمد عليها. المصطلحات الصحيحة لمجالاتك جاهزة بحزمة «مصطلحات مصححة». أبرز الأغلاط تحتها 👇" },
  { id: "v068", ar: "معجزات", tr: "muʿjizāt", aiGloss: "Special Effects", verdict: "wrong-gloss", fix: "معجزات = miracles! المؤثرات الخاصة = «مؤثرات خاصة»." },
  { id: "v069", ar: "الخليج", tr: "il-khalīj", aiGloss: "Frame (in framing a shot)", verdict: "fabricated", fix: "الخليج = the Gulf طبعًا. كادر اللقطة = «كادر» أو «إطار»." },
  { id: "v070", ar: "صيدلة", tr: "ṣaydala", aiGloss: "Astrochemistry", verdict: "wrong-gloss", fix: "صيدلة = pharmacy! الكيمياء الفلكية = «كيمياء فلكية»." },
  { id: "v071", ar: "قدم", tr: "qadam", aiGloss: "Gravity", verdict: "wrong-gloss", fix: "قدم = foot أو القِدَم (المعنى الزمني). الجاذبية = «جاذبية»." },
  { id: "v072", ar: "برق", tr: "barq", aiGloss: "Electricity", verdict: "wrong-gloss", fix: "برق = lightning. الكهرباء = «كهرباء»." },
  { id: "v073", ar: "تفقيم", tr: "—", aiGloss: "Spacetime", verdict: "fabricated", fix: "ما لها وجود. الزمكان = «زمكان»." },
  { id: "v074", ar: "تكايان", tr: "—", aiGloss: "Quanta", verdict: "fabricated", fix: "ما لها وجود. الكم = «كمّ / كوانتم»." },
  { id: "v075", ar: "ركب فضائي", tr: "—", aiGloss: "Spacecraft", verdict: "fabricated", fix: "التركيب غلط. المركبة الفضائية = «مركبة فضائية»." },
  { id: "v076", ar: "حذاء فوتونية", tr: "—", aiGloss: "Photon Boot", verdict: "fabricated", fix: "هذي أصلًا مو مصطلح بأي لغة — اختلاق كامل." },

  // ── قائمة السياسة ──
  { id: "v077", ar: "قائمة السياسة (٨٥ كلمة)", tr: "—", aiGloss: "—", verdict: "ok-msa", fix: "أغلبها فصحى صحيحة وتنفع: سيادة النقاش السياسي بالكويت أصلًا بالفصحى المخففة. المفيد الصافي منها انتقيته بحزمة التصحيحات. احذر من: «تشجير = recruitment» (غلط، معناها زراعة أشجار)، «خراج = taxes» (مصطلح تاريخي، الصح ضرائب)، «رداء = diplomatic cloak» (اختلاق)، «تنشيج» (اختلاق — الصح: تعبئة أو حشد)." },
  { id: "v078", ar: "تصفية", tr: "taṣfiya", aiGloss: "Clearance", verdict: "wrong-gloss", en: "liquidation; settling scores", reg: "msa", topic: "سياسة", fix: "تصفية = تصفية شركة أو تصفية حسابات — كلمة ثقيلة، انتبه لسياقها." },

  // ── الأمثال والعبارات — الفرز الدقيق ──
  { id: "v079", ar: "تقدر تشرب من إيدي؟", tr: "—", aiGloss: "Expression of trust", verdict: "fabricated", fix: "مو مثل كويتي معروف — لا تستخدمه." },
  { id: "v080", ar: "كبّر راسك", tr: "—", aiGloss: "Be proud", verdict: "doubtful", fix: "مو التعبير الكويتي المتعارف. اللي ينقال: «ارفع راسك» — وهي عربية عامة مفهومة." },
  { id: "v081", ar: "حذاء عليه الحيلة", tr: "—", aiGloss: "He's not fooling anyone", verdict: "fabricated", fix: "ما لها وجود." },
  { id: "v082", ar: "أبيض من وجهك", tr: "—", aiGloss: "Something obvious", verdict: "fabricated", fix: "مشوهة. الصحيح المستخدم: «بيّض الله وجهك» = أحسنت وشرّفت." },
  { id: "v083", ar: "ماكو داعي", tr: "māku dāʿi", aiGloss: "There's no need", verdict: "ok-kw", en: "there's no need", reg: "kw", topic: "يومي", fix: "صحيحة وكويتية ١٠٠٪ — «ماكو» من أوضح بصمات الكويتي." },
  { id: "v084", ar: "غصب عني", tr: "ghaṣb ʿanni", aiGloss: "Against my will", verdict: "ok-kw", en: "against my will", reg: "kw", topic: "يومي", fix: "صحيحة — والصيغة الكويتية «غصب عني/عنك»، مو «غصب عن عيني»." },
  { id: "v085", ar: "ما يجيمك غير عرايك", tr: "—", aiGloss: "You reap what you sow", verdict: "fabricated", fix: "مشوهة بلا معنى. المثل الحقيقي بهالمعنى: «ما يحك جلدك مثل ظفرك» — وهو متداول فعلًا." },
  { id: "v086", ar: "هذا شينو يابا؟", tr: "—", aiGloss: "What is this, Dad?", verdict: "misspelled", en: "expression of surprise", reg: "kw", topic: "يومي", fix: "الصيغة الكويتية: «شنو هذا يبه؟» — شنو (مو شينو)، يبه (مو يابا)." },
  { id: "v087", ar: "لا يحكم عليك الشطي في البحر", tr: "—", aiGloss: "Don't let the unqualified judge you", verdict: "fabricated", fix: "ما لها وجود — و«الشطي» أصلًا مو كلمة كويتية." },
  { id: "v088", ar: "يهني راسك", tr: "—", aiGloss: "Congratulatory", verdict: "fabricated", fix: "مو تعبير معروف. للتهنئة: «مبروك»، «تستاهل»، «عقبالك» — كلها بحزمة المجاملات." },
  { id: "v089", ar: "زهق شبدك", tr: "—", aiGloss: "Your luck has run out", verdict: "fabricated", fix: "خلط مشوه. «چبد» (الكبد) موجودة بتعابير كويتية حقيقية مثل «يا چبدي» للعزيز — بس هالتركيب مختلق." },
  { id: "v090", ar: "ماكو فايدة", tr: "māku fāyda", aiGloss: "There's no use", verdict: "ok-kw", en: "it's no use", reg: "kw", topic: "يومي", fix: "صحيحة وكويتية." },
  { id: "v091", ar: "على كيفك", tr: "ʿala kēfik", aiGloss: "As you like", verdict: "ok-kw", en: "as you like; take it easy", reg: "kw", topic: "يومي", fix: "صحيحة — وتنقال بعد بمعنى «على مهلك»." },
  { id: "v092", ar: "شنو هذا يمعة؟", tr: "shinu hādha yamʿa", aiGloss: "Disbelief in a group", verdict: "ok-kw", en: "\"what is this, folks?\"", reg: "kw", topic: "يومي", fix: "مقبولة — «يمعة» نداء كويتي حقيقي بمعنى يا جماعة. بس إملاء القائمة كان مكسر." },
  { id: "v093", ar: "ولا يهمك", tr: "wala yhimmik", aiGloss: "Don't worry about it", verdict: "ok-kw", en: "don't worry about it", reg: "kw", topic: "مجاملات", fix: "صحيحة." },
  { id: "v094", ar: "شد حيلك", tr: "shidd ḥēlik", aiGloss: "Pull yourself together", verdict: "ok-kw", en: "toughen up, give it your all", reg: "kw", topic: "يومي", fix: "صحيحة وخليجية أصيلة." },
  { id: "v095", ar: "ترا ما يسوى", tr: "tara mā yiswa", aiGloss: "It's not worth it", verdict: "misspelled", en: "mind you, it's not worth it", reg: "kw", topic: "يومي", fix: "القائمة كتبتها «طرة» — الصح: «ترا ما يسوى». و«ترا» أداة تنبيه كويتية جوهرية." },
  { id: "v096", ar: "علم ترسك", tr: "—", aiGloss: "Your reputation precedes you", verdict: "fabricated", fix: "ما لها وجود." },
  { id: "v097", ar: "لا زمان ولا زمن", tr: "—", aiGloss: "Never", verdict: "fabricated", fix: "مو تعبير متداول. «أبد» أو «ولا بحلم» يؤدون المعنى." },
  { id: "v098", ar: "ليش تلعب بالنار؟", tr: "lēsh tilʿab bin-nār", aiGloss: "Why play with fire?", verdict: "ok-kw", en: "why are you playing with fire?", reg: "kw", topic: "يومي", fix: "سليمة — عربية عامة بصيغة كويتية (ليش)." },
  { id: "v099", ar: "فضلك / فضلكي", tr: "—", aiGloss: "Please (M/F)", verdict: "not-kuwaiti", fix: "«من فضلك» مصرية الطابع، و«فضلكي» أصلًا تركيب غلط. الكويتي: «لو سمحت» — وللمؤنث «لو سمحتي» بالچاف: «لو سمحتِچ» ما تنقال؛ ببساطة «لو سمحتي»." },
  { id: "v100", ar: "بالعافية / مع السلامة / جزاك الله خير / يرحمك الله / ما شاء الله", tr: "—", aiGloss: "(politeness set)", verdict: "ok-kw", fix: "هالمجموعة كلها صحيحة ومستخدمة، وردودها اللي ذكرتها القائمة سليمة بمجملها. الأهم منها دخل حزمة «مجاملات ومناسبات»." },
  { id: "v101", ar: "كل عام وأنتم بخير", tr: "kill ʿām w-antum b-khēr", aiGloss: "Holiday greeting", verdict: "ok-msa", en: "holiday greeting", reg: "msa", topic: "مجاملات", fix: "صحيحة — بس الأصيل الكويتي بالعيد: «عساكم من عواده»." },
  { id: "v102", ar: "شنو صاير؟", tr: "shinu ṣāyir", aiGloss: "What's happening?", verdict: "ok-kw", en: "what's going on?", reg: "kw", topic: "يومي", fix: "صحيحة — وتنسمع مدموجة: «شصاير؟»" },
  { id: "v103", ar: "يا زلمة / شكو ماكو", tr: "—", aiGloss: "Oh man / What's up", verdict: "not-kuwaiti", fix: "«يا زلمة» شامية، و«شكو ماكو» كتحية عراقية بحتة. الكويتي يسأل: «شخبارك؟ شمسوي؟» — و«ماكو» بروحها كويتية، بس التركيبة التحية عراقية." },
];
