import { useEffect, useState } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());

  const dateLabel = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    tz = "";
  }

  return (
    <div className="live-clock" title={tz}>
      <span className="live-clock-dot" />
      <div className="live-clock-text">
        <div className="live-clock-time">
          {h}<span className="colon">:</span>{m}<span className="colon">:</span><span className="secs">{s}</span>
        </div>
        <div className="live-clock-date">{dateLabel}{tz ? ` · ${tz.split("/").pop().replace("_", " ")}` : ""}</div>
      </div>
    </div>
  );
}
