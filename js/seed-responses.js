/*
 * SEED_RESPONSES — نداء ورد: fixed call-and-response exchanges.
 * The drill: hear the call, produce the response automatically.
 * en = the situation in English; note marks variants or looser customs.
 */
const SEED_RESPONSES = [
  { id: "r001", call: "السلام عليكم", callTr: "is-salāmu ʿalēkum", resp: "وعليكم السلام ورحمة الله وبركاته", respTr: "wa ʿalēkum is-salām wa raḥmat aḷḷāh wa barakātuh", en: "the greeting of greetings — the fuller the reply, the finer the manners", topic: "تحية" },
  { id: "r002", call: "صباح الخير", callTr: "ṣabāḥ il-khēr", resp: "صباح النور", respTr: "ṣabāḥ in-nūr", en: "morning greeting", topic: "تحية" },
  { id: "r003", call: "مساء الخير", callTr: "masāʾ il-khēr", resp: "مساء النور", respTr: "masāʾ in-nūr", en: "evening greeting", topic: "تحية" },
  { id: "r004", call: "الله بالخير", callTr: "aḷḷa bil-khēr", resp: "الله بالخير", respTr: "aḷḷa bil-khēr", en: "the diwaniya greeting on entering — the reply mirrors it", topic: "تحية", note: "تحية المجالس الكويتية الأصيلة — الرد نفس اللفظ" },
  { id: "r005", call: "شلونك؟", callTr: "shlōnik?", resp: "زين الحمدلله — إنت شلونك؟", respTr: "zēn il-ḥamdilla — inta shlōnik?", en: "how are you? — answer and return the question", topic: "تحية" },
  { id: "r006", call: "شخبارك؟", callTr: "shakhbārik?", resp: "أخبارك الطيبة، الحمدلله", respTr: "akhbārik iṭ-ṭayyba, il-ḥamdilla", en: "what's your news?", topic: "تحية" },
  { id: "r007", call: "يا هلا والله!", callTr: "yā hala waḷḷa", resp: "هلا بيك، يا هلا ومرحبا", respTr: "hala bīk, yā hala u-marḥaba", en: "warm welcome — met with equal warmth", topic: "تحية" },
  { id: "r008", call: "عساك على القوة", callTr: "ʿasāk ʿa l-guwwa", resp: "الله يقويك", respTr: "aḷḷa ygawwīk", en: "said to someone at work", topic: "مجاملات" },
  { id: "r009", call: "بالعافية", callTr: "bil-ʿāfya", resp: "الله يعافيك", respTr: "aḷḷa yʿāfīk", en: "said to someone eating or drinking", topic: "ضيافة" },
  { id: "r010", call: "يعطيك العافية", callTr: "yaʿṭīk il-ʿāfya", resp: "الله يعافيك", respTr: "aḷḷa yʿāfīk", en: "thanks for effort or service", topic: "مجاملات" },
  { id: "r011", call: "تسلم / تسلم إيدك", callTr: "tislam / tislam īdik", resp: "الله يسلمك", respTr: "aḷḷa ysallmik", en: "praise for a job or a dish", topic: "مجاملات" },
  { id: "r012", call: "مشكور", callTr: "mashkūr", resp: "العفو، ولا يهمك", respTr: "il-ʿafu, wala yhimmik", en: "thanks — brushed off graciously", topic: "مجاملات" },
  { id: "r013", call: "ما قصرت", callTr: "mā gaṣṣart", resp: "هذا واجبي", respTr: "hādha wājbi", en: "\"you came through\" — deflect the credit", topic: "مجاملات" },
  { id: "r014", call: "حياك الله", callTr: "ḥayyāk aḷḷa", resp: "الله يحييك", respTr: "aḷḷa yḥayyīk", en: "welcome (to a guest)", topic: "ضيافة" },
  { id: "r015", call: "عسى ما شر؟", callTr: "ʿasa mā sharr?", resp: "شر ما ييك — كله خير", respTr: "sharr mā yīk — killa khēr", en: "\"I hope nothing's wrong?\" — reassure the asker", topic: "مجاملات" },
  { id: "r016", call: "مبروك!", callTr: "mabrūk", resp: "الله يبارك فيك — عقبالك", respTr: "aḷḷa ybārik fīk — ʿugbālik", en: "congratulations — bless back, wish them the same", topic: "مناسبات" },
  { id: "r017", call: "عساكم من عواده", callTr: "ʿasākum min ʿuwwāda", resp: "وأنتم من عايدينه — أيامكم سعيدة", respTr: "w-antum min ʿāydīna — ayyāmkum saʿīda", en: "Eid greeting", topic: "مناسبات" },
  { id: "r018", call: "مبارك عليكم الشهر", callTr: "mbārak ʿalēkum ish-shahar", resp: "علينا وعليكم — عساكم من عواده", respTr: "ʿalēna u-ʿalēkum", en: "start of Ramadan", topic: "مناسبات" },
  { id: "r019", call: "تقبل الله طاعتكم", callTr: "taqabbal aḷḷa ṭāʿatkum", resp: "منا ومنكم صالح الأعمال", respTr: "minna u-minkum ṣāliḥ il-aʿmāl", en: "late Ramadan / after worship", topic: "مناسبات" },
  { id: "r020", call: "كل عام وأنتم بخير", callTr: "kill ʿām w-antum b-khēr", resp: "وأنت بخير وصحة وسلامة", respTr: "w-inta b-khēr u-ṣiḥḥa u-salāma", en: "any annual occasion", topic: "مناسبات" },
  { id: "r021", call: "مبروك ما ياكم", callTr: "mabrūk mā yākum", resp: "الله يبارك فيك", respTr: "aḷḷa ybārik fīk", en: "congratulations on a newborn", topic: "مناسبات", note: "التهنئة الكويتية بالمولود اليديد" },
  { id: "r022", call: "الحمدلله على السلامة", callTr: "il-ḥamdilla ʿas-salāma", resp: "الله يسلمك", respTr: "aḷḷa ysallmik", en: "to a returning traveler or someone recovered", topic: "مجاملات" },
  { id: "r023", call: "يرحمك الله (عقب العطسة)", callTr: "yarḥamuk aḷḷa", resp: "يهديكم الله ويصلح بالكم", respTr: "yahdīkum aḷḷa wa yuṣliḥ bālakum", en: "you sneezed, said الحمدلله, they blessed you — complete the chain", topic: "مجاملات" },
  { id: "r024", call: "عظم الله أجركم", callTr: "ʿaẓẓam aḷḷa ajrakum", resp: "أجرنا وأجركم — شكر الله سعيكم", respTr: "ajirna u-ajirkum — shakar aḷḷa saʿyakum", en: "condolences at a عزاء — the reply every adult must know", topic: "عزاء" },
  { id: "r025", call: "جزاك الله خير", callTr: "jazāk aḷḷa khēr", resp: "وإياك", respTr: "w-iyyāk", en: "may God reward you", topic: "مجاملات" },
  { id: "r026", call: "نعيمًا", callTr: "naʿīman", resp: "الله ينعم عليك", respTr: "aḷḷa yinʿim ʿalēk", en: "after a haircut or shower", topic: "مجاملات" },
  { id: "r027", call: "في أمان الله", callTr: "fi amān iḷḷa", resp: "في أمان الكريم", respTr: "fi amān il-karīm", en: "parting words", topic: "تحية" },
  { id: "r028", call: "مع السلامة", callTr: "maʿ is-salāma", resp: "الله يسلمك", respTr: "aḷḷa ysallmik", en: "goodbye", topic: "تحية" },
  { id: "r029", call: "قرّب!", callTr: "garrib!", resp: "بالعافية عليكم", respTr: "bil-ʿāfya ʿalēkum", en: "someone eating invites you to join — decline politely, bless the meal", topic: "ضيافة", note: "الرد الشائع إذا ما كنت بتنضم — وإذا قربت فـ«بسم الله»" },
  { id: "r030", call: "شرفتونا", callTr: "sharraftūna", resp: "الشرف لنا", respTr: "ish-sharaf ilna", en: "\"you honored us\" — return the honor", topic: "ضيافة" },
  { id: "r031", call: "تقدر تسوي لي هالطلب؟", callTr: "tigdar tsawwī li...", resp: "أبشر — تدلل، على راسي", respTr: "abshir — tdallal, ʿala rāsi", en: "a request from someone dear — the generous yes", topic: "مجاملات", note: "ثلاث صيغ كلها تنفع: أبشر، تدلل، على راسي" },
  { id: "r032", call: "وين هالغيبة؟", callTr: "wēn hal-ghēba?", resp: "والله مشاغل — بس ما ننسى الطيبين", respTr: "waḷḷa mashāghil — bas mā nansa iṭ-ṭaybīn", en: "\"where have you been?\" — a warm excuse", topic: "تحية", note: "الرد مو ثابت حرفيًا — المهم الاعتذار الدافئ" },
];
