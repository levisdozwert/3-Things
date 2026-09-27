import { useEffect, useRef, useState, type CSSProperties } from "react";
import { clock } from "../lib/format";
import { Icon } from "./Icon";
import styles from "./AudioPlayer.module.css";

interface AudioPlayerProps {
  blob: Blob;
  /** Known length, used until the browser reports one (webm often reports Infinity). */
  durationSec: number;
  label?: string;
}

/** "Listen back" — for verifying what someone said. Small on purpose. */
export function AudioPlayer({ blob, durationSec, label = "Listen back" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(durationSec);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setLength(audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setTime(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setTime(value);
  };

  const progress = length > 0 ? Math.min(1, time / length) : 0;

  return (
    <div className={styles.player}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button type="button" className={styles.play} onClick={toggle} aria-label={playing ? "Pause" : label}>
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>
      <div className={styles.track}>
        <div className={styles.meta}>
          <span className={styles.label}>{label}</span>
          <span className="tabular">
            {playing || time > 0 ? `${clock(time)} / ${clock(length)}` : clock(length)}
          </span>
        </div>
        <input
          className={styles.range}
          type="range"
          min={0}
          max={Math.max(length, 0.1)}
          step={0.1}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Position in recording"
          style={{ "--progress": `${progress * 100}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}
