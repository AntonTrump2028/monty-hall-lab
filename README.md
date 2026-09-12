# Monty Hall Lab

Live stay-vs-switch simulator. Pick how many rooms (`n`), how many empty ones the host opens (`k`). Rates converge to:

```
P(stay)   = 1 / n
P(switch) = (1 - 1/n) / (n - 1 - k)
```

3 rooms, k=1 → 33.3% / 66.7%.
4 rooms, k=1 → 25% / 37.5%.

| File | What |
|---|---|
| `src/lib/monty.ts` | engine + formulas |
| `src/components/simulator.tsx` | live UI |
| `src/lib/copy.ts` | RU / EN copy |

MIT
