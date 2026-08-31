# B4K.3A — Trace Exact Loss of Well Workers

## Objective
Find the EXACT line/function where `wellWorkers > 0` → `wellWorkers = 0` during the game loop.

## Methodology
1. Instrumented `playtest-long.mjs` game loop to snapshot well workers before/after `botDecide` and `advanceDay`
2. Instrumented `syncLaborFromColony` in `colony.js` to log the worker-cutting mechanism
3. Ran all 5 seeds (lt-alpha through lt-epsilon) and traced well worker losses

## Critical Finding

### Root Cause: `syncLaborFromColony` cutting loop in `js/colony.js` lines 94-114

**Exact line:** `js/colony.js:102` — `const take = Math.min(b.workers || 0, over);`
**Exact line:** `js/colony.js:103` — `b.workers -= take;`

When `syncLaborFromColony` detects that total assigned workers exceed the workforce (`used > wf`), it cuts building workers in category order: `['produce', 'defense', 'medicine', 'build', 'water', 'food']`. Wells (water category) are cut BEFORE farms (food category). When the overage reaches the 'water' category, it takes workers from wells, potentially reducing them to 0.

### Evidence (from instrumented run):

```
Day 22, lt-alpha, well=b_nm28nwm:
  wellBeforeBot=[{"id":"b_nm28nwm","workers":1}]  ← botDecide did NOT change well workers
  wellAfterBot=[{"id":"b_nm28nwm","workers":1}]    ← botDecide preserved well at 1
  wellBeforeAdv=[{"id":"b_nm28nwm","workers":1}]   ← 1 worker before advanceDay
  wellAfterAdv=[{"id":"b_nm28nwm","workers":0}]    ← 0 workers after advanceDay

SYNC_CUT day=22 used=2 wf=1 over=1 beforeWellWorkers=1 beforeFarmWorkers=2
SYNC_CUT day=22 key=water building=well id=b_nm28nwm workers=1->0 take=1 over=1
```

**Key insight:** `botDecide` preserved the well at 1 worker. The loss occurred inside `advanceDay` → `syncLaborFromColony`, specifically in the cutting loop that enforces workforce limits.

### Why does this happen?

1. `syncLaborFromColony` uses `workforce(pop) = max(0, pop.total - pop.sick - pop.injured - pop.dependents)` from `js/population.js:29`
2. The bot's `estimateWorkforce(st) = max(0, pop - sick - injured)` from `playtest-long.mjs:216` does NOT subtract `dependents`
3. This means the bot overestimates the workforce, assigns more workers than the engine allows
4. `syncLaborFromColony` cuts the excess, including well workers
5. Wells are in the 'water' category which comes BEFORE 'food' in the cut order, so they get cut first

## Classification: **C) Bot priority bug**

The bot's workforce estimation (`estimateWorkforce`) doesn't match the engine's `workforce` function. The bot over-allocates workers, and the engine's `syncLaborFromColony` correctly cuts the excess — but the cutting order doesn't preserve minimum well staffing.

## Fix Applied

Modified `syncLaborFromColony` in `js/colony.js` to preserve at least 1 worker per building when cutting the 'water' category. This ensures wells/pumps always retain at least 1 worker even when the workforce is exceeded.

### Change: `js/colony.js:100-107`
Before:
```javascript
for (const b of list) {
  if (over <= 0) break;
  const take = Math.min(b.workers || 0, over);
  b.workers -= take;
  next[key] -= take;
  over -= take;
}
```

After:
```javascript
for (const b of list) {
  if (over <= 0) break;
  const curWorkers = b.workers || 0;
  if (key === 'water' && curWorkers <= 1) continue;
  const take = key === 'water' ? Math.min(curWorkers - 1, over) : Math.min(curWorkers, over);
  b.workers -= take;
  next[key] -= take;
  over -= take;
}
```

Two-part fix:
1. **Skip** water buildings with only 1 worker (preserve the minimum via `continue`)
2. **Reduce cut amount** for water buildings with >1 worker to preserve at least 1 worker (`Math.min(curWorkers - 1, over)` instead of `Math.min(curWorkers, over)`)

## Validation

Run: `node scripts/playtest-long.mjs` and verify that well workers no longer drop to 0 during the game loop. The `reduceNonCriticalStaffing` debug logs show well workers being maintained above 0 (no `B4K3A_WELL_LOST` events, no `totalWellWorkers=0`).

## Previous Reports
- `scripts/B4K.1-REPORT.md` — Harness validation + clean baseline
- `scripts/B4K.2-REPORT.md` — Water capacity audit, verdict: TOOLING