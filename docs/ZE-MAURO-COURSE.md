# Independent Zé Mauro course

The October 26, 2026 request establishes a separate course area inside the existing platform,
using the current SLL visual shell. Buying Zé's offer does not grant access to Pri's course.
The owner explicitly excluded the 16 shared welcome and store-setup videos in the final block
of the supplied lesson list. Only the recordings in the Zé Mauro block are imported.

## Catalog

The inventory in `data/ze-mauro/course.json` contains 14 modules, 65 lesson entries and 57
distinct Panda videos. The source's module numbering, advanced modules and bonuses are
preserved. Separate recordings with repeated titles remain separate lessons. The repeated
module-4 video link is imported only once.

Eight entries have no supplied video: the grouped cover-photo lessons, listing photos two
through four, chat broadcast, Shopee updates, affiliate updates and cash-flow explanation.
They appear as coming soon, without playable links or completion controls, and are excluded
from the progress total. Video durations are left empty because the source does not provide them.

The member area is `/ze-mauro`; lessons use `/ze-mauro/aula/<lesson-id>`. Navigation,
completion and completion reversal work without JavaScript. Progress belongs to each account
and each lesson; Zé's course uses its own lesson IDs. The course offers the first available
unfinished lesson when resuming.

## Access

The existing `sll` commercial entitlement is retained. Its immutable purchase expert and
current eligibility determine which course areas may be opened. `learning_tracks.expert`
defaults existing tracks to `pri`; the imported course is owned by `ze`.

- Zé-only accounts enter `/ze-mauro` and cannot open Pri's pages, actions or materials.
- Pri-only accounts cannot open Zé's course or complete its lessons.
- Accounts entitled to both experts may open both areas, with separate progress.
- A manual SLL grant uses the explicitly assigned manual expert, defaulting to Pri.
- Expired or revoked underlying entitlements do not become valid through a remembered preference.
- Active administrators can open the course and its lessons through a read-only preview,
  even without a Zé student entitlement. The preview neither reads nor writes lesson progress
  and never changes the account's purchases or grants. Student action guards remain enforced.

Checks run on the server, including direct action calls and material/cover downloads. Pri's
published catalog excludes Zé's tracks. Shared caches contain no account progress or access
decisions. No fallback imports Pri's videos into the Zé catalog.

## Administration and deployment

Edit the existing course in the normal content editor. Add missing Panda blocks there when
the recordings are ready. Valid published video blocks become playable automatically and
enter the available-lesson progress total unless explicitly made optional in the editor. The expert administration screen maps real Hotmart
offer codes to the corresponding expert and supports manual expert assignments. Its legacy
video replacement controls now apply only to Pri's content; edit Zé's videos in his own course.
The expert administration screen links directly to the administrator preview at `/ze-mauro`.

Migration `0069_course-expert-isolation.sql` adds and validates track ownership. The normal
production migration command imports the course before starting the server. Importing uses
a transaction and an advisory lock, creates only an absent course, and preserves existing
administrator edits, archived content and student progress. It never copies local account IDs.

```bash
bun --env-file=.env.local scripts/import-ze-mauro.ts --check
bun --env-file=.env.local scripts/import-ze-mauro.ts
```

The check command rolls back its transaction. The local development database has been migrated
and seeded. Production publication is a separate deployment step.

## Verification

Unit tests cover inventory validation and unavailable players. Integration tests cover import
rollback/idempotency, manual assignments, access in both directions, private completion and
cross-course material downloads. Browser tests cover desktop/mobile layouts in light/dark
themes, accessibility, direct links, completion without JavaScript and unavailable lessons.
The browser checks load the supplied Panda player and verify playback of the first recording
through its play control. They do not establish playback availability for all 57 external recordings.
Test-only cache/IP headers are disabled for the external player to avoid artificial CORS failures.
