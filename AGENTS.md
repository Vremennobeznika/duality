# INSTRUCTIONS FOR AN AI AGENT — DUO

## Mission

The repository is a clean generic two-person checklist and shared calendar. Configure it **for the new owner only**. Do not look for or reuse any other owner's infrastructure, real names, old private repo contents, private keys, Telegram tokens, photos, Git history, backups, or hosted apps. The original author is not a service provider for this template.

### Copy-paste prompt from a nontechnical owner

> Настрой этот репозиторий DUO для двух участников с отдельными паролями и общим календарём. Прочитай README.md и AGENTS.md полностью. Создай только мою независимую инфраструктуру, не подключай чужие Supabase, GitHub или Telegram. Используй бесплатный тариф, если он доступен. Разверни GitHub Pages и, если я подключу свой Supabase, установи SQL-схему и Edge Function, задай защищённые секреты, исправь только нужную конфигурацию, проверь вход, задачи, календарь, сохранение, синхронизацию, историю, мобильную версию и разграничение доступа. Не публикуй мои пароли и ключи. Выполни всё доступное, сообщи только о действиях, требующих моего доступа, затем дай QA-матрицу с подтверждениями и прямую ссылку.

## Engineering requirements

1. Inspect files, confirm no user data/secrets, track source state and available repo permissions.
2. Use the existing zero-dependency static HTML/CSS/ESM structure; don't add frameworks, bundlers or paid infrastructure.
3. Default mode is browser-local (no login/security guarantee, no cross-device sync). For sync, ask owner to connect their **own** Supabase project, never guess their credentials.
4. Execute `supabase/schema.sql` only in the newly connected owner's project. Keep RLS enabled and revoke anon/authenticated privileges. Deploy only `supabase/functions/api/index.ts` as `api` with `verify_jwt = false` because the function enforces custom HMAC sessions.
5. Secrets must be generated privately and stored in the new owner's Supabase secrets: `SESSION_SECRET`, `USER_ONE_PASSWORD`, `USER_TWO_PASSWORD`, `ALLOWED_ORIGIN`. Never echo these to logs, chat, commits or generated HTML. Use a unique random `SESSION_SECRET` of at least 40 bytes. The Supabase-provided service key stays server-side.
6. Update only `config.js` with the new public API URL. The canonical client uses two generic accounts `one` / `two`; rename visible aliases only if explicitly requested.
7. Publish GitHub Pages from a new repo. Do not publish build artifacts containing real data. Prefer a **single initial commit**, then one reviewed fix commit if necessary; never rewrite a repository's real history merely to reduce commit count.
8. Validate: app loads on HTTPS, client ESM is parsed, 375px and desktop no overflow, local add/check/delete tasks, calendar dates, export/import; server 401 for anonymous read/write, 401 for bad credentials, successful login, both independent password rotations, no cross-project access, optimistic conflict 409, two-client sync, Telegram not configured, slow/offline behavior.
9. Preserve data on failures. Back up before any destructive migrations. Never use real user secrets in test fixtures. Run tests with `node --test tests/model.test.mjs`; browser E2E separately.
10. Finish with matrix: requirement / action / test executed / actual result / remaining risk, plus website URL. Label untested operations explicitly. Do not claim a deployment without checking it.

## Important boundaries

- A public Pages repo is normal and does not keep front-end source private. Authorization is at the Edge Function/database boundary only.
- GitHub Pages subpaths within the same `username.github.io` domain share origin. For high confidentiality prefer a separate custom domain or host. This template uses a tab-scoped sessionStorage token rather than a long-lived cookie.
- Backend password hashes are PBKDF2-SHA256 and salted; no recovery of the old plaintext password is possible. Rotate or reset credentials with consent, never extract.
- Do not assume the backend is operational just because static local mode works.
- The original demo does not include bot tokens, notification delivery or third-party account integration. Add them only upon explicit new-owner request.

## Key QA acceptance

P0: no leak of real names, passwords, personal calendar data, project IDs or API keys; no unauthenticated remote data; no overwrite on revision conflict; no destructive migration. P1: two-person tasks/events, export/import, browser reload, password rotation, responsive navigation. P2: polish, performance and optional integrations.
