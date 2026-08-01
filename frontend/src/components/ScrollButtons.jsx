import { useEffect, useState } from "react";

export default function ScrollButtons() {
  const [visible, setVisible] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(scrollY > 500);
      setAtBottom(maxScroll <= 0 || scrollY >= maxScroll - 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });

  return (
    <div className={`scroll-fab-group ${visible ? "visible" : ""}`}>
      <button
        type="button"
        className="scroll-fab"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        ↑
      </button>
      <button
        type="button"
        className="scroll-fab"
        onClick={scrollToBottom}
        disabled={atBottom}
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
      >
        ↓
      </button>
    </div>
  );
}
