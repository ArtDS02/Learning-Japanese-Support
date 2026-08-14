import { useEffect, useState } from "react";
import { speak, ttsSupported, hasJaVoice, onVoicesReady, jaVoiceName } from "../../lib/tts";

/**
 * Nút phát âm tiếng Nhật. Tự ẩn khi máy không có giọng `ja` (Linux tối giản,
 * một số Android cũ) để không hiện nút bấm vào không kêu.
 */
export default function SpeakButton({
  text,
  size = "md",
  label,
  className = "",
  stopPropagation = true,
}) {
  const [ready, setReady] = useState(hasJaVoice());
  const [playing, setPlaying] = useState(false);

  useEffect(() => onVoicesReady(() => setReady(hasJaVoice())), []);

  if (!text || !ttsSupported() || !ready) return null;

  const onClick = (e) => {
    if (stopPropagation) e.stopPropagation();
    setPlaying(true);
    speak(text, { onEnd: () => setPlaying(false) });
  };

  return (
    <button
      type="button"
      className={`spk spk--${size} ${playing ? "is-playing" : ""} ${className}`}
      onClick={onClick}
      title={`Nghe phát âm${jaVoiceName() ? ` (${jaVoiceName()})` : ""}`}
      aria-label={label || "Nghe phát âm"}
    >
      <span aria-hidden="true">{playing ? "🔉" : "🔊"}</span>
      {label && <span className="spk__label">{label}</span>}
    </button>
  );
}
