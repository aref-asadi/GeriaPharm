<<<<<<< HEAD
# GeriaPharm
=======
# GeriaPharm

A React + TypeScript clinical reference PWA built from the Aref Project specification. Includes all 15 supplied medication records, instant generic/Iranian-brand/disease search, six Beers table views, detailed monographs, bookmarks, a live regimen checker, and a device-local clinician CMS.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To check and build:

```sh
npm test
npm run build
npm run preview
```

The compiled static application is in `dist/`. Deploy that directory to an HTTPS static host with SPA fallback to `index.html`. No server, API credentials, or database service is required. The included Sites configuration identifies the private preview created for this project; remove that association before registering an independent Site.

## Offline installation

Service workers are generated for the production build, not the development server. Open the production URL online once and wait for “Available offline.” Install through the browser's app-install menu on desktop or Add to Home Screen on iOS. The service worker precaches HTML, JavaScript, CSS and icons. Local registry data is stored in IndexedDB, with LocalStorage used if IndexedDB cannot initialize. The app does not cache any remote clinical API.

To verify on a deployment: load the app once, wait for offline readiness, close it, disable the network, reopen it and exercise search, monographs, bookmarks, the regimen and CMS. Browser/device offline restart and installation behavior still require acceptance testing; build verification alone does not prove that flow. Private hosted authentication may require connectivity on first access or when authentication expires. For controlled clinical deployment, use an organization-managed HTTPS static host.

Browser storage is device/profile/origin specific. Clearing site data, private browsing or storage eviction may remove edits. Export backups regularly. Storage failures are surfaced rather than silently claiming to save. An intentionally empty registry stays empty and is not automatically reseeded.

## Registry and CMS

Use Admin CMS to create, edit, duplicate or delete records. Forms support all supplied schema fields, brand tags, custom therapeutic categories, explicit interaction classes, dynamic drug and disease interactions, renal rules, evidence, flags, alternatives and source notes. Class tags permit newly added medicines to participate in class matching.

Export creates a versioned JSON backup with medications and an export timestamp. Import supports that format or a legacy bare array, validates every record and unique IDs, previews the replacement count, and requires confirmation before replacing the registry. Invalid imports leave the existing registry unchanged. Reset restores the shipped seed. The CMS is intentionally local and has no authentication; users sharing a browser profile share access to its registry.

## Regimen behavior

- Patient-independent Table 2 and Table 4 guidance is presented as conditional recommendations, including exceptions supplied in the registry.
- Each medication pair is checked in both directions, with one combined result per pair. Known class membership and explicit admin tags support class targets. Generic-name and brand matching do not equate an entire therapeutic specialty with a specific pharmacologic class.
- Opioid/benzodiazepine and opioid/gabapentinoid combinations have explicit additional screening. Dual RAS blockade prompts contextual review; it is not asserted to be universally contraindicated.
- Two or more strong anticholinergic flags and three or more CNS-active flags trigger cumulative burden alerts. Repeated IDs do not inflate the counts.
- CrCl and eGFR are separate inputs. Missing, invalid or unsupported renal data produces an incomplete-check notice. Rules support strict/inclusive comparison operators and inclusive ranges. No renal measure is inferred from the other.
- Disease aliases normalize BPH, dementia/cognitive impairment, falls/fractures, urinary incontinence and Parkinson disease.
- Patient conditions and renal values remain in memory. Bookmarks and medication IDs persist locally; no patient identifiers are collected.
- “No recorded alerts triggered” does not mean a regimen is safe. Unregistered medicines, unknown classes, absent rules, indications, dose, duration, sex-specific applicability and some exceptions require clinical review. The seed includes only one renal rule per medication; contextual dose adjustments elsewhere in narrative guidance are not automatically parsed.

## Clinical provenance and release status

The supplied document is a product specification and seed source, not independently validated clinical evidence. `src/data/seed.json` preserves all 15 supplied records, including Iranian brands, alternatives, dosing and flags. The UI identifies the registry as a starter reference requiring clinical review; it is not an official AGS product or a complete implementation of the Beers Criteria.

Authoritative reference: [American Geriatrics Society 2023 updated AGS Beers Criteria](https://doi.org/10.1111/jgs.18372). [AGS pocket guide](https://aging.rush.edu/wp-content/uploads/2023/10/AGS-Beers-Pocket-Guide-2023.pdf).

Clinical release requires qualified review of each supplied recommendation, evidence rating, interaction, alternative, brand and dose. Known review points include the supplied tramadol renal dose, the diphenhydramine CNS-active flag relative to Table 5 classes, and indication-specific anticoagulant advice. The raw input is preserved in `seed.json`. `seedData.ts` removes the unsupported fixed tramadol renal dose and excludes diphenhydramine from the Table 5 CNS class count while retaining its anticholinergic flag and warnings. Both corrections are noted in the monographs; the remaining supplied guidance still requires review. Do not use the seed as a validated prescribing authority. Drug changes and deprescribing require clinical judgment.

## Source structure

- `src/App.tsx`: navigation, library, filters, monographs and persistent bookmarks/regimen IDs.
- `src/components/Checker.tsx`: clinical inputs and live audit presentation.
- `src/components/Admin.tsx`: CMS, modular editor and backup flows.
- `src/components/Modal.tsx`: native modal dialog with focus restoration and Escape handling.
- `src/services/checker.ts`: pure regimen screening and renal-rule parsing.
- `src/services/db.ts`: persistence, schema validation and transactional whole-registry replacement.
- `src/types/types.ts`: TypeScript types and Zod runtime schemas.
- `src/data/seed.json`, `src/data/seedData.ts`: supplied clinical content and validation.
- `src/styles.css`: responsive clinical design, including mobile bottom navigation.
- `vite.config.ts`: React, Tailwind and PWA setup.

## Validation

Automated tests cover clinical pairing and class matching, cumulative thresholds, repeated IDs, renal boundaries and missing metrics, disease aliases, invalid JSON and duplicate IDs, plus IndexedDB create/update/delete/reset, backup round trips and empty-registry persistence. Production build includes TypeScript checking and generated service-worker precache output. Browser visual, accessibility, install and offline-restart acceptance testing remains outstanding.
>>>>>>> 4094b90 (Implement GeriaPharm offline clinical reference and regimen workspace)
