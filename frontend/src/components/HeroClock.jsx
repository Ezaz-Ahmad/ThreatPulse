import { useEffect, useState } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function HeroClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const local = { h: pad(now.getHours()), m: pad(now.getMinutes()), s: pad(now.getSeconds()) };
  const utc = { h: pad(now.getUTCHours()), m: pad(now.getUTCMinutes()), s: pad(now.getUTCSeconds()) };

  const dateLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ");
  } catch {
    tz = "";
  }

  return (
    <div className="hero-clock">
      <span className="hero-clock-corner tl" />
      <span className="hero-clock-corner tr" />
      <span className="hero-clock-corner bl" />
      <span className="hero-clock-corner br" />
      <div className="hero-clock-scan" />

      <div className="hero-clock-status">
        <span className="pulse-dot" />
        System Monitoring Active
      </div>

      <div className="hero-clock-main">
        {local.h}
        <span className="colon">:</span>
        {local.m}
        <span className="colon">:</span>
        <span className="secs">{local.s}</span>
      </div>

      <div className="hero-clock-sub">
        {dateLabel}
        {tz && ` · ${tz}`}
      </div>

      <div className="hero-clock-divider" />

      <div className="hero-clock-utc">
        <span className="hero-clock-utc-label">UTC</span>
        <span className="hero-clock-utc-time">{utc.h}:{utc.m}:{utc.s}</span>
      </div>
    </div>
  );
}
