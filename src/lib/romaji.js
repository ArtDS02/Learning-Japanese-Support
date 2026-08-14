// Chuyển hiragana → romaji (kiểu Hepburn, có dấu macron cho nguyên âm dài).
// Dùng cho các bảng số đếm/giờ/ngày để khỏi nhập tay romaji.

const YOUON = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
};

const MONO = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "wo", ん: "n",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
};

export function kanaToRomaji(input) {
  if (!input) return "";
  const s = String(input).replace(/⚠️/g, "").trim();
  let out = "";
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    // Âm ngắt っ → gấp đôi phụ âm đầu của âm tiếp theo
    if (ch === "っ" || ch === "ッ") {
      const two = s.substr(i + 1, 2);
      const next = YOUON[two] || MONO[s[i + 1]];
      if (next) out += next.startsWith("ch") ? "t" : next[0];
      i += 1;
      continue;
    }

    const pair = s.substr(i, 2);
    if (YOUON[pair]) {
      out += YOUON[pair];
      i += 2;
      continue;
    }
    if (MONO[ch]) {
      out += MONO[ch];
      i += 1;
      continue;
    }

    // Ký tự không phải kana (dấu cách, "/", chữ Latin…) → giữ nguyên
    out += ch;
    i += 1;
  }

  // Nguyên âm dài → dấu macron (đồng bộ kiểu chữ trong app: jū, kyō…)
  out = out.replace(/uu/g, "ū").replace(/ou/g, "ō").replace(/oo/g, "ō");
  return out;
}

// ── Chấm đáp án gõ tay ───────────────────────────────────────────────────────
// Người học có thể gõ kana (IME) hoặc romaji, và romaji thì có nhiều biến thể
// hợp lệ (じゅう = jū / juu / ju). Các helper dưới đây dùng cho các chế độ
// "gõ đáp án" ở Từ vựng, Ngữ pháp, Số đếm và Nghe.

/** Katakana → hiragana, để so sánh kana không phụ thuộc bảng chữ. */
export function kataToHira(s) {
  return String(s || "").replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

/** Bỏ mọi thứ không phải kana/kanji để so sánh (dấu cách, ・, 〜, ⚠️…). */
export function normalizeKana(s) {
  return kataToHira(s)
    .replace(/⚠️/g, "")
    .replace(/[\s・･。、!?！？~〜ー―\-()（）]/g, "")
    .trim();
}

function stripLatin(s) {
  return (
    String(s || "")
      .toLowerCase()
      // Nguyên âm dài phải quy về chữ thường TRƯỚC khi lọc [^a-z], nếu không
      // "jūgofun" bị cắt thành "jgofun" và chấm sai — mà macron lại đúng là
      // kiểu romaji app đang hiển thị.
      .replace(/[āăâ]/g, "a")
      .replace(/[īĭî]/g, "i")
      .replace(/[ūŭû]/g, "u")
      .replace(/[ēĕê]/g, "e")
      .replace(/[ōŏô]/g, "o")
      .replace(/[^a-z]/g, "")
  );
}

/**
 * Quy mọi kiểu phiên âm về một dạng chuẩn để so sánh: Hepburn (shi, chi, tsu,
 * fu, ji) và kunrei (si, ti, tu, hu, zi) đều là cách gõ hợp lệ của cùng một âm.
 */
function canonLatin(s) {
  return stripLatin(s)
    // âm ghép trước, để không bị cắt sai khi xử lý âm đơn
    .replace(/sh([auo])/g, "sy$1")
    .replace(/ch([auo])/g, "ty$1")
    .replace(/j([auo])/g, "zy$1")
    .replace(/shi/g, "si")
    .replace(/chi/g, "ti")
    .replace(/tsu/g, "tu")
    // âm đơn
    .replace(/fu/g, "hu")
    .replace(/ji/g, "zi")
    .replace(/di/g, "zi")
    .replace(/du/g, "zu");
}

/**
 * Mọi cách viết romaji ASCII hợp lệ của một chuỗi kana.
 * VD じゅうごふん → {jūgofun → jugofun, juugofun}
 */
export function romajiVariants(kana) {
  const base = kanaToRomaji(kana);
  let forms = [base];
  const expand = (ch, reps) => {
    const out = [];
    for (const f of forms) {
      if (!f.includes(ch)) {
        out.push(f);
        continue;
      }
      for (const r of reps) out.push(f.split(ch).join(r));
    }
    forms = [...new Set(out)].slice(0, 32); // chặn bùng nổ tổ hợp
  };
  expand("ū", ["u", "uu"]);
  expand("ō", ["o", "ou", "oo"]);
  // ん trước b/m/p thường được gõ là "m" (しんぶん → shimbun)
  for (const f of [...forms]) if (/n[bmp]/.test(f)) forms.push(f.replace(/n([bmp])/g, "m$1"));
  return new Set(forms.map(stripLatin).filter(Boolean));
}

/**
 * So khớp câu trả lời gõ tay với đáp án kana.
 * Chấp nhận: kana đúng (kể cả katakana), hoặc romaji ở mọi biến thể hợp lệ.
 * `extra` là các đáp án khác cũng được tính đúng (VD dạng kanji).
 */
export function matchesKana(input, answer, extra = []) {
  const raw = String(input || "").trim();
  if (!raw) return false;

  const targets = [answer, ...extra].filter(Boolean);

  // Có kana/kanji trong input → so sánh trực tiếp theo kana.
  if (/[぀-ヿ一-鿿]/.test(raw)) {
    const n = normalizeKana(raw);
    return targets.some((t) => normalizeKana(t) === n);
  }

  // Toàn chữ Latin → so với mọi biến thể romaji (đã quy về dạng chuẩn).
  const n = canonLatin(raw);
  if (!n) return false;
  return targets.some((t) => {
    for (const v of romajiVariants(t)) if (canonLatin(v) === n) return true;
    return false;
  });
}
