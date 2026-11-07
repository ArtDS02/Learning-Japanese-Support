// Hook: số phiên bản dữ liệu học, tăng mỗi khi SRS / tiến độ / dữ liệu người dùng
// đổi (kể cả do tab trình duyệt khác ghi). Component gọi hook này sẽ tự vẽ lại
// với số liệu mới — trước đây các hàm subscribe… có sẵn nhưng không ai dùng, nên
// thống kê đầu tab đứng yên sau một phiên học cho tới khi đổi tab.

import { useSyncExternalStore } from "react";
import { subscribeSrs } from "./srs";
import { subscribeProgress } from "./progress";
import { subscribeUserData } from "./userdata";

let version = 0;
const subs = new Set();
let wired = false;

function wire() {
  if (wired) return;
  wired = true;
  const fire = () => {
    version += 1;
    subs.forEach((fn) => fn());
  };
  subscribeSrs(fire);
  subscribeProgress(fire);
  subscribeUserData(fire);
}

function subscribe(fn) {
  wire();
  subs.add(fn);
  return () => subs.delete(fn);
}

const getVersion = () => version;

export function useDataVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
