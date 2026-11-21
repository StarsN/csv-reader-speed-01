[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/StarsN/csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/StarsN/csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

Built for the [make.fun bounty “Read broken CSV files faster, 21 November 2026”](https://make.fun/bounty/csv-reader-speed-01-run-20261121) — $100 in USDC. Referral code: `e7twrv07`.

# csv-reader-speed-01 — a faster drop-in for csv-reader 1.0.0

Entry for make.fun competition `csv-reader-speed-01-run-20261121`: write a faster
drop-in for make.fun's own csv-reader 1.0.0 that answers exactly as it does on
every case (Node 22, no dependencies).

## Files

- `solve.js` — the entry. `run(input)` returns `{columns, rows, errors}` for one
  case's `{text, header}`, identical to csv-reader 1.0.0's reading: BOM dropped,
  LF/CRLF record ends, stray CRs dropped with `stray_cr`, quoted fields with `""`
  folding and CR/CRLF read as LF, `quote_junk` for text after a closing quote,
  `unterminated_quote` re-read as unquoted, short/long rows padded or cut to the
  first record's width with `short_row` / `long_row` errors.
- `main.ts` — the harness driver (unchanged from the house baseline): reads
  `/input/cases.json`, answers each case with `run`, writes `/output/answers.json`.

## How it is fast

The reference builds every field one character at a time. This one never reads
a character twice: unquoted fields are taken as one slice up to the next
delimiter (a single regex search for `,` / CR / LF), quoted fields as one slice
up to their closing quote (`indexOf` scan, doubled quotes folded in bulk with
one `replace`), and line breaks inside quotes are counted in bulk. No state is
kept between calls; every case is answered alone.

## Practice-set check (kit's 6 cases, ~10.2 MB of CSV)

- Answers identical to the kit's `practice/reference/expected.json` on all 6
  cases, and identical to the house baseline's output.
- Also verified against the reference on 20,132 differential fuzz cases
  (hand-written edge cases plus generated broken CSV) and on 3 freshly drawn
  generator sets (18 cases): 0 mismatches.
- Local CPU (this machine, Node 24, whole `main.ts` run incl. JSON I/O):
  this entry ~0.65 s vs the house baseline ~1.5 s on the same practice set.
