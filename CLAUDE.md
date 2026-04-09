# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BLB Church Digital Management System** — a web-based church management platform with three role tiers: `member`, `admin`, `super_admin`. No build step, no package manager. All pages are plain HTML + Tailwind CDN + vanilla JavaScript, backed by Supabase.

- **Supabase project:** `vscjivuatnchqwtcgggn` (URL and anon key are already in `assets/js/supabase-client.js`)
- **Currency:** TZS (Tanzanian Shillings) — use `formatTZS()` from `supabase-client.js` for all money display
- **Design system:** "The Reverent Editorial" — deep blue (`#00236f`) + gold (`#fed01b`), Inter headlines, Plus Jakarta Sans body

## Running / Developing

There is no build process. Open HTML files directly in a browser or serve with any static file server:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

The Supabase backend is live — all pages talk to the real database. No local emulator is configured.

## Architecture

### Script loading order (every protected page)
Every page that requires auth must load scripts in this exact order:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../assets/js/supabase-client.js"></script>
<script src="../assets/js/common.js"></script>
<script src="../assets/js/auth.js"></script>
<script src="../assets/js/router.js"></script>
```
The `supabase` global must exist before any other module runs.

### Page protection
Every protected page body must have `data-required-role` and call `initPageGuard()` on load:
```html
<body data-required-role="member">   <!-- or "admin" or "super_admin" -->
```
```js
const profile = await initPageGuard(); // returns profile or null (already redirected)
if (!profile) return;
```
`initPageGuard()` (in `router.js`) checks session, validates `status === 'active'`, enforces role hierarchy, populates `[data-user-name]` / `[data-user-department]` / `[data-user-avatar]` elements, and wires `[data-action="logout"]` buttons.

### Role hierarchy
```
member (1) < admin (2) < super_admin (3)
```
An admin can access `data-required-role="member"` pages. A member cannot access `data-required-role="admin"` pages.

### Auth flow
- **Register:** `handleRegistration(formData)` in `auth.js` → Supabase signUp → profile update → auto-login → `redirectToDashboard(role)`
- **Login:** `handleLogin(email, password)` → signInWithPassword → fetch profile role → check `status === 'active'` → `redirectToDashboard(role)`
- **Logout:** `logoutUser()` → signOut → redirect to `/public/login.html`

### Key shared helpers (`supabase-client.js`)
| Function | Purpose |
|---|---|
| `getSession()` | Current Supabase session or null |
| `getUserProfile()` | Profile row with `departments(name)` join |
| `getUserRole()` | Shortcut for profile.role |
| `formatTZS(amount)` | Format number as TZS currency |
| `formatDate(str)` | Short date (Apr 5, 2026) |
| `formatDateTime(str)` | Date + time |
| `timeAgo(str)` | "2 hours ago" relative time |
| `uploadFile(bucket, path, file)` | Upload to Supabase Storage |
| `getStorageUrl(bucket, path)` | Public URL for storage file |

### Common UI utilities (`common.js`)
| API | Usage |
|---|---|
| `Toast.success/error/warning/info(msg)` | Slide-in notification |
| `Loader.show(msg)` / `Loader.hide()` | Full-page loading overlay |
| `Modal.show({title, content, size})` | Returns `{close, modal, body}` |
| `Modal.confirm(message, onConfirm)` | Confirmation dialog |
| `debounce(fn, wait)` | Debounce for search inputs |
| `escapeHtml(text)` | XSS-safe output — **always use this for user data** |
| `getInitials(name)` | "John Doe" → "JD" |
| `getUrlParam(name)` | Query string helper |

## Database Tables

| Table | Key columns |
|---|---|
| `profiles` | `id` (= auth.uid), `full_name`, `email`, `phone`, `role`, `department_id`, `status`, `avatar_url` |
| `departments` | `id`, `name`, `description` |
| `announcements` | `id`, `title`, `content`, `target_type` (general/department), `department_id`, `is_urgent`, `expires_at`, `created_by` |
| `events` | `id`, `title`, `description`, `start_date`, `end_date`, `location`, `category`, `created_by` |
| `contributions` | `id`, `member_id`, `amount`, `type` (tithe/offering/building_fund/thanksgiving/special), `date`, `notes` |
| `sermons` | `id`, `title`, `speaker`, `date`, `audio_url`, `video_url`, `description` |
| `media_items` | `id`, `title`, `file_url`, `category`, `is_public`, `uploaded_by` |
| `system_settings` | single-row table for church name, logo, contact info, colors |
| `admin_permissions` | fine-grained permission flags per admin user |

Members can only read their **own** rows in `contributions`. RLS enforces this server-side.

## File Structure

```
blb_church/
├── public/          # Unauthenticated pages (index, login, register)
├── member/          # Role: member+ (dashboard, contributions, announcements, events, sermons)
├── admin/           # Role: admin+ (dashboard, members, events, media, contributions, reports…)
├── super-admin/     # Role: super_admin only (admins, roles, settings)
├── assets/
│   ├── css/shared.css          # Design tokens, glass effects, badge/skeleton utilities
│   └── js/
│       ├── supabase-client.js  # Supabase init + all data helpers
│       ├── auth.js             # register/login/logout/redirect
│       ├── router.js           # initPageGuard(), populateUserUI(), setActiveNavLink()
│       └── common.js           # Toast, Loader, Modal, escapeHtml, debounce…
└── stitch/          # READ-ONLY Stitch design exports — visual reference only, do not edit
```

## Design Conventions

- **Tailwind config** is inlined in every page's `<head>` — same token set copied from the design system. Do not use arbitrary values that break the palette.
- **No 1px borders** between content areas — use background color shifts instead.
- **Skeleton loaders** on every async section: show skeleton divs, hide them after data loads, show real content.
- **Sidebar active state** uses class `nav-link-active` (blue text + right gold border). Set it on the link matching the current page.
- All user-supplied text rendered to HTML **must** go through `escapeHtml()`.
- Page body starts with `style="opacity:0; transition: opacity 0.3s ease;"` — `initPageGuard()` sets it to `1` after auth check to prevent flash of content.

## What Is Not Built Yet

Admin section (`admin/`), super-admin section (`super-admin/`), and `member/profile.html` are not yet created. The `stitch/` folder contains the reference designs for all admin pages.
