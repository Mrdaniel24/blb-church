# Church Digital Management System — System Design Document

> Version 1.0  
> Stack: HTML, CSS, JavaScript, Supabase  
> Purpose: A full project document that another AI, developer, or extension can read and understand clearly before coding.

## 1. Project Overview

This project is a **Church Digital Management System** made of two main sides:

1. **Public / Member Side**
   - For visitors and church members
   - Used to register, log in, view announcements, view events, see personal giving records, and access church content

2. **Admin Side**
   - For church staff and leaders
   - Used to manage members, announcements, events, media, departments, offerings, reports, and system settings

3. **Super Admin Side**
   - Highest control level
   - Used to manage admins, approve permissions, configure the system, and oversee all data

The system should be built as a **web application** using:
- **Frontend:** HTML, CSS, JavaScript
- **Backend / Database / Auth / Storage:** Supabase

The language used in the UI should be simple, clear, and easy to understand.

---

## 2. Main Goal of the System

The goal is to create one church platform that helps with:
- communication
- member management
- announcements
- event management
- media uploads
- offerings / contribution records
- reports
- role-based access

This is not just a normal website. It is a **church management and communication platform**.

---

## 3. Core Objectives

### 3.1 Information and Identity
The system should help the church present:
- church name
- church history
- vision and mission
- service times
- leadership information
- departments / ministries

### 3.2 Communication
The system should help the church communicate with:
- members
- visitors
- departments
- leaders

### 3.3 Member Services
Members should be able to:
- create an account
- log in
- view their personal dashboard
- see department announcements
- see general announcements
- see their own offering records
- view events
- access sermons and media

### 3.4 Content Management
Admins should be able to:
- create announcements
- upload events
- upload photos and videos
- organize media by category
- manage church content

### 3.5 Operations and Reporting
Church leaders should be able to:
- track offerings
- track members
- track departments
- generate weekly and monthly reports
- view simple charts

### 3.6 Security and Roles
The system should separate user access clearly so that:
- members only see member tools
- admins see management tools
- super admins control the whole system

---

## 4. Target Users

### 4.1 Visitor
A visitor is someone who has no account yet.

Visitor can:
- view public pages
- see church information
- see public events
- contact the church
- register as a member

Visitor cannot:
- access member dashboard
- access admin pages

### 4.2 Member
A member is a registered church user.

Member can:
- log in
- view personal dashboard
- see own contribution records
- see department announcements
- see general announcements
- view events
- view sermons / media
- update some profile details

Member cannot:
- manage other members
- create announcements
- upload official media as admin
- access admin dashboard

### 4.3 Admin
An admin is a church staff or trusted leader.

Admin can:
- log in to admin dashboard
- manage announcements
- manage events
- manage media uploads
- manage members
- record offerings / payments
- create department updates
- view reports

Admin cannot:
- manage super admin settings unless given permission
- create or remove super admins directly

### 4.4 Super Admin
A super admin is the highest system authority.

Super Admin can:
- manage admins
- assign roles
- configure permissions
- manage all system modules
- manage settings
- oversee all records
- see all reports

---

## 5. System Scope

### Included in Version 1
- authentication
- role-based dashboards
- member registration
- member login
- admin login
- super admin login
- announcements module
- events module
- media module
- member profile module
- offering records module
- departments module
- reports module

### Optional Future Features
- prayer requests
- online giving / donations
- live streaming link integration
- SMS notifications
- email notifications
- attendance tracking
- mobile app version

---

## 6. High-Level Modules

## 6.1 Public Website Module
This is visible without login.

Pages may include:
- Home
- About Church
- Leadership
- Departments
- Events
- Sermons
- Media Gallery
- Contact
- Register
- Login

Purpose:
- provide information
- help visitors understand the church
- invite new members to join

## 6.2 Member Module
This starts after member login.

Features:
- personal dashboard
- own profile
- own offerings / contributions
- department announcements
- general announcements
- events list
- sermons and media access

## 6.3 Admin Module
This starts after admin login.

Features:
- dashboard with summaries
- member management
- announcement management
- event management
- media upload and management
- department management
- offering record management
- report viewing

## 6.4 Super Admin Module
Features:
- admin account management
- role assignment
- permission setup
- global settings
- full reports
- audit visibility

---

## 7. Recommended Pages and Screens

## 7.1 Public Pages
1. Home Page
2. About Page
3. Leadership Page
4. Departments Page
5. Events Page
6. Sermons Page
7. Media Gallery Page
8. Contact Page
9. Register Page
10. Login Page

## 7.2 Member Screens
1. Member Dashboard
2. My Profile
3. My Contributions
4. Department Announcements
5. General Announcements
6. Events List
7. Sermons / Media Page

## 7.3 Admin Screens
1. Admin Dashboard
2. Members Management
3. Add / Edit Member
4. Announcements Management
5. Events Management
6. Media Management
7. Departments Management
8. Offerings Records Management
9. Reports Page

## 7.4 Super Admin Screens
1. Super Admin Dashboard
2. Admin Users Management
3. Roles and Permissions
4. Global Settings
5. Full Reports

---

## 8. User Flows

## 8.1 Visitor Registration Flow
1. Visitor opens website
2. Visitor clicks Register
3. Visitor fills registration form
4. System creates account in Supabase Auth
5. System stores profile in database
6. Account gets role = member
7. Visitor becomes member
8. Member can log in

## 8.2 Member Login Flow
1. Member opens login page
2. Enters email and password
3. Supabase Auth verifies account
4. System checks profile role
5. If role = member, redirect to member dashboard

## 8.3 Admin Login Flow
1. Admin opens login page
2. Enters credentials
3. Supabase Auth verifies account
4. System checks profile role
5. If role = admin, redirect to admin dashboard

## 8.4 Super Admin Login Flow
1. Super admin logs in
2. Auth verifies credentials
3. System checks role = super_admin
4. Redirect to super admin dashboard

## 8.5 Announcement Flow
1. Admin creates announcement
2. Selects target audience:
   - all members
   - specific department
3. Saves announcement
4. Members see it on their dashboard based on audience rules

## 8.6 Event Flow
1. Admin creates event
2. Adds title, date, time, description, category, image
3. Saves event
4. Event appears on public website and/or member dashboard

## 8.7 Media Upload Flow
1. Media team or admin opens media page
2. Uploads image or video details
3. File goes to Supabase Storage
4. Metadata is saved in database
5. Media appears in media list / gallery

## 8.8 Offering Record Flow
1. Admin records member contribution
2. Selects member
3. Enters amount, type, date, notes
4. Saves record
5. Member sees own contribution history on dashboard

---

## 9. Role-Based Access Rules

### Member access
Allowed:
- member dashboard
- own profile
- own contributions
- announcements
- events
- sermons
- media

Blocked:
- admin pages
- member management
- event creation
- announcement creation
- report management

### Admin access
Allowed:
- admin dashboard
- members management
- announcements management
- events management
- media management
- offering records
- reports

Blocked unless granted:
- super admin management
- system-wide permissions management

### Super Admin access
Allowed:
- everything

---

## 10. Frontend Structure Recommendation

Use simple file organization.

```text
/church-system
  /public
    index.html
    about.html
    events.html
    sermons.html
    media.html
    contact.html
    login.html
    register.html
  /member
    dashboard.html
    profile.html
    contributions.html
    announcements.html
    events.html
  /admin
    dashboard.html
    members.html
    announcements.html
    events.html
    media.html
    offerings.html
    reports.html
  /super-admin
    dashboard.html
    admins.html
    roles.html
    settings.html
  /assets
    /css
      style.css
      admin.css
      member.css
    /js
      supabase-client.js
      auth.js
      common.js
      member.js
      admin.js
      super-admin.js
    /images
```

---

## 11. Supabase Architecture

Supabase will handle:
- authentication
- PostgreSQL database
- file storage
- role-based data access through policies

### Main Supabase services to use
1. **Auth**
   - signup
   - login
   - logout
   - session management

2. **Database**
   - store structured data

3. **Storage**
   - store uploaded images and videos or thumbnails

4. **Row Level Security (RLS)**
   - protect data based on logged-in user role

---

## 12. Database Design

Below is a recommended simple database structure.

## 12.1 profiles
Stores user profile details linked to Supabase Auth users.

Fields:
- id (uuid, primary key, same as auth user id)
- full_name
- email
- phone
- role (member, admin, super_admin)
- department_id (nullable)
- status (active, pending, blocked)
- created_at
- updated_at

Purpose:
- one main table for all users
- role is controlled here

## 12.2 departments
Stores church departments / groups.

Fields:
- id
- name
- description
- created_at

Examples:
- Youth
- Women
- Men
- Choir
- Children
- General

## 12.3 announcements
Stores church announcements.

Fields:
- id
- title
- message
- target_type (general, department)
- department_id (nullable)
- created_by
- created_at
- expires_at (nullable)
- is_active

Purpose:
- general announcements for all
- department announcements for selected groups

## 12.4 events
Stores church events.

Fields:
- id
- title
- description
- event_date
- event_time
- location
- department_id (nullable)
- audience_type (public, members, department)
- banner_url (nullable)
- created_by
- created_at
- is_active

Purpose:
- manage event listings

## 12.5 media_items
Stores uploaded media records.

Fields:
- id
- title
- description
- media_type (image, video)
- file_url
- thumbnail_url (nullable)
- category
- event_id (nullable)
- uploaded_by
- created_at
- is_public

Purpose:
- media center for church content

## 12.6 contributions
Stores offerings / giving records.

Fields:
- id
- member_id
- amount
- contribution_type (sadaka, jengo, shukrani, special)
- contribution_date
- method (cash, mobile, bank, other)
- reference_no (nullable)
- notes (nullable)
- recorded_by
- created_at

Purpose:
- admin records contributions
- member views only own records

## 12.7 sermons
Stores sermon records.

Fields:
- id
- title
- preacher_name
- sermon_date
- description
- video_url (nullable)
- audio_url (nullable)
- notes_url (nullable)
- thumbnail_url (nullable)
- created_by
- created_at
- is_public

## 12.8 admin_permissions (optional if needed)
Stores advanced permissions.

Fields:
- id
- user_id
- can_manage_members
- can_manage_announcements
- can_manage_events
- can_manage_media
- can_manage_offerings
- can_view_reports
- can_manage_admins

Purpose:
- for fine control when role alone is not enough

## 12.9 system_settings
Stores system-level configuration.

Fields:
- id
- church_name
- church_logo_url
- contact_phone
- contact_email
- address
- primary_color
- secondary_color
- created_at
- updated_at

---

## 13. Supabase Storage Design

Recommended buckets:

### 13.1 media
Stores:
- images
- event banners
- gallery uploads
- video thumbnails

### 13.2 sermons
Stores:
- audio files
- sermon documents
- thumbnails

### 13.3 profiles
Stores:
- profile pictures if needed

---

## 14. Row Level Security Concept

RLS should be enabled.

Basic access rules:

### profiles
- user can read own profile
- admin can read member profiles
- super admin can read all

### contributions
- member can read only own contribution records
- admin can create and view contribution records
- super admin can do all

### announcements
- members can read announcements that match them
- admins can create and update
- super admins can do all

### events
- public can read public events
- members can read allowed events
- admins can manage events

### media_items
- public can read public media
- admins can upload and manage

This should be implemented carefully in Supabase policies.

---

## 15. Detailed Screen Requirements

## 15.1 Register Page
Purpose:
Allow a new member to create an account.

Fields:
- full name
- email
- phone
- password
- confirm password
- department

Actions:
- create account
- go to login page

Notes:
- use clear validation
- password should be hidden
- after successful registration, save role as member

## 15.2 Login Page
Purpose:
Allow users to log in.

Fields:
- email
- password

Actions:
- login
- forgot password (optional)
- go to register page

Routing after login:
- member -> member dashboard
- admin -> admin dashboard
- super_admin -> super admin dashboard

## 15.3 Member Dashboard
Purpose:
Give the member one clean place to see personal and church information.

Sections:
- welcome card
- own contribution summary
- recent contributions
- department announcements
- general announcements
- upcoming events
- quick links to sermons and media

Important UX rule:
Personal details and public announcements must be visually separated.

## 15.4 Member Contributions Page
Purpose:
Show only the logged-in member's records.

Display:
- total contributions
- recent contribution list
- contribution types
- dates

## 15.5 Admin Dashboard
Purpose:
Give summary of important data.

Cards:
- total members
- total announcements
- upcoming events count
- total contributions this month

Sections:
- recent members
- recent contributions
- latest announcements
- upcoming events
- simple charts

## 15.6 Members Management Page
Purpose:
Allow admin to manage members.

Features:
- list members
- search members
- filter by department
- view profile
- edit member details
- activate / deactivate status

## 15.7 Announcements Management Page
Purpose:
Allow admin to create and manage announcements.

Fields:
- title
- message
- target type
- department if needed
- active status
- expiration date

Features:
- add
- edit
- delete
- publish / unpublish

## 15.8 Events Management Page
Purpose:
Allow admin to upload and manage events.

Fields:
- title
- description
- date
- time
- location
- audience
- department
- banner image

Features:
- add event
- edit event
- delete event
- show upcoming / past events

## 15.9 Media Management Page
Purpose:
Allow media team or admin to upload and manage content.

Fields:
- title
- description
- media type
- category
- event
- file upload
- public visibility

Features:
- upload
- preview
- edit
- delete
- filter by category

## 15.10 Offerings Management Page
Purpose:
Allow admin to record member giving.

Fields:
- member
- amount
- contribution type
- date
- method
- reference number
- notes

Features:
- add record
- edit record
- search record
- filter by date / member / type

## 15.11 Reports Page
Purpose:
Give leaders useful summaries.

Possible reports:
- members by department
- monthly contributions
- contributions by type
- events created in a period
- media uploads count

Visuals:
- cards
- tables
- simple charts

## 15.12 Super Admin — Admins Management
Purpose:
Allow highest user to manage admin accounts.

Features:
- create admin
- update admin role
- deactivate admin
- grant permissions

---

## 16. UI/UX Guidelines

### 16.1 General UI Style
- clean web interface
- simple language
- large readable text
- card-based layout
- calm and professional feel
- easy navigation

### 16.2 Color Direction
Suggested colors:
- dark blue for trust
- gold for accent
- white or light gray background
- green for success
- red for warnings

### 16.3 Navigation
Public side:
- top navigation bar

Member side:
- top nav or side menu depending on layout

Admin side:
- sidebar navigation is recommended

### 16.4 Buttons
Use clear button labels like:
- Save
- Upload
- Create
- Update
- Delete
- View

### 16.5 Forms
- keep forms clean
- use labels above fields
- show validation messages clearly
- do not overload one form with too many fields if avoidable

### 16.6 Data Presentation
- members and reports can use table + cards combination
- events and media should prefer cards
- announcements can use list cards

---

## 17. Suggested Frontend Logic

### 17.1 Authentication Logic
- use Supabase Auth for signup and login
- after login, fetch profile from `profiles`
- check role
- redirect user to correct dashboard

### 17.2 Session Handling
- if no active session, redirect to login
- protect member and admin pages in JavaScript
- on logout, clear session and redirect to home or login

### 17.3 Data Loading
- load only relevant data for each user
- member sees own data only
- admin sees management data
- use async JavaScript functions with simple error handling

### 17.4 Reusable Components
It is good to reuse:
- header
- sidebar
- footer
- cards
- modal forms
- table styles

---

## 18. Security Requirements

The system should follow these rules:
- use Supabase Auth instead of homemade password storage
- never trust frontend alone for permissions
- use RLS in Supabase
- validate forms before submission
- restrict admin actions by role and policy
- keep secret keys out of frontend
- use only public anon key in frontend
- put service role key only in secure backend if ever needed later

---

## 19. Non-Functional Requirements

### Performance
- pages should load fast
- images should be optimized
- avoid unnecessary reloads

### Usability
- UI should be easy for normal church users
- labels must be simple and clear

### Maintainability
- code should be separated logically
- names should be consistent
- tables and fields should use clear naming

### Scalability
- design should allow future modules
- system should support more departments and more admins later

---

## 20. Suggested Naming Standards

Use simple, consistent names.

Examples:
- roles: `member`, `admin`, `super_admin`
- media types: `image`, `video`
- target types: `general`, `department`
- statuses: `active`, `inactive`, `pending`

---

## 21. Example Supabase Setup Plan

1. Create Supabase project
2. Enable email auth
3. Create tables:
   - profiles
   - departments
   - announcements
   - events
   - media_items
   - contributions
   - sermons
   - system_settings
4. Create storage buckets
5. Enable RLS on all sensitive tables
6. Add policies for member, admin, and super admin access
7. Connect frontend using Supabase JS client

---

## 22. MVP Build Order

Recommended order for coding:

### Phase 1
- project setup
- Supabase connection
- auth pages
- profile storage
- role routing

### Phase 2
- member dashboard
- announcements display
- events display
- contributions display

### Phase 3
- admin dashboard
- member management
- announcements management
- events management

### Phase 4
- media uploads
- reports
- super admin controls

### Phase 5
- polish UI
- validations
- security review
- deployment

---

## 23. What Another AI or Developer Should Understand Immediately

If another AI reads this document, it should understand that:
- this is a **web-based church management system**
- it uses **Supabase** for backend
- frontend is **HTML, CSS, JavaScript**
- there are **three main roles**: member, admin, super_admin
- the system must clearly separate member and admin experiences
- members mainly consume information and view their own records
- admins manage announcements, events, media, members, and contributions
- super admins manage admins and global settings
- the coding should stay simple, organized, and role-based

---

## 24. Final Build Direction

This project should be built with these principles:
- simple code structure
- clean role separation
- secure data access
- easy UI language
- church-friendly design
- scalable module structure

The final result should feel like:
- a real church communication platform
- a member portal
- an admin management dashboard
- a modern but simple web system

---

## 25. Short Technical Summary

**Frontend:** HTML, CSS, JavaScript  
**Backend:** Supabase  
**Auth:** Supabase Auth  
**Database:** Supabase Postgres  
**Storage:** Supabase Storage  
**Roles:** Member, Admin, Super Admin  
**Main Modules:** Auth, Members, Announcements, Events, Media, Contributions, Reports, Settings

---

## 26. Suggested Next Document After This One

After this system design document, the next best documents to prepare are:
1. database schema SQL document
2. Supabase table and policy plan
3. frontend folder structure guide
4. page-by-page UI build checklist
5. API/data flow notes if needed

---

## 27. End Note

This document is meant to be the main reference before coding starts. It should guide design, database setup, role logic, and page development.

The coding phase should now follow this document closely.

