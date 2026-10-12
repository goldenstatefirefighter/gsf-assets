# GSF confirmed audit corrections, October 12, 2026

This draft review branch starts at main commit `4de672f3d092fb55d16355750f218fca05a2d57c`. No merge, deployment or CMS publication has occurred.

The change set corrects 36 directory records while preserving all 371 records and every unapproved field. It distinguishes city, county and CAL FIRE unit contacts; preserves interim and division command roles; labels closed recruitment cycles; and states credential alternatives and deadlines. Central Fire's former listing name remains searchable. CRC is a historical institution record. The current North County Monterey page names Interim Chief Jess Cortez, so the report's Joel Mendoza suggestion was not applied. Lompoc remains held because direct official evidence was inaccessible. Every before/after field and source appears in `review/directory-changes.json`.

The native career sources repair quiz back/reset state and role-specific testing guidance. Directory counts derive from data, with a visibly partial 40-record fallback. Jobs sources show public, internal, promotional or unknown access, pay and observation dates; reject expired/stale feeds; and preserve safe links. The staged parser retains the all-failure no-write guard and keeps Santa Clara city and county distinct. A same-day check completed all 170 agency feeds with zero errors and 36 listings: 32 public, 2 internal and 2 promotional. Production listings and site scripts are unchanged; `review/protected-baselines.json` records their SHA-256 hashes.

The cost subtotal includes South Bay's mandatory $199 preparation course: academy high $7,929, total high $9,614, conditional card fees excluded, and the cited part-time academy takes about six months. Financial sources correct 457 remaining-year math for YTD, future employer/other-plan contributions and eligible compensation; scope the 7(k) route and FLSA minimum within double-time pay; explain comp-time cash/leave distinctions; fix zero-growth fee warnings; and enforce pension age, quarter, cap and custom eligibility limits. They remain staged CMS templates.

`review/article-exact-edit-plan.json` contains 18 exact edits across 10 current public articles, with unchanged div/image counts. It is a surgical edit plan requiring an authenticated-body comparison, not a complete public-page replacement or clearance to publish consequential financial or safety claims. `review/article-public-baselines.json` records current fetches, including two unavailable guessed slugs that were not edited.

Run the checks from this checkout:

- `node tests/test-career.cjs`: 11 groups and 2,427 checks.
- `node native/financial/test-financial-tools.cjs`: 18 groups.
- `python tests/test-parser.py`: 7 tests.

The tests execute actual scripts with independent arithmetic and filter expectations. Browser layout and Squarespace save persistence still require manual verification.

The only changed pre-existing live-path file is `directory/ca-fire-departments.json`. Merging that file changes publicly fetched data. Templates and parser under `native/` do not install into the CMS or active scheduler automatically. Intermediate exact-edit ledgers document preparation history and must not be replayed as final release plans. Use the final source files and final article plan.

Read `review/release-gates.json` and `review/remaining-scope.json` before release. The full audit remains open. Police and Healthcare are excluded. No settings, credentials, subscriptions, commercial prices or scheduler configuration changed.
