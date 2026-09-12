import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { COPY, type Lang } from "@/lib/copy";
import {
  clampHostOpens,
  clampRooms,
  maxHostOpens,
  MAX_ROOMS,
  MIN_ROOMS,
  runBatch,
  theoreticalStay,
  theoreticalSwitch,
  type Trial,
} from "@/lib/monty";
import { cn } from "@/lib/utils";

const DOOR_OPTIONS = [3, 4, 5, 6, 8] as const;
const SPEED_STEPS = [20, 80, 250, 800] as const;
const LANG_KEY = "mhl-lang";

type Point = { i: number; stay: number; sw: number };

function Door({
  index,
  trial,
  copy,
}: {
  index: number;
  trial: Trial | null;
  copy: (typeof COPY)[Lang];
}) {
  const isPick = trial?.pick === index;
  const isOpened = trial?.opened.includes(index) ?? false;
  const isPrize = trial?.prize === index;
  const isSwitch = trial?.switched === index;

  let caption = "";
  if (isPick) caption = copy.pick;
  else if (isOpened) caption = copy.opened;
  else if (isSwitch) caption = copy.alt;
  else if (isPrize) caption = copy.prize;

  return (
    <div
      className={cn(
        "relative flex h-28 min-w-10 flex-1 flex-col items-center justify-between rounded-md border px-1 py-2 transition-colors duration-(--motion-fast) ease-(--ease-out) sm:h-36",
        isOpened && "border-border bg-bg opacity-45",
        !isOpened && isPrize && "border-prize/50 bg-elevated",
        !isOpened && !isPrize && "border-border bg-surface",
        isPick && "ring-1 ring-primary",
      )}
    >
      <span className="font-mono text-xs text-subtle tabular-nums">{index + 1}</span>
      <span className="font-mono text-lg text-fg">
        {isOpened ? "×" : isPrize ? "★" : "·"}
      </span>
      <span className="min-h-4 text-center font-mono text-xs uppercase tracking-wide text-muted">
        {caption}
      </span>
    </div>
  );
}

export function Simulator() {
  const [lang, setLang] = useState<Lang>("ru");
  const [n, setN] = useState(4);
  const [hostOpens, setHostOpens] = useState(1);
  const [running, setRunning] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [games, setGames] = useState(0);
  const [stayW, setStayW] = useState(0);
  const [swW, setSwW] = useState(0);
  const [last, setLast] = useState<Trial | null>(null);
  const [series, setSeries] = useState<Point[]>([]);

  const runningRef = useRef(running);
  const nRef = useRef(n);
  const kRef = useRef(hostOpens);
  const speedRef = useRef(speedIdx);
  const gamesRef = useRef(0);
  const stayRef = useRef(0);
  const swRef = useRef(0);
  const frameRef = useRef(0);

  runningRef.current = running;
  nRef.current = n;
  kRef.current = hostOpens;
  speedRef.current = speedIdx;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === "en" || stored === "ru") setLang(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (runningRef.current) {
        const batch = SPEED_STEPS[speedRef.current] ?? 250;
        const { stayWins, switchWins, last: t } = runBatch(
          nRef.current,
          kRef.current,
          batch,
        );
        gamesRef.current += batch;
        stayRef.current += stayWins;
        swRef.current += switchWins;
        frameRef.current += 1;
        if (frameRef.current % 2 === 0) {
          const g = gamesRef.current;
          setGames(g);
          setStayW(stayRef.current);
          setSwW(swRef.current);
          setLast(t);
          if (frameRef.current % 16 === 0) {
            setSeries((prev) => {
              const next = [
                ...prev,
                {
                  i: g,
                  stay: (stayRef.current / g) * 100,
                  sw: (swRef.current / g) * 100,
                },
              ];
              return next.length > 48 ? next.slice(-48) : next;
            });
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function resetStats(nextN = n, nextK = hostOpens) {
    const rooms = clampRooms(nextN);
    const k = clampHostOpens(rooms, nextK);
    gamesRef.current = 0;
    stayRef.current = 0;
    swRef.current = 0;
    frameRef.current = 0;
    setGames(0);
    setStayW(0);
    setSwW(0);
    setLast(null);
    setSeries([]);
    setN(rooms);
    setHostOpens(k);
  }

  const copy = COPY[lang];
  const k = clampHostOpens(n, hostOpens);
  const stayPct = games ? (stayW / games) * 100 : 0;
  const swPct = games ? (swW / games) * 100 : 0;
  const tStay = theoreticalStay(n) * 100;
  const tSw = theoreticalSwitch(n, k) * 100;
  const maxK = maxHostOpens(n);

  function toggleLang() {
    const next = lang === "ru" ? "en" : "ru";
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {copy.kicker}
          </p>
          <h1 className="text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            {copy.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted sm:text-base">{copy.lead}</p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleLang} aria-label="Language">
          {copy.lang}
        </Button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">{copy.last}</h2>
            <span className="font-mono text-xs text-subtle tabular-nums">
              n={n} · k={k}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: n }, (_, i) => (
              <Door key={i} index={i} trial={last} copy={copy} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <RateRow
            label={copy.stay}
            pct={stayPct}
            theory={tStay}
            theoryLabel={copy.theory}
            barClass="bg-stay"
          />
          <RateRow
            label={copy.switch}
            pct={swPct}
            theory={tSw}
            theoryLabel={copy.theory}
            barClass="bg-switch"
          />
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <YAxis domain={[0, 100]} hide />
                <Line
                  type="monotone"
                  dataKey="stay"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="sw"
                  stroke="#c8ccd4"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="font-mono text-xs text-subtle tabular-nums">
            {copy.games}: {games.toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-fg">{copy.doors}</legend>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="−"
                disabled={n <= MIN_ROOMS}
                onClick={() => resetStats(n - 1, hostOpens)}
              >
                <Minus />
              </Button>
              <span className="w-10 text-center font-mono text-lg tabular-nums text-fg">
                {n}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="+"
                disabled={n >= MAX_ROOMS}
                onClick={() => resetStats(n + 1, hostOpens)}
              >
                <Plus />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {DOOR_OPTIONS.map((d) => (
                <Button
                  key={d}
                  variant={n === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => resetStats(d, hostOpens)}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-fg">{copy.hostOpens}</legend>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: maxK }, (_, i) => i + 1).map((kOpt) => (
              <Button
                key={kOpt}
                variant={k === kOpt ? "default" : "outline"}
                size="sm"
                onClick={() => resetStats(n, kOpt)}
              >
                {kOpt}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setRunning((r) => !r)}>
              {running ? <Pause /> : <Play />}
              {running ? copy.pause : copy.resume}
            </Button>
            <Button variant="outline" onClick={() => resetStats(n, k)}>
              <RotateCcw />
              {copy.reset}
            </Button>
          </div>
          <label className="flex items-center gap-3 text-sm text-muted">
            <span>{copy.speed}</span>
            <input
              type="range"
              min={0}
              max={SPEED_STEPS.length - 1}
              value={speedIdx}
              onChange={(e) => setSpeedIdx(Number(e.target.value))}
              className="h-11 w-36 accent-primary"
              suppressHydrationWarning
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-medium text-fg">{copy.whyTitle}</h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted">{copy.whyBody}</p>
        <div className="space-y-1 font-mono text-xs text-fg">
          <p>{copy.formulaStay}</p>
          <p>{copy.formulaSwitch}</p>
        </div>
        <p className="mt-2 text-xs text-subtle">{copy.formulaHint}</p>
      </section>

      <p className="pb-6 text-center text-xs text-subtle">{copy.footnote}</p>
    </main>
  );
}

function RateRow({
  label,
  pct,
  theory,
  theoryLabel,
  barClass,
}: {
  label: string;
  pct: number;
  theory: number;
  theoryLabel: string;
  barClass: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-fg">{label}</span>
        <span className="font-mono text-sm tabular-nums text-fg">{pct.toFixed(2)}%</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-xs bg-elevated">
        <div
          className={cn("h-full transition-[width] duration-(--motion-fast)", barClass)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-fg/40"
          style={{ left: `${Math.min(theory, 100)}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-xs text-subtle tabular-nums">
        {theoryLabel} {theory.toFixed(2)}%
      </p>
    </div>
  );
}
