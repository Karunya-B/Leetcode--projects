import { useCallback, useEffect, useState } from "react";
import "./App.css";

// The two sorted inputs. In LeetCode 88 these are nums1 (its first m slots) and nums2.
const PHONE_MESSAGES = [
  { id: 1, time: 1002, text: "where are you?", from: "phone" },
  { id: 2, time: 1007, text: "hello??", from: "phone" },
  { id: 3, time: 1015, text: "fine", from: "phone" },
];

const SERVER_MESSAGES = [
  { id: 4, time: 1005, text: "coming", from: "server" },
  { id: 5, time: 1010, text: "2 mins", from: "server" },
  { id: 6, time: 1020, text: "I'm here", from: "server" },
];

// Shown in the code panel; each step highlights the line it is executing.
const CODE = [
  "let i = m - 1;                // last real phone message",
  "let j = n - 1;                // last server message",
  "let k = m + n - 1;            // last slot in the phone array",
  "",
  "while (j >= 0) {",
  "  if (i >= 0 && phone[i].time > server[j].time) {",
  "    phone[k--] = phone[i--];  // phone message is later",
  "  } else {",
  "    phone[k--] = server[j--]; // server message is later",
  "  }",
  "}",
];

/**
 * Runs the merge and records a snapshot of the array + pointers at every
 * comparison and every write. The algorithm below is the real LeetCode 88
 * solution — the only additions are the record() calls.
 */
function buildSteps(phoneMessages, serverMessages) {
  const m = phoneMessages.length;
  const n = serverMessages.length;

  // One array is the whole point: the merge happens in place, inside `phone`.
  const phone = [...phoneMessages, ...Array(n).fill(null)];
  const server = [...serverMessages];

  let i = m - 1;
  let j = n - 1;
  let k = m + n - 1;

  const steps = [];
  const record = (extra) =>
    steps.push({ phone: [...phone], i, j, k, compare: null, written: null, ...extra });

  record({
    phase: "start",
    codeLines: [0, 1, 2],
    explanation:
      `The phone array was allocated with ${n} empty slots at the end — exactly enough ` +
      `room for the server messages. Park all three pointers on the far right and fill backwards.`,
  });

  while (j >= 0) {
    const slot = k;
    const phoneMsg = i >= 0 ? phone[i] : null;
    const serverMsg = server[j];
    const takePhone = phoneMsg !== null && phoneMsg.time > serverMsg.time;

    record({
      phase: "compare",
      codeLines: [5],
      compare: { phone: i >= 0 ? i : null, server: j },
      explanation: phoneMsg
        ? `Compare phone ${phoneMsg.time} against server ${serverMsg.time}. The later of the two claims slot ${slot}.`
        : `No phone messages left to compare (i is ${i}), so server ${serverMsg.time} takes slot ${slot} unopposed.`,
    });

    if (takePhone) {
      phone[k] = phoneMsg;
      i -= 1;
      k -= 1;
      record({
        phase: "write",
        codeLines: [6],
        written: slot,
        explanation: `${phoneMsg.time} "${phoneMsg.text}" is later, so it copies down into slot ${slot}. i and k both step left.`,
      });
    } else {
      phone[k] = serverMsg;
      j -= 1;
      k -= 1;
      record({
        phase: "write",
        codeLines: [8],
        written: slot,
        explanation: `${serverMsg.time} "${serverMsg.text}" is later, so it drops into slot ${slot}. j and k both step left.`,
      });
    }
  }

  const untouched = i + 1;
  record({
    phase: "done",
    codeLines: [10],
    explanation:
      `j is -1, so every server message has landed. ` +
      (untouched > 0
        ? `The ${untouched} phone message${untouched === 1 ? "" : "s"} still at the front never moved — ${untouched === 1 ? "it was" : "they were"} already in the right place.`
        : `Every phone message got copied down too.`),
  });

  return steps;
}

// A non-null cell is either finished output, an untouched input, or a leftover copy.
function cellStatus(step, index) {
  if (step.phone[index] === null) return "empty";
  if (step.phase === "done") return "placed";
  if (index > step.k) return "placed";
  if (index <= step.i) return "pending";
  return "stale";
}

function App() {
  const [steps] = useState(() => buildSteps(PHONE_MESSAGES, SERVER_MESSAGES));
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);

  const step = steps[cursor];
  const atStart = cursor === 0;
  const atEnd = cursor === steps.length - 1;

  const goNext = useCallback(
    () => setCursor((c) => Math.min(c + 1, steps.length - 1)),
    [steps.length],
  );
  const goBack = useCallback(() => setCursor((c) => Math.max(c - 1, 0)), []);
  const reset = () => {
    setPlaying(false);
    setCursor(0);
  };

  // Auto-play: re-arms itself after each step, switches itself off at the end.
  useEffect(() => {
    if (!playing || atEnd) return;
    const timer = setTimeout(() => {
      goNext();
      if (cursor + 1 >= steps.length - 1) setPlaying(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [playing, atEnd, cursor, steps.length, goNext]);

  // Arrow keys step through the merge.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goBack]);

  return (
    <div className="app">
      <header className="intro">
        <h1>Chat Sync</h1>
        <p className="lede">
          You were offline. Your phone kept your own messages; the server kept theirs. Both
          lists are sorted by time, and they have to become one conversation — merged in
          place, into the array your phone already owns. That is LeetCode 88,{" "}
          <em>Merge Sorted Array</em>.
        </p>
      </header>

      <section className="board">
        <div className="row-head">
          <h2>Server</h2>
          <code>nums2</code>
          <span className="hint">read-only — every message here has to find a slot</span>
        </div>
        <div className="cells">
          {SERVER_MESSAGES.map((message, index) => {
            const consumed = index > step.j;
            const comparing = step.compare?.server === index;
            return (
              <div
                key={message.id}
                className={`cell from-server ${consumed ? "consumed" : "pending"} ${comparing ? "comparing" : ""}`}
              >
                <span className="slot">{index}</span>
                <span className="time">{message.time}</span>
                <span className="text">{message.text}</span>
                <span className="ptrs">
                  {index === step.j && <b className="ptr ptr-j">j</b>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="row-head">
          <h2>My Phone</h2>
          <code>nums1</code>
          <span className="hint">the merge happens right here, back to front</span>
        </div>
        <div className="cells">
          {step.phone.map((message, index) => {
            const status = cellStatus(step, index);
            const comparing = step.compare?.phone === index;
            const written = step.written === index;
            return (
              <div
                key={index}
                className={`cell ${status} ${message ? `from-${message.from}` : ""} ${comparing ? "comparing" : ""} ${written ? "written" : ""}`}
              >
                <span className="slot">{index}</span>
                {message ? (
                  <>
                    <span className="time">{message.time}</span>
                    <span className="text">{message.text}</span>
                  </>
                ) : (
                  <span className="text muted">empty slot</span>
                )}
                <span className="ptrs">
                  {index === step.i && <b className="ptr ptr-i">i</b>}
                  {index === step.k && <b className="ptr ptr-k">k</b>}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="narration">
        <span className={`phase phase-${step.phase}`}>{step.phase}</span>
        <p>{step.explanation}</p>
      </section>

      <section className="controls">
        <button onClick={goBack} disabled={atStart}>
          ← Back
        </button>
        <button className="primary" onClick={goNext} disabled={atEnd}>
          Next step →
        </button>
        <button onClick={() => setPlaying((p) => !p)} disabled={atEnd}>
          {playing ? "Pause" : "Auto-play"}
        </button>
        <button onClick={reset} disabled={atStart}>
          Reset
        </button>
        <span className="counter">
          step {cursor + 1} / {steps.length}
        </span>
      </section>

      <section className="panes">
        <div className="pane">
          <h2>The code</h2>
          <pre className="code">
            {CODE.map((line, index) => (
              <div
                key={index}
                className={`code-line ${step.codeLines.includes(index) ? "active" : ""}`}
              >
                <span className="ln">{line ? index + 1 : ""}</span>
                {line || " "}
              </div>
            ))}
          </pre>
        </div>

        <div className="pane">
          <h2>Pointers</h2>
          <ul className="state">
            <li>
              <b className="ptr ptr-i">i</b> phone index {step.i}
              {step.i < 0 && <em> — phone side exhausted</em>}
            </li>
            <li>
              <b className="ptr ptr-j">j</b> server index {step.j}
              {step.j < 0 && <em> — server side exhausted</em>}
            </li>
            <li>
              <b className="ptr ptr-k">k</b> next slot to fill {step.k}
            </li>
          </ul>
          <p className="invariant">
            <code>k === i + j + 1</code> holds after every write — that is exactly why the
            write at <code>k</code> can never clobber a message you still need.
          </p>

          <h2>Legend</h2>
          <ul className="legend">
            <li>
              <span className="swatch pending" /> not merged yet
            </li>
            <li>
              <span className="swatch placed" /> final position
            </li>
            <li>
              <span className="swatch stale" /> leftover copy, safe to overwrite
            </li>
            <li>
              <span className="swatch empty" /> empty slot
            </li>
          </ul>
        </div>
      </section>

      <footer className="why">
        <h2>Why backwards?</h2>
        <p>
          Filling front to back would mean writing over a phone message you have not read
          yet, forcing you to shift the rest of the array right on every insert — O(m·n).
          The empty slots are all at the <em>end</em>, so working right to left always
          writes into space that is either empty or already consumed. One pass, O(m+n), no
          extra array.
        </p>
      </footer>
    </div>
  );
}

export default App;
