// บทเรียน: แต่ละระดับแบ่งเป็นบทตามหัวข้อ บทละประมาณ 20 คำ
// คำทุกคำในระดับต้องอยู่ในบทใดบทหนึ่งเพียงบทเดียว (ตรวจด้วย tools/validate.js)
window.UNITS = {
  A1: [
    { title: "ครอบครัวและผู้คน", words: "family friend mother father brother sister baby teacher name love happy sad tired busy beautiful tall short hand head eye" },
    { title: "อาหารและการซื้อของ", words: "apple water eat drink food bread rice egg milk fruit chicken fish cook hot cold full cheap expensive buy money" },
    { title: "บ้านและสิ่งของ", words: "house room door window table chair bed phone book open close clean dirty sleep sit stand big small new old" },
    { title: "กิจวัตรประจำวัน", words: "morning night day week weekend year time school study work read write listen speak wait help like want give play" },
    { title: "เมืองและธรรมชาติ", words: "car bus train city country shop go come walk run swim fast slow easy difficult dog red rain sun tree" },
  ],
  A2: [
    { title: "การเดินทางและการใช้เงิน", words: "journey luggage ticket arrive travel visit return crowded empty noisy quiet village weather hurry carry borrow receipt price bill spend" },
    { title: "สุขภาพและความรู้สึก", words: "healthy exercise medicine hungry afraid angry worry laugh enjoy lucky comfortable delicious dangerous careful appointment advice problem habit miss ready" },
    { title: "โรงเรียนและการเรียน", words: "remember forget explain answer practise repeat pass fail mistake improve subject information clever describe decide choose plan reason competition interesting" },
    { title: "ผู้คนและสังคม", words: "neighbour invite guest friendly polite funny famous popular promise agree believe share follow festival culture message favourite prefer boring different" },
    { title: "คำที่ใช้บ่อยในชีวิตประจำวัน", words: "build change collect fix lose save heavy bright modern strange useful wonderful important actually almost already usually probably several future" },
  ],
  B1: [
    { title: "งานและการวางแผน", words: "customer deliver schedule equipment apply manage organise arrange prepare provide require demand skill goal achieve effort attempt method approach solution" },
    { title: "นิสัยและอารมณ์", words: "confident generous patient responsible independent frightened disappointed exhausted upset courage attitude admire respect relax complain argue impress encourage support welcome" },
    { title: "สังคมและสิ่งแวดล้อม", words: "environment pollution community social tradition volunteer protect reduce waste damage survive temperature condition wealthy valuable benefit advantage opportunity influence relationship" },
    { title: "ความคิดและการตัดสินใจ", words: "consider suppose imagine realise expect estimate compare identify discover notice opinion knowledge research debate convince suggest recommend accept depend rely" },
    { title: "คำเชื่อมและคำใช้บ่อย", words: "recently previous fortunately unfortunately instead obvious familiar various include contain increase limit pressure purpose permission announce warn avoid develop experience" },
  ],
  B2: [
    { title: "การทำงานและเป้าหมาย", words: "accomplish commitment dedicated efficient capable priority objective strategy implement conduct procedure negotiate participate contribute pursue maintain ensure guarantee challenge obstacle" },
    { title: "การวิเคราะห์และหลักฐาน", words: "analyse evidence investigate accurate thorough reliable interpret indicate illustrate determine distinguish confirm acknowledge assume anticipate predict justify abstract apparent vague" },
    { title: "การเปลี่ยนแปลงและผลกระทบ", words: "impact consequence inevitable significant substantial considerable enormous widespread decline expand transform adapt vary constant frequent temporary sustainable eliminate potential occur" },
    { title: "ความคิดเห็นและการสื่อสาร", words: "persuade emphasize exaggerate criticise controversial deny reject defend resolve appreciate aware concern hesitate reluctant regret genuine sensitive inspire fluent tendency" },
    { title: "ชีวิตและสังคม", words: "accommodation alternative convenient flexible adequate sufficient minimum essential crucial vital remarkable severe violent recover tolerate abandon authority presence aspect involve" },
  ],
  C1: [
    { title: "การคิดและการโต้แย้ง", words: "ambiguous coherent compelling plausible hypothesis paradox dilemma consensus implicit explicit arbitrary credible dubious skeptical contemplate conceive perceive intuition articulate eloquent" },
    { title: "นิสัยและบุคลิก", words: "meticulous pragmatic resilient candid discreet benevolent complacent indifferent impartial zealous vigorous wary empathy integrity perseverance ambition reluctance proficient versatile formidable" },
    { title: "ธุรกิจและสังคม", words: "entrepreneur lucrative incentive infrastructure allocate accountable endorse advocate transparent unanimous prevalent ubiquitous prominent notorious conventional conform obsolete disposable viable feasible" },
    { title: "การเปลี่ยนแปลงและผลลัพธ์", words: "deteriorate diminish exacerbate alleviate mitigate undermine reinforce enhance fluctuate stagnant unprecedented inevitably subsequent coincide undergo adverse vulnerable acquire provoke profound" },
    { title: "คำบรรยายลักษณะ", words: "comprehensive discrepancy inherent scrutiny scrutinise subtle tedious elaborate concise intricate deliberate spontaneous tentative ephemeral mundane trivial superficial tangible redundant nostalgia" },
  ],
};
