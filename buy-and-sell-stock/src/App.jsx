import { useCallback, useEffect, useState } from "react";
import "./App.css";

// Ten days of the gold rate, in rupees per gram. This is LeetCode 121's `prices`.
const PRICES = [7200, 7000, 7400, 6800, 7100, 6500, 6850, 7600, 6700, 7300];

const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;

// Shown in the code panel; each step highlights the line it is executing.
const CODE = [
  "class Solution:",
  "    def maxProfit(self, prices: List[int]) -> int:",
  "        min_price = float('inf')   # cheapest day seen so far",
  "        max_profit = 0             # best profit found so far",
  "",
  "        for price in prices:",
  "            if price < min_price:",
  "                min_price = price",
  "            elif price - min_price > max_profit:",
  "                max_profit = price - min_price",
  "",
  "        return max_profit",
];

/**
 * Runs the single pass and records a snapshot before and after each decision.
 * The algorithm is the real LeetCode 121 solution — the only additions are the
 * record() calls, plus buyDay/sellDay, which the interview answer does not need
 * (it returns just the profit) but which make the trade visible on the chart.
 */
function buildSteps(prices) {
  let minPrice = Infinity;
  let minDay = null;
  let maxProfit = 0;
  let buyDay = null;
  let sellDay = null;

  const steps = [];
  const record = (extra) =>
    steps.push({
      minPrice,
      minDay,
      maxProfit,
      buyDay,
      sellDay,
      day: null,
      profitToday: null,
      ...extra,
    });

  record({
    phase: "start",
    examinedThrough: -1,
    codeLines: [2, 3],
    explanation:
      "Two numbers carry the whole answer: the cheapest rate seen so far, and the best profit " +
      "found so far. Then walk the days left to right, once. No going back.",
  });

  for (let day = 0; day < prices.length; day++) {
    const price = prices[day];
    const isNewLow = price < minPrice;
    const profitToday = minPrice === Infinity ? null : price - minPrice;
    const prevBest = maxProfit;

    record({
      phase: "examine",
      day,
      examinedThrough: day,
      profitToday,
      codeLines: [5, 6],
      explanation: isNewLow
        ? minPrice === Infinity
          ? `Day ${day}, ${rupees(price)}. First day, so it is trivially the cheapest rate seen so far.`
          : `Day ${day}, ${rupees(price)} — cheaper than the ${rupees(minPrice)} low from day ${minDay}. A new best day to buy.`
        : `Day ${day}, ${rupees(price)}. Not a new low. Buying at the ${rupees(minPrice)} low from day ${minDay} and selling today earns ${rupees(profitToday)}; the best so far is ${rupees(prevBest)}.`,
    });

    if (isNewLow) {
      minPrice = price;
      minDay = day;
      record({
        phase: "buy",
        day,
        examinedThrough: day,
        profitToday,
        codeLines: [6, 7],
        explanation:
          `Move the buy candidate to day ${day}. Note the ${"elif"} — when the price is a new low we do ` +
          `not even test for profit. Selling on the day you buy earns nothing, and every future sale ` +
          `is better off starting from this cheaper price.`,
      });
    } else if (profitToday > maxProfit) {
      maxProfit = profitToday;
      buyDay = minDay;
      sellDay = day;
      record({
        phase: "profit",
        day,
        examinedThrough: day,
        profitToday,
        codeLines: [8, 9],
        explanation: `${rupees(profitToday)} beats the previous best of ${rupees(prevBest)}. Best trade is now buy day ${buyDay}, sell day ${sellDay}.`,
      });
    } else {
      record({
        phase: "skip",
        day,
        examinedThrough: day,
        profitToday,
        codeLines: [8],
        explanation:
          `${rupees(profitToday)} does not beat ${rupees(prevBest)}, so nothing changes. ` +
          `A profitable day is not automatically the best day.`,
      });
    }
  }

  record({
    phase: "done",
    day: prices.length - 1,
    examinedThrough: prices.length - 1,
    codeLines: [11],
    explanation:
      maxProfit > 0
        ? `Answer: ${rupees(maxProfit)}, by buying on day ${buyDay} at ${rupees(prices[buyDay])} and selling on day ${sellDay} at ${rupees(prices[sellDay])}. Every day was looked at exactly once.`
        : `The rate never rose after any low, so no trade beats doing nothing. Answer: ${rupees(0)}.`,
  });

  return steps;
}

function App() {
  const [steps] = useState(() => buildSteps(PRICES));
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

  // Arrow keys step through the pass.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goBack]);

  // Bar heights: pad the range so the cheapest day is still a visible bar.
  const lo = Math.min(...PRICES);
  const hi = Math.max(...PRICES);
  const pad = (hi - lo) * 0.25;
  const scaleLow = lo - pad;
  const scaleHigh = hi + pad;
  const heightPct = (price) => ((price - scaleLow) / (scaleHigh - scaleLow)) * 100;

  const isLive = step.phase !== "start" && step.phase !== "done";

  return (
    <div className="app">
      <header className="intro">
        <p className="eyebrow">LeetCode 121 · Best Time to Buy and Sell Stock</p>
        <h1>Gold Rate Tracker</h1>
        <p className="lede">
          You have been noting the gold rate every morning for ten days. You get to buy on
          exactly one day and sell on exactly one <em>later</em> day. Which pair earns the
          most — and can you find it without checking all forty-five pairs?
        </p>
      </header>

      <section className="chart-wrap">
        <div className="chart">
          {step.minPrice !== Infinity && (
            <div className="floor" style={{ bottom: `${heightPct(step.minPrice)}%` }}>
              <span className="floor-tag">cheapest so far {rupees(step.minPrice)}</span>
            </div>
          )}

          <div className="bars">
            {PRICES.map((price, day) => {
              const future = day > step.examinedThrough;
              const current = isLive && day === step.day;
              const candidate = day === step.minDay;
              const isBuy = day === step.buyDay;
              const isSell = day === step.sellDay;

              return (
                <div key={day} className="col">
                  <div className="above">
                    {current && step.profitToday !== null && !isBuy && (
                      <span className={`bubble ${step.phase === "profit" ? "win" : ""}`}>
                        {step.profitToday >= 0 ? "+" : ""}
                        {rupees(step.profitToday)}
                      </span>
                    )}
                  </div>
                  <div className="track">
                    <div
                      className={[
                        "bar",
                        future ? "future" : "seen",
                        current ? "current" : "",
                        candidate ? "candidate" : "",
                        isBuy ? "buy" : "",
                        isSell ? "sell" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ height: `${heightPct(price)}%` }}
                    />
                  </div>
                  <div className="tags">
                    {isBuy && <span className="tag tag-buy">BUY</span>}
                    {isSell && <span className="tag tag-sell">SELL</span>}
                    {candidate && !isBuy && <span className="tag tag-cand">low</span>}
                  </div>
                  <span className="price">{price}</span>
                  <span className="day">day {day}</span>
                </div>
              );
            })}
          </div>
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
          <pre className="code-block">
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
          <h2>What it remembers</h2>
          <ul className="state">
            <li>
              <b className="tag tag-cand">min_price</b>
              {step.minPrice === Infinity ? (
                <em>inf — no day seen yet</em>
              ) : (
                <>
                  {rupees(step.minPrice)} <em>(day {step.minDay})</em>
                </>
              )}
            </li>
            <li>
              <b className="tag tag-sell">max_profit</b>
              {rupees(step.maxProfit)}
              {step.buyDay !== null && (
                <em>
                  (buy day {step.buyDay} → sell day {step.sellDay})
                </em>
              )}
            </li>
          </ul>
          <p className="invariant">
            Two variables, no array of results, nothing revisited. That is the entire state
            — O(1) space.
          </p>

          <h2>Legend</h2>
          <ul className="legend">
            <li>
              <span className="swatch future" /> not looked at yet
            </li>
            <li>
              <span className="swatch current" /> today
            </li>
            <li>
              <span className="swatch candidate" /> cheapest so far (buy candidate)
            </li>
            <li>
              <span className="swatch sell" /> best trade found
            </li>
          </ul>
        </div>
      </section>

      <footer className="why">
        <h2>Why one pass is enough</h2>
        <p>
          The obvious approach tries every buy day against every later sell day. For ten
          days that is 45 pairs; for the 100,000 days the constraints allow, it is about
          five billion — far too slow. The trick is to flip the question. Instead of asking
          "which pair is best?", ask for each day: <em>if I sold today, what is the most I
          could have made?</em> That answer is just today's price minus the cheapest price
          before today — and you already know that number, because you have been carrying it
          the whole way. One pass, O(n) time, O(1) space.
        </p>

        <h2>The three traps</h2>
        <ul className="state">
          <li>
            <code>max_profit = 0</code>, not <code>-inf</code>. If the rate only ever falls,
            you simply do not trade, and the answer is 0 rather than the least-bad loss.
            That is Example 2 in the problem.
          </li>
          <li>
            <code>elif</code>, not a second <code>if</code>. On a new low there is nothing
            worth testing. A plain <code>if</code> is still correct here — the profit would
            be exactly 0, which never beats <code>max_profit</code> — but it does pointless
            work and hides the reasoning.
          </li>
          <li>
            Update <code>min_price</code> <em>before</em> using it on later days, never
            after. Buy must come strictly before sell; carrying the minimum forward is what
            enforces that, with no index comparison anywhere.
          </li>
        </ul>
      </footer>
    </div>
  );
}

export default App;
