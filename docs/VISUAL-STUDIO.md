# Working in VS Code and Visual Studio

This is a Node and TypeScript web app, so **VS Code is the primary editor**: the repo ships settings, recommended extensions and debug configurations for it. Visual Studio 2022 works too for editing, Copilot and attach-debugging; see the second half.

## Prerequisites

| Tool                | Version / note                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Node.js             | 22 LTS, 22.18 or newer (the unit tests rely on Node's built-in TypeScript support)         |
| npm                 | Comes with Node. Use `npm ci` (there is a `package-lock.json`).                            |
| Git                 | Any recent version                                                                         |
| PostgreSQL 17       | Server and client (`psql`), or Docker `postgres:17`, for the database tests and local data |
| PostgREST and nginx | Only to run the full app locally (README.md quick start)                                   |

### Windows: use WSL2

Some npm scripts use POSIX shell syntax (`build:node` sets `NITRO_PRESET=... vite build`; `test:db` uses `${PGHOST:-/tmp}`), and the database reset script is Bash. They do not run in `cmd.exe` or PowerShell. On Windows:

- **Recommended:** clone and work inside WSL2 (Ubuntu). In VS Code install the "WSL" extension and use "WSL: Open Folder in WSL". Everything in this repo then behaves exactly as in CI.
- **Alternative:** install Git for Windows and point npm at Git Bash: `npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"`. `reset.sh` then runs from Git Bash if `psql` is on the path.

**Line endings.** The code is formatted with LF line endings, and `npm run lint` fails with Prettier "Delete ␍" errors if Git converts files to CRLF. Before cloning on Windows run `git config --global core.autocrlf input` (or clone inside WSL2). `.editorconfig` and `.vscode/settings.json` keep new files on LF.

## VS Code

1. **Open the folder** (File, Open Folder) at the repo root.
2. **Install the recommended extensions** when VS Code offers (or Extensions view, filter "@recommended"). They are listed in `.vscode/extensions.json`:
   - ESLint, Prettier, EditorConfig: formatting and linting exactly as CI does.
   - Tailwind CSS IntelliSense, Pretty TypeScript Errors.
   - GitHub Copilot and Copilot Chat.
   - GitHub Actions (CI status and workflow editing).
   - PostgreSQL (Microsoft) for browsing the local database.
   - Markdown Preview Mermaid Support, so the diagrams in `docs/` render in preview.
   - Azure App Service and Azure Container Apps, for deployment.
3. **Use the workspace TypeScript** when prompted ("Allow"), so the editor matches `npm run typecheck`.
4. **Install and configure:** `npm ci`, then `cp .env.example .env.local` and fill it in (README.md quick start).

What `.vscode/settings.json` does: Prettier formats on save, ESLint fixes on save, LF line endings, `@/` imports, Tailwind class completion inside `cn()` and `cva()`, the generated route tree is read-only, and build output is hidden from search.

### Running and debugging

Open Run and Debug (Ctrl+Shift+D) and pick a configuration from `.vscode/launch.json`:

| Configuration                        | What it does                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Hub: dev server (server breakpoints) | Runs `npm run dev` in a debug terminal. Breakpoints in server functions, `src/server/*` and server routes stop here. |
| Hub: browser (Edge) / (Chrome)       | Opens http://localhost:5173 with the debugger attached for React code. Start the dev server first.                   |
| Hub: full stack (dev server + Edge)  | Both of the above together.                                                                                          |
| Hub: production Node build (.output) | Runs the `npm run build:node` output exactly as Azure would, with `.env.local`. Build first.                         |
| Unit tests (node --test)             | Runs `tests/*.test.ts` under the debugger.                                                                           |
| Pelotonia sync (one small run)       | One sync run against your local PostgREST, capped at 25 rider profiles.                                              |

Everyday commands (Terminal, Ctrl+`):

```sh
npm run dev          # http://localhost:5173
npm run typecheck
npm run lint         # add -- --fix to auto-fix
npm test
npm run test:db      # needs local PostgreSQL 17; see CONFIGURATION.md "Local database tooling"
npm run build:node
```

Tip: a server function's code runs on the server even though you call it from a component. Put breakpoints inside `.handler(...)` and use the dev server configuration, not the browser one.

## Visual Studio 2022

Visual Studio has no project file to open here; use **Open Folder**.

1. In the Visual Studio Installer, add the **Node.js development** workload (it brings the JavaScript and TypeScript tooling). Install Node 22 separately.
2. File, Open, Folder, and choose the repo root. Visual Studio reads `tsconfig.json`, uses the project's TypeScript from `node_modules`, and honors `.editorconfig`.
3. Run commands in View, Terminal (Developer PowerShell). Because of the Windows shell issue above, run the npm scripts from a WSL or Git Bash terminal, or open the folder from `\\wsl$\...`.
4. **Formatting and linting:** Visual Studio does not run Prettier on save by default. Run `npm run lint -- --fix` (or `npm run format`) before committing; CI enforces it.
5. **Debugging:** start the server with the Node inspector and attach.

   ```sh
   node --inspect node_modules/vite/bin/vite.js dev   # dev server (settings from .env.local)
   node --inspect .output/server/index.mjs            # production build (set its settings first)
   ```

   Start Vite directly as shown. `NODE_OPTIONS=--inspect npm run dev` attaches the inspector to npm itself, not to the server.

   Then Debug, Attach to Process, choose the JavaScript (V8 inspector / Chrome DevTools) connection type, target `localhost:9229`, and attach to the Node process. For React code, use the browser's developer tools (F12 in Edge).

If you use both editors, VS Code's debug configurations are the fastest route to breakpoints; Visual Studio is comfortable for reading, refactoring and Copilot Chat.

## Using GitHub Copilot well on this codebase

### It already has context

`.github/copilot-instructions.md` summarizes the conventions (where code lives, how server functions and RLS work, how to add migrations, what to run before finishing). Copilot Chat loads it automatically in VS Code (`github.copilot.chat.codeGeneration.useInstructionFiles` is on in the workspace settings). In recent Visual Studio 2022 versions, turn on custom instructions under Tools, Options, GitHub, Copilot. Keep that file up to date when conventions change; it is the cheapest way to improve every suggestion.

### Point it at the right files

Copilot answers better when you attach the files that matter:

- Architecture questions: attach `docs/ARCHITECTURE.md`.
- Anything about settings or errors: attach `docs/CONFIGURATION.md`.
- A feature: attach its `*.functions.ts`, `*.shared.ts`, the page in `src/routes/`, and the migration that created its tables.
- Database or permission work: attach the migration and `supabase/tests/security_hardening.sql`.

In VS Code chat use `#file:` (or drag files in) and `@workspace` for repo-wide questions. In Visual Studio use `#` references to files.

### Example prompts

- "Using #file:docs/ARCHITECTURE.md, explain what happens from clicking Approve in /admin/approvals to the event appearing on the calendar. Name the functions and tables involved."
- "Add a `notes` text field to vendor contacts. Write the migration with RLS unchanged, update `src/lib/vendors.shared.ts` and `vendors.functions.ts`, and the form in `VendorForm.tsx`. Follow .github/copilot-instructions.md."
- "Write a server function that lists my team events for the next 30 days. Use requireSupabaseAuth and context.supabase, validate input with zod, and put the types in team-events.shared.ts."
- "Review this migration for RLS mistakes: can an authenticated user read or change rows that are not theirs? Suggest a test case for supabase/tests/security_hardening.sql."
- "Implement the Azure Blob storage adapter described in docs/DEPLOYMENT.md section 4 inside src/server/backend.server.ts, keeping the R2 path working. Add the new settings to docs/CONFIGURATION.md and .env.example."
- "Replace the Aspire Identity client in src/server/session.server.ts with Entra ID using openid-client, following docs/ENTRA.md, and keep the exports signIn, completeSignIn, signOut and currentUser unchanged."
- "Why does `npm run lint` fail on this file? Fix it without changing behavior."

### Check its work

- Copilot does not know about RLS unless you tell it. Reject suggestions that switch `context.supabase` to `supabaseAdmin` to "fix" an empty result; the empty result is usually a policy doing its job.
- Suggestions that read `process.env` in app code should use `setting()` instead.
- Suggestions from Supabase tutorials (Supabase Auth, `supabase.auth.*`, Edge Functions, Realtime, `@supabase/ssr`) do not apply here.
- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:db` for SQL changes. CI will run them anyway.
