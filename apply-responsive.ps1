$ErrorActionPreference = "Stop"

# This script applies mobile responsive sidebar changes to all admin and super-admin HTML files.
# Pattern: add overlay, mobile header, sidebar-responsive class, main-responsive class, bottom nav, responsive-sidebar.js

function Apply-ResponsiveChanges {
    param(
        [string]$FilePath,
        [string]$PortalName,
        [string]$ActivePage,
        [string]$BottomNavHtml
    )
    
    if (!(Test-Path $FilePath)) {
        Write-Host "SKIP: $FilePath not found"
        return
    }
    
    $content = Get-Content $FilePath -Raw -Encoding UTF8
    $fileName = [System.IO.Path]::GetFileName($FilePath)
    
    # Skip if already modified
    if ($content -match 'sidebar-responsive') {
        Write-Host "SKIP: $fileName already modified"
        return
    }
    
    # 1. Add responsive CSS link after shared.css
    $content = $content -replace '(href="\.\.\/assets\/css\/shared\.css"[^>]*>)', '$1
  <link rel="stylesheet" href="../assets/css/responsive-sidebar.css"/>'

    # 2. Add overlay + mobile header after <body...>
    $mobileHeader = @"

<!-- Mobile Sidebar Overlay -->
<div id="sidebar-overlay" class="sidebar-overlay"></div>

<!-- Mobile Header Bar -->
<div class="mobile-header">
  <button data-sidebar-toggle class="hamburger-btn">
    <span class="material-symbols-outlined">menu</span>
  </button>
  <div>
    <h1>BLB Church</h1>
    <p>$PortalName</p>
  </div>
  <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center overflow-hidden border-2 border-secondary-container">
    <span class="text-white text-sm font-bold">?</span>
  </div>
</div>

"@
    # Insert after <body...> tag (match <body followed by any attributes then >)
    $content = $content -replace '(<body[^>]*>)\s*\n', "`$1`n$mobileHeader"

    # 3. Replace sidebar <aside> with responsive version
    # Match various sidebar patterns
    $sidebarPatterns = @(
        'class="h-screen w-72 fixed left-0 top-0 bg-slate-50 flex flex-col py-8 border-r border-slate-200/50 z-40 overflow-y-auto"',
        'class="fixed inset-y-0 left-0 w-72 bg-slate-50 border-r border-slate-200 px-4 py-8 overflow-y-auto"',
        'class="h-screen w-72 fixed left-0 top-0 bg-slate-50 flex flex-col py-8 border-r border-slate-200/50 z-40 overflow-y-auto custom-scrollbar"'
    )
    
    $closeBtn = @"
<button class="sidebar-close-btn">
    <span class="material-symbols-outlined" style="font-size:1.2rem;">close</span>
  </button>
"@
    
    foreach ($pattern in $sidebarPatterns) {
        if ($content.Contains($pattern)) {
            $content = $content.Replace(
                "<aside $pattern>",
                "<aside id=`"sidebar`" class=`"sidebar-responsive bg-slate-50 flex flex-col py-8 border-r border-slate-200/50`">`n  $closeBtn"
            )
            break
        }
    }
    
    # Also handle variant without bg-slate-50
    if ($content -match '<aside class="fixed inset-y-0 left-0 w-72 bg-slate-50 border-r border-slate-200 px-4 py-8 overflow-y-auto">') {
        $content = $content.Replace(
            '<aside class="fixed inset-y-0 left-0 w-72 bg-slate-50 border-r border-slate-200 px-4 py-8 overflow-y-auto">',
            "<aside id=`"sidebar`" class=`"sidebar-responsive bg-slate-50 flex flex-col py-8 border-r border-slate-200/50 px-4`">`n  $closeBtn"
        )
    }
    
    # 4. Replace main margin
    $content = $content -replace 'class="ml-72 min-h-screen p-12"', 'class="main-responsive p-4 md:p-12"'
    $content = $content -replace 'class="ml-72 min-h-screen p-10"', 'class="main-responsive p-4 md:p-10"'
    $content = $content -replace 'class="ml-72 p-12 bg-background min-h-screen"', 'class="main-responsive p-4 md:p-12 bg-background"'
    $content = $content -replace 'class="ml-72 min-h-screen"', 'class="main-responsive"'
    
    # Also handle sticky headers with ml-72
    $content = $content -replace 'class="sticky top-0 z-30 ml-72', 'class="sticky top-0 z-30 md:ml-72 hidden md:flex'
    
    # 5. Add bottom nav + responsive-sidebar.js before </body>
    $bottomNav = @"

$BottomNavHtml

<script src="../assets/js/responsive-sidebar.js"></script>
</body>
"@
    $content = $content -replace '</body>', $bottomNav
    
    # Write back
    [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.Encoding]::UTF8)
    Write-Host "DONE: $fileName"
}

# ─── Admin Bottom Nav Template ───
function Get-AdminBottomNav {
    param([string]$ActivePage)
    
    $items = @(
        @{href="./dashboard.html"; icon="dashboard"; label="Home"; page="dashboard.html"},
        @{href="./members.html"; icon="group"; label="Members"; page="members.html"},
        @{href="./contributions.html"; icon="payments"; label="Giving"; page="contributions.html"},
        @{href="./events.html"; icon="event"; label="Events"; page="events.html"}
    )
    
    $navItems = ""
    foreach ($item in $items) {
        $active = if ($item.page -eq $ActivePage) { " bottom-nav-active" } else { "" }
        $navItems += @"
  <a href="$($item.href)" class="bottom-nav-item$active">
    <span class="material-symbols-outlined">$($item.icon)</span>
    <span>$($item.label)</span>
  </a>
"@
    }
    
    return @"
<!-- Mobile Bottom Navigation -->
<nav class="mobile-bottom-nav">
$navItems  <button data-sidebar-toggle class="bottom-nav-item">
    <span class="material-symbols-outlined">menu</span>
    <span>More</span>
  </button>
</nav>
"@
}

# ─── Super Admin Bottom Nav Template ───
function Get-SuperAdminBottomNav {
    param([string]$ActivePage)
    
    $items = @(
        @{href="./dashboard.html"; icon="dashboard"; label="Home"; page="dashboard.html"},
        @{href="./admins.html"; icon="shield_person"; label="Admins"; page="admins.html"},
        @{href="./members.html"; icon="group"; label="Members"; page="members.html"},
        @{href="./contributions.html"; icon="payments"; label="Giving"; page="contributions.html"}
    )
    
    $navItems = ""
    foreach ($item in $items) {
        $active = if ($item.page -eq $ActivePage) { " bottom-nav-active" } else { "" }
        $navItems += @"
  <a href="$($item.href)" class="bottom-nav-item$active">
    <span class="material-symbols-outlined">$($item.icon)</span>
    <span>$($item.label)</span>
  </a>
"@
    }
    
    return @"
<!-- Mobile Bottom Navigation -->
<nav class="mobile-bottom-nav">
$navItems  <button data-sidebar-toggle class="bottom-nav-item">
    <span class="material-symbols-outlined">menu</span>
    <span>More</span>
  </button>
</nav>
"@
}

$basePath = "c:\FlutterProjects\blb_church"

# ─── Process Admin Files ───
$adminFiles = @(
    "contributions.html",
    "events.html",
    "announcements.html",
    "media.html",
    "reports.html",
    "departments.html",
    "member-profile.html"
)

Write-Host "`n=== Processing Admin Files ===" -ForegroundColor Cyan
foreach ($file in $adminFiles) {
    $path = Join-Path $basePath "admin\$file"
    $bottomNav = Get-AdminBottomNav -ActivePage $file
    Apply-ResponsiveChanges -FilePath $path -PortalName "Admin Portal" -ActivePage $file -BottomNavHtml $bottomNav
}

# ─── Process Super-Admin Files ───
$superAdminFiles = @(
    "dashboard.html",
    "admins.html",
    "roles.html",
    "settings.html",
    "departments.html",
    "members.html",
    "contributions.html",
    "events.html",
    "announcements.html",
    "media.html",
    "reports.html"
)

Write-Host "`n=== Processing Super-Admin Files ===" -ForegroundColor Cyan
foreach ($file in $superAdminFiles) {
    $path = Join-Path $basePath "super-admin\$file"
    $bottomNav = Get-SuperAdminBottomNav -ActivePage $file
    Apply-ResponsiveChanges -FilePath $path -PortalName "Super Admin" -ActivePage $file -BottomNavHtml $bottomNav
}

Write-Host "`n=== All files processed! ===" -ForegroundColor Green
