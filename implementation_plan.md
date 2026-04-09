# BLB Church Digital Management System — Implementation Plan

> Converting static Google Stitch HTML exports into a fully functional Supabase-powered church management platform.

## Background

We have **12 Stitch export directories**, each containing a `code.html` (static page with inline TailwindCSS) and a `screen.png` (design reference). The Supabase project `vscjivuatnchqwtcgggn` is **active and healthy** but has **no tables yet**. The existing UI uses a premium "Reverent Editorial" design system with TailwindCSS CDN, Inter + Plus Jakarta Sans fonts, and Material Symbols.

### Existing Stitch Pages
| Stitch Folder | Maps To | Role |
|---|---|---|
| `public_homepage` | Public Home | Visitor |
| `login_screen` | Login (all roles) | All |
| `member_registration_page` | Registration | Visitor |
| `member_web_dashboard` | Member Dashboard | Member |
| `admin_dashboard` | Admin Dashboard | Admin |
| `members_management` | Members List | Admin |
| `member_profile_detail` | Member Profile | Admin |
| `events_announcements_hub` | Events & Announcements | Admin |
| `media_management_hub` | Media Management | Admin |
| `payments_management_dashboard` | Payments/Contributions | Admin |
| `ministry_detail_women_s_ministry` | Department Detail | Admin |
| `sanctuary_design_system` | Design Tokens (DESIGN.md) | Reference |

---

## User Review Required

> [!IMPORTANT]
> **TailwindCSS CDN**: The Stitch files use `cdn.tailwindcss.com` for styling. We will keep this approach for consistency with the existing design. This is fine for an internal church management tool but not ideal for production-critical public sites.

> [!IMPORTANT]
> **Super Admin Dashboard**: No Stitch export exists for the Super Admin pages. We will create these from scratch matching the existing design language (sidebar nav, editorial cards, same color scheme).

> [!WARNING]
> **Currency**: The design doc mentions TZS (Tanzanian Shillings) but Stitch uses USD. **Which currency should we use?** The system will be set up to support your preference.

> [!IMPORTANT]
> **Social Login**: The login page shows Google and Facebook login buttons. Should we implement these, or just email/password login for now?

---

## Proposed Changes

### Phase 1: Supabase Backend Setup (Database + Storage + RLS)

This phase creates all database tables, storage buckets, and Row Level Security policies.

---

#### Supabase Migration: Core Tables

**Tables to create (matching the design document):**

1. **`departments`** — Church departments/ministries
2. **`profiles`** — User profiles linked to `auth.users` (id = auth.uid)
3. **`announcements`** — General & department-targeted announcements
4. **`events`** — Church events with audience targeting
5. **`media_items`** — Uploaded photos/videos with metadata
6. **`contributions`** — Offering/giving records
7. **`sermons`** — Sermon records with audio/video URLs
8. **`system_settings`** — Church-wide configuration (single row)
9. **`admin_permissions`** — Fine-grained admin permissions

**Storage buckets:**
- `media` — Images, event banners, gallery uploads
- `sermons` — Audio files, sermon documents
- `profiles` — Profile pictures

**RLS Policies (summary):**

| Table | Member | Admin | Super Admin |
|---|---|---|---|
| `profiles` | Read own | Read all, Update members | Full access |
| `contributions` | Read own | Read all, Create | Full access |
| `announcements` | Read matching | CRUD | Full access |
| `events` | Read allowed | CRUD | Full access |
| `media_items` | Read public | CRUD | Full access |
| `sermons` | Read public | CRUD | Full access |
| `departments` | Read all | CRUD | Full access |
| `system_settings` | Read | Read | Full access |
| `admin_permissions` | — | Read own | Full access |

---

### Phase 2: Project Scaffolding & Shared Design System

Create the organized file structure with shared components extracted from Stitch exports.

#### [NEW] Project File Structure

```
c:\FlutterProjects\blb_church\
├── index.html                    (redirect → public/index.html)
├── public/
│   ├── index.html                (homepage)
│   ├── login.html                (login page)
│   ├── register.html             (registration page)
├── member/
│   ├── dashboard.html            (member dashboard)
│   ├── contributions.html        (my contributions)
│   ├── announcements.html        (announcements view)
│   ├── events.html               (events view)
│   ├── sermons.html              (sermons/media view)
│   ├── profile.html              (my profile)
├── admin/
│   ├── dashboard.html            (admin dashboard)
│   ├── members.html              (members management)
│   ├── member-profile.html       (member detail view)
│   ├── announcements.html        (announcements CRUD)
│   ├── events.html               (events CRUD)
│   ├── media.html                (media management)
│   ├── contributions.html        (contributions/offerings)
│   ├── departments.html          (departments management)
│   ├── reports.html              (reports page)
├── super-admin/
│   ├── dashboard.html            (super admin dashboard)
│   ├── admins.html               (admin management)
│   ├── roles.html                (roles & permissions)
│   ├── settings.html             (global settings)
├── assets/
│   ├── css/
│   │   └── shared.css            (shared styles, editorial shadow, glass effects)
│   ├── js/
│   │   ├── supabase-client.js    (Supabase init + helpers)
│   │   ├── auth.js               (login, register, logout, session)
│   │   ├── router.js             (role-based redirect guard)
│   │   ├── common.js             (shared utilities, notifications, loaders)
│   │   ├── member.js             (member dashboard logic)
│   │   ├── admin.js              (admin dashboard logic)
│   │   ├── super-admin.js        (super admin logic)
│   │   ├── members-mgmt.js       (members management CRUD)
│   │   ├── announcements-mgmt.js (announcements CRUD)
│   │   ├── events-mgmt.js        (events CRUD)
│   │   ├── media-mgmt.js         (media upload/management)
│   │   ├── contributions-mgmt.js (contributions CRUD)
│   │   └── reports.js            (reports & charts)
│   └── images/
│       └── (placeholder images)
```

#### [NEW] `assets/css/shared.css`
Extracted design tokens from the Stitch exports:
- Color variables matching the Reverent Editorial palette
- Typography setup (Inter headlines, Plus Jakarta Sans body)
- Glass header/blur effects
- Editorial shadow utility
- Shared Tailwind config (identical across all Stitch pages)

#### [NEW] `assets/js/supabase-client.js`
Initialize Supabase client using the public anon key:
```js
const SUPABASE_URL = 'https://vscjivuatnchqwtcgggn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...'; // your anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

### Phase 3: Authentication & Role-Based Routing

#### [NEW] `assets/js/auth.js`
- **Register**: Create account with Supabase Auth → insert profile with role `member`
- **Login**: Authenticate → fetch profile → redirect based on role
- **Logout**: Sign out → redirect to login
- **Session Guard**: Check session on protected pages, redirect if unauthorized

#### [NEW] `assets/js/router.js`
Role-based page protection:
```
member/* → requires role: member, admin, or super_admin
admin/* → requires role: admin or super_admin  
super-admin/* → requires role: super_admin only
```

#### [MODIFY] `public/login.html` (from `login_screen/code.html`)
- Add form submission handler calling `auth.js`
- Wire role selector tabs to route after login
- Add error/success notification UI
- Link "Request Membership" to register page

#### [MODIFY] `public/register.html` (from `member_registration_page/code.html`)
- Add form `id` attributes and `name` attributes to all inputs
- Wire form submission to Supabase Auth signup + profile insert
- Populate department dropdown from `departments` table
- Add validation (password match, required fields)
- Wire "Login" link to login page

---

### Phase 4: Member-Facing Pages

#### [MODIFY] `member/dashboard.html` (from `member_web_dashboard/code.html`)
- Load user profile and display welcome message
- Fetch and display own contribution summary (total, recent)
- Fetch and display announcements (filtered by department + general)
- Fetch and display upcoming events
- Wire sidebar navigation links to actual pages
- Wire "Give Now" and other quick action buttons

#### [NEW] `member/contributions.html`
- Table of own contribution records with filters
- Summary cards (total, by type)
- Based on the Stitch member dashboard contribution section style

#### [NEW] `member/announcements.html`
- List of announcements targeting the member's department + general
- Card-based layout matching the Stitch design

#### [NEW] `member/events.html`
- List of upcoming events the member can see
- Card layout from the events_announcements_hub Stitch

#### [NEW] `member/sermons.html`
- List of sermons with audio/video playback
- Glass player component from the Stitch design

#### [NEW] `member/profile.html`
- View and edit own profile details
- Based on member_profile_detail Stitch design (simplified for member self-view)

---

### Phase 5: Admin & Super Admin Pages

#### [MODIFY] `admin/dashboard.html` (from `admin_dashboard/code.html`)
- Wire summary cards to real data (total members, registrations, contributions, events)
- Wire attendance chart to real data
- Wire recent activity to real data
- Wire quick action buttons to actual pages

#### [MODIFY] `admin/members.html` (from `members_management/code.html`)
- Load members from `profiles` table with pagination
- Implement search and department filter
- Wire "Add New Member" button to modal form
- Wire "View Profile" to member-profile detail page

#### [MODIFY] `admin/member-profile.html` (from `member_profile_detail/code.html`)
- Load specific member's profile by ID from URL params
- Display personal details, ministry involvement, contribution history
- Wire "Edit Profile" to edit modal
- Wire "Contact" to email action

#### [MODIFY] `admin/events.html` (from `events_announcements_hub/code.html`)
- Load events from database with filters (status, category)
- Implement "New Event" modal with form
- Wire announcements sidebar to real data
- CRUD operations for events and announcements

#### [MODIFY] `admin/media.html` (from `media_management_hub/code.html`)
- Implement drag-and-drop file upload to Supabase Storage
- Load media gallery from `media_items` table
- Implement category filters
- Wire edit/delete actions

#### [MODIFY] `admin/contributions.html` (from `payments_management_dashboard/code.html`)
- Load transactions from `contributions` table with pagination
- Implement "New Contribution" form
- Wire filters (type, date, member)
- Summary stat cards with real data

#### [NEW] `admin/announcements.html`
- Full CRUD for announcements
- Target type selector (general vs department)
- Active/expired status management

#### [NEW] `admin/departments.html`
- List, create, edit departments
- Show member counts per department

#### [NEW] `admin/reports.html`
- Members by department chart
- Monthly contributions chart
- Contributions by type breakdown
- Events created summary

---

#### Super Admin Pages (New — No Stitch Export)

#### [NEW] `super-admin/dashboard.html`
- System overview cards (total admins, members, settings status)
- Same design language as admin dashboard

#### [NEW] `super-admin/admins.html`
- List all admin/super_admin users
- Create new admin, change roles, deactivate

#### [NEW] `super-admin/roles.html`
- View and edit `admin_permissions` for each admin
- Toggle granular permissions

#### [NEW] `super-admin/settings.html`
- Edit `system_settings` (church name, logo, colors, contact info)
- Upload church logo to storage

---

## Open Questions

> [!IMPORTANT]
> 1. **Currency**: Should the system use **TZS** (Tanzanian Shillings) or **USD**? This affects display formatting throughout.
> 2. **Social Login**: Should we implement Google/Facebook login, or just email/password for now?
> 3. **Email Verification**: Should new member registrations require email verification before accessing the dashboard?
> 4. **First Super Admin**: How should the first super_admin account be created? Options: (a) seed it via SQL migration, (b) first registered user becomes super_admin.
> 5. **Build Order Priority**: The design doc suggests 5 phases. Should we follow that order, or do you have a different priority? I suggest:
>    - **Phase 1**: Database + Auth (get the foundation right)
>    - **Phase 2**: Login + Register + Role routing (working auth flow)
>    - **Phase 3**: Member dashboard (first user-facing page)
>    - **Phase 4**: Admin dashboard + management pages
>    - **Phase 5**: Super admin + reports + polish

---

## Verification Plan

### Automated Tests
- Run all pages in browser against live Supabase
- Test auth flow: register → login → correct dashboard redirect
- Test RLS: member cannot access admin data
- Test CRUD operations on all tables

### Manual Verification
- Browser test each page for visual integrity (compare against Stitch screenshots)
- Test role-based access by logging in as member, admin, super_admin
- Test file uploads to storage buckets
- Verify responsive layout on different screen sizes

### Browser Tests
- Navigate to login page → register new member → verify redirect to member dashboard
- Login as admin → verify admin dashboard loads with real data
- Test creating announcement, event, contribution from admin panel
- Test member seeing only their own contribution records
