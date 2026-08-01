import HelpTip from "./HelpTip";
import { GLOSSARY } from "../data/glossary";

export default function TermHints({ terms }) {
  if (!terms?.length) return null;

  return (
    <div className="term-hints">
      <span className="term-hints-label">New to this? Key terms:</span>
      {terms.map((key) => {
        const entry = GLOSSARY[key];
        if (!entry) return null;
        return (
          <span className="term-hint-chip" key={key}>
            {entry.term}
            <HelpTip title={entry.term}>{entry.definition}</HelpTip>
          </span>
        );
      })}
    </div>
  );
}
