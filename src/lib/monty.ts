export type Trial = {
  n: number;
  hostOpens: number;
  prize: number;
  pick: number;
  opened: number[];
  switched: number;
  stayWin: boolean;
  switchWin: boolean;
};

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export const MIN_ROOMS = 3;
export const MAX_ROOMS = 20;

export function clampRooms(n: number): number {
  const v = Math.round(n);
  return Math.min(MAX_ROOMS, Math.max(MIN_ROOMS, Number.isFinite(v) ? v : MIN_ROOMS));
}

/** Host can open at most n-2 empty rooms so one alternative stays closed. */
export function maxHostOpens(n: number): number {
  return Math.max(1, n - 2);
}

export function clampHostOpens(n: number, k: number): number {
  const max = maxHostOpens(n);
  return Math.min(max, Math.max(1, k));
}

/** P(stay) = 1/n — first pick never updates. */
export function theoreticalStay(n: number): number {
  return 1 / n;
}

/**
 * Complementary mass (n-1)/n is split uniformly across remaining
 * unopened non-picked doors after the host opens k goats.
 */
export function theoreticalSwitch(n: number, hostOpens: number): number {
  const k = clampHostOpens(n, hostOpens);
  const remaining = n - 1 - k;
  if (remaining <= 0) return 0;
  return (1 - 1 / n) / remaining;
}

export function runTrial(n: number, hostOpens: number): Trial {
  const k = clampHostOpens(n, hostOpens);
  const prize = randInt(n);
  const pick = randInt(n);

  const goats: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== pick && i !== prize) goats.push(i);
  }
  shuffleInPlace(goats);
  const opened = goats.slice(0, k);

  const remain: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== pick && !opened.includes(i)) remain.push(i);
  }
  const switched = remain[randInt(remain.length)] ?? pick;

  return {
    n,
    hostOpens: k,
    prize,
    pick,
    opened,
    switched,
    stayWin: pick === prize,
    switchWin: switched === prize,
  };
}

export function runBatch(
  n: number,
  hostOpens: number,
  count: number,
): { stayWins: number; switchWins: number; last: Trial } {
  let stayWins = 0;
  let switchWins = 0;
  let last: Trial | null = null;
  for (let i = 0; i < count; i++) {
    last = runTrial(n, hostOpens);
    if (last.stayWin) stayWins++;
    if (last.switchWin) switchWins++;
  }
  return { stayWins, switchWins, last: last! };
}
