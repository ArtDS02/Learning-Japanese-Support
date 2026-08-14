// Client helper cho dashboard admin — chỉ dùng trong dev (endpoint do Vite plugin cung cấp).

/** Đọc nội dung hiện tại của 1 file data (src/data/<file>.json). */
export async function loadData(file) {
  const res = await fetch(`/api/admin?file=${encodeURIComponent(file)}`);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Không đọc được ${file}`);
  }
  return res.json();
}

/** Ghi đè file data. `data` là object JS, sẽ được lưu thành JSON đẹp. */
export async function saveData(file, data) {
  const res = await fetch(`/api/admin?file=${encodeURIComponent(file)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Không lưu được ${file}`);
  }
  return res.json();
}
