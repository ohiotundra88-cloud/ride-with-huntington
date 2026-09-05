# Make the Register page editable by Super Users

Turn on Super User mode, open Register, and every piece of the page becomes editable in place — wording, questions, choice lists, the team discount code, and the links behind the buttons. Changes save for everyone, not just your browser.

## What becomes editable

**Wording** — step names, card titles, every question label, helper and warning text, the "Register on Pelotonia" instruction steps, button labels, the size-guide text and its chest-measurement rows, and the autosave note at the top.

**Which questions appear** — each field gets a small control to hide it or mark it required/optional. Hidden fields disappear for colleagues and stop counting toward "missing required items"; required ones show the red asterisk and are checked before a step counts as complete.

**Choice lists** — participation options (title + description), travel needs, bike rental yes/no/not sure, bike sizes, bike types, pedal preferences, apparel sizes, jersey styles, cuts, address type, and the salary/hourly and pay-grade answers. For each list you can rename, reorder, add and remove options.

**Codes and links** — the team discount code plus the web addresses behind "Open Pelotonia Registration", "Open Concur / ATG" and "Open Unlimited Biking" (and the "(demo)" tag can be removed).

## How editing feels

- A slim bar appears at the top of Register while Super User mode is on: "Editing Register page" with Save, Discard and "Restore defaults".
- Text is click-to-edit inline (same behaviour as the editable text elsewhere in the Hub).
- Each field header gets a small gear that opens a compact panel: Visible / Required, and — for dropdowns and choice cards — the option list with rename, drag-to-reorder, add and delete.
- Nothing changes visually for ordinary colleagues; they see the current saved wording and options.
- Guard rails: a list can't be saved empty, and options already chosen by someone stay stored on their registration even if the option is later renamed or removed.

## Technical notes

1. **New table `public.register_content`** — single row (`id = 1`) holding a `jsonb` `content` blob plus `updated_at` / `updated_by`. Read allowed for `anon` and `authenticated` (the page is reachable before sign-in); write restricted to `public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid())`. GRANTs issued for `anon` (read), `authenticated`, `service_role`; `set_updated_at` trigger, matching the existing `site_branding` pattern.

2. **`src/lib/register-content.shared.ts`** — TypeScript types plus `DEFAULT_REGISTER_CONTENT`, seeded from the strings and option arrays currently hard-coded in `src/routes/register.tsx`. A Zod schema validates the blob; a merge helper fills gaps so an older saved blob never blanks the page.

3. **`src/lib/register-content.functions.ts`** — `getRegisterContent` (public, publishable-key server client, falls back to defaults on any error) and `saveRegisterContent` (`requireSupabaseAuth`, re-checks admin/super-user server-side, validates with Zod, writes `updated_by`).

4. **`src/routes/register.tsx`** — content and option lists come from the loaded config instead of literals. `SIZES`, the participation/travel/bike/apparel option arrays and the review rows all read from it. A local `RegisterEditProvider` holds the draft while editing so Save is one write; `InlineEditText` handles text, a new small `FieldSettingsPopover` handles visible/required + option lists. Step completion checks (`markComplete`, `save`, `StepReview`'s `missing`) use the configured required flags rather than fixed field checks.

5. **Edit mode gate** — reuses the existing Super User session state (`useAdmin`) plus a server-side role check; the save call is authorised server-side regardless of client state.
