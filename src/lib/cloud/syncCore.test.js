// Test lõi đồng bộ: `npm test` (node --test, không cần thêm thư viện).

import test from "node:test";
import assert from "node:assert/strict";
import {
  resolvePull,
  firstLoginCase,
  planFirstLogin,
  dirtyKeys,
  afterPush,
  markDirty,
  mergeRaw,
  isSyncedKey,
} from "./syncCore.js";

const J = (v) => JSON.stringify(v);

test("khoá chỉ có nghĩa trên từng máy không được đồng bộ", () => {
  assert.equal(isSyncedKey("jlpt-active-tab"), false);
  assert.equal(isSyncedKey("tts_cfg_v1"), false);
  assert.equal(isSyncedKey("run_progress_v1"), false);
  assert.equal(isSyncedKey("srs_state_v1"), true);
  assert.equal(isSyncedKey("khoa_la"), false);
  let meta = markDirty({ keys: {} }, "jlpt-active-tab", 100);
  assert.deepEqual(dirtyKeys(meta), []);
});

test("pull: máy không sửa gì → nhận bản remote", () => {
  const r = resolvePull({
    key: "vocab_marked_ids",
    localRaw: J([1, 2]),
    entry: { t: 10, base: 10, dirty: false },
    remote: { v: J([1]), t: 50, dev: "B" },
  });
  assert.deepEqual(r, { type: "apply", raw: J([1]), base: 50 });
});

test("pull: bỏ qua bản đã thấy (tiếng vọng của chính máy mình)", () => {
  const r = resolvePull({
    key: "notes_v1",
    localRaw: J({ a: "x" }),
    entry: { t: 70, base: 70, dirty: false },
    remote: { v: J({ a: "x" }), t: 70, dev: "A" },
  });
  assert.equal(r.type, "skip");
});

test("pull: tombstone xoá khoá trên máy", () => {
  const r = resolvePull({
    key: "notes_v1",
    localRaw: J({ a: "x" }),
    entry: { t: 10, base: 10, dirty: false },
    remote: { v: null, t: 90, dev: "B" },
  });
  assert.deepEqual(r, { type: "apply", raw: null, base: 90 });
});

test("xung đột khoá thường: bản sửa sau cùng thắng (bỏ đánh dấu không bị hồi sinh)", () => {
  // Máy B bỏ đánh dấu từ 2 lúc t=200; máy này đánh dấu từ 3 lúc t=150.
  const remoteNewer = resolvePull({
    key: "vocab_marked_ids",
    localRaw: J([1, 2, 3]),
    entry: { t: 150, base: 100, dirty: true },
    remote: { v: J([1]), t: 200, dev: "B" },
  });
  assert.deepEqual(remoteNewer, { type: "apply", raw: J([1]), base: 200 });

  const localNewer = resolvePull({
    key: "vocab_marked_ids",
    localRaw: J([1, 2, 3]),
    entry: { t: 300, base: 100, dirty: true },
    remote: { v: J([1]), t: 200, dev: "B" },
  });
  assert.deepEqual(localNewer, { type: "keep", base: 200 });
});

test("xung đột SRS: gộp theo từng thẻ, ưu tiên ngày ôn gần nhất", () => {
  const local = { vocab: { 1: { box: 1, last: "2026-11-08", reps: 3 }, 2: { box: 2, last: "2026-11-01", reps: 2 } } };
  const remote = { vocab: { 1: { box: 4, last: "2026-11-07", reps: 6 }, 3: { box: 1, last: "2026-11-08", reps: 1 } } };
  const r = resolvePull({
    key: "srs_state_v1",
    localRaw: J(local),
    entry: { t: 500, base: 100, dirty: true },
    remote: { v: J(remote), t: 400, dev: "B" },
  });
  assert.equal(r.type, "merge");
  assert.equal(r.base, 400);
  const merged = JSON.parse(r.raw);
  // Thẻ 1: máy này vừa trả lời sai hôm nay (box 1) — không bị bản cũ hơn (box 4) đè.
  assert.equal(merged.vocab[1].box, 1);
  assert.ok(merged.vocab[2]);
  assert.ok(merged.vocab[3]);
});

test("xung đột progress: streak và lượt ôn lấy max", () => {
  const raw = mergeRaw(
    "progress_v1",
    J({ daily: { "2026-11-07": 5 }, best: 3 }),
    J({ daily: { "2026-11-07": 2, "2026-11-08": 9 }, best: 4 }),
  );
  const p = JSON.parse(raw);
  assert.equal(p.daily["2026-11-07"], 5);
  assert.equal(p.daily["2026-11-08"], 9);
  assert.equal(p.best, 4);
});

test("xung đột Minna: mỗi bài lấy bản mới hơn, sổ câu sai đi theo bản thắng", () => {
  const local = {
    lessons: { 1: { attempts: 2, updatedAt: 100 }, 2: { attempts: 5, updatedAt: 300 } },
    wrong: { "1-a": { lesson: 1 }, "2-a": { lesson: 2 } },
    prefs: { romaji: true },
  };
  const remote = {
    lessons: { 1: { attempts: 3, updatedAt: 200 }, 2: { attempts: 1, updatedAt: 50 } },
    wrong: { "1-b": { lesson: 1 }, "2-b": { lesson: 2 } },
    prefs: { furigana: true },
  };
  const m = JSON.parse(mergeRaw("minna1_v1", J(local), J(remote)));
  assert.equal(m.lessons[1].attempts, 3);
  assert.equal(m.lessons[2].attempts, 5);
  assert.deepEqual(Object.keys(m.wrong).sort(), ["1-b", "2-a"]);
  assert.deepEqual(m.prefs, { romaji: true, furigana: true });
});

test("đăng nhập lần đầu: chọn đúng tình huống", () => {
  const study = { srs_state_v1: J({ vocab: { 1: { box: 2 } } }) };
  assert.equal(firstLoginCase(study, {}), "push");
  assert.equal(firstLoginCase({ swipe_hint_seen_v1: "1" }, { srs_state_v1: { v: study.srs_state_v1, t: 1 } }), "pull");
  assert.equal(firstLoginCase(study, { srs_state_v1: { v: study.srs_state_v1, t: 1 } }), "ask");
  // Tài khoản chỉ có dữ liệu rỗng → coi như trống.
  assert.equal(firstLoginCase(study, { srs_state_v1: { v: J({}), t: 1 } }), "push");
});

test("đăng nhập lần đầu: gộp", () => {
  const localMap = {
    srs_state_v1: J({ vocab: { 1: { box: 2, last: "2026-11-01" } } }),
    notes_v1: J({ a: "máy" }),
  };
  const remoteMap = {
    srs_state_v1: { v: J({ kanji: { 9: { box: 3, last: "2026-11-02" } } }), t: 40 },
    vocab_marked_ids: { v: J([7]), t: 41 },
  };
  const plan = planFirstLogin(localMap, remoteMap, "merge", 1000);
  const srs = JSON.parse(plan.local.srs_state_v1);
  assert.ok(srs.vocab[1] && srs.kanji[9]);
  assert.equal(plan.local.vocab_marked_ids, J([7]));
  assert.ok(!("notes_v1" in plan.local)); // không đổi trên máy
  assert.deepEqual(plan.push.sort(), ["notes_v1", "srs_state_v1"]);
  assert.equal(plan.keys.vocab_marked_ids.dirty, false);
  assert.equal(plan.keys.vocab_marked_ids.base, 41);
  assert.equal(plan.keys.notes_v1.dirty, true);
});

test("đăng nhập lần đầu: dùng dữ liệu tài khoản / dữ liệu máy", () => {
  const localMap = { notes_v1: J({ a: 1 }), kanji_marked: J(["日"]) };
  const remoteMap = { notes_v1: { v: J({ b: 2 }), t: 5 } };

  const remote = planFirstLogin(localMap, remoteMap, "remote", 9);
  assert.equal(remote.local.notes_v1, J({ b: 2 }));
  assert.equal(remote.local.kanji_marked, null); // khoá máy có mà tài khoản không có → xoá
  assert.deepEqual(remote.push, []);

  const local = planFirstLogin(localMap, remoteMap, "local", 9);
  assert.deepEqual(local.local, {});
  assert.deepEqual(local.push.sort(), ["kanji_marked", "notes_v1"]);
});

test("đẩy lên: chỉ hết dirty nếu không bị sửa thêm trong lúc chờ mạng", () => {
  let meta = { keys: {} };
  meta = markDirty(meta, "notes_v1", 100);
  meta = markDirty(meta, "kanji_marked", 100);
  assert.deepEqual(dirtyKeys(meta).sort(), ["kanji_marked", "notes_v1"]);

  const sent = { notes_v1: meta.keys.notes_v1.t, kanji_marked: meta.keys.kanji_marked.t };
  meta = markDirty(meta, "kanji_marked", 100); // sửa thêm khi đang gửi
  meta = afterPush(meta, sent);
  assert.equal(meta.keys.notes_v1.dirty, false);
  assert.equal(meta.keys.notes_v1.base, sent.notes_v1);
  assert.equal(meta.keys.kanji_marked.dirty, true);
  assert.ok(meta.keys.kanji_marked.t > sent.kanji_marked);
});
