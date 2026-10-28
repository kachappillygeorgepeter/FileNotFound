# whereInVIT Frontend & UI Design System Specification

## 1. Executive Summary & Design Philosophy
`whereInVIT` is a campus-centric Lost and Found web application designed specifically for the students, faculty, and administration of Vellore Institute of Technology (VIT). 

The visual identity is anchored around an **editorial, modernist, and minimalist aesthetic**:
- **Monochromatic & Restrained**: Pure stark whites (`#ffffff`), warm bone off-white surfaces (`#F7F7F5`), crisp hairline borders (`#E5E5E5`), and deep rich black accents (`#111111`, `#0D0D0D`).
- **Typographic Precision & Hierarchy**: Bold uppercase display headings, tracked uppercase micro-labels (`tracking-[0.2em]` to `tracking-[0.4em]`), tight leadings, and generous negative space.
- **Form Follows Function**: High utility with zero unnecessary skeuomorphic ornamentations, sharp rectilinear geometries, and subtle, tactile transitions.

---

## 2. Core Color Palette & Design Tokens

### 2.1 Primary & Background Colors
| Token / Hex | Role | Usage |
| :--- | :--- | :--- |
| `#ffffff` | Background / Pure White | Main page background, card surfaces, form containers, elevated panels |
| `#F7F7F5` | Off-White / Bone Warm Neutral | Page background for forms/messages, carousel background, input default background, hover states |
| `#111111` | Primary Black / Stark Contrast | Dominant headings, primary action buttons, active selector states, dark pills |
| `#0D0D0D` | Deep Night Black | High-impact Call to Action (CTA) footer section |
| `#555555` | Neutral Secondary Gray | Subheadings, descriptions, secondary metadata, inactive button labels |
| `#999999` | Muted Gray | Input placeholders, pagination counters, filter dividers |
| `#E5E5E5` | Hairline Border Gray | 1px borders across containers, navbars, cards, inputs, and section dividers |

### 2.2 Semantic & State Accents
- **Selection Color**: `selection:bg-[#111111] selection:text-white`
- **Lost Status Badge**: `bg-red-100 text-red-800` (in item cards), or high-contrast monochromatic tags
- **Found Status Badge**: `bg-green-100 text-green-800` (in item cards)
- **Error / Alerts**: `bg-[#111111] text-white` banner with white badge `[ERROR]`, or subtle `bg-red-50 text-red-600 border border-red-200` for authentication failures
- **Unread Notification Pill**: `bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`

---

## 3. Typography & Text Hierarchy

The frontend relies on Next.js font variables **Geist Sans** (`--font-geist-sans`) and **Geist Mono** (`--font-geist-mono`), falling back to clean grotesque system fonts (`Arial, Helvetica, sans-serif`).

### 3.1 Typographic Scale & Styles
1. **Brand Eyebrow & Micro-labels**:
   - `text-xs font-bold tracking-[0.4em] uppercase text-[#111111]`
   - Form field labels: `text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase`
   - Navbar Links: `text-xs font-medium tracking-widest uppercase`
2. **Hero Display Headings**:
   - `text-6xl md:text-7xl lg:text-9xl font-extrabold tracking-tighter leading-[0.85] uppercase text-[#111111]`
   - Section Headings: `text-4xl md:text-6xl font-extrabold tracking-tight uppercase text-[#111111]`
3. **Card Titles & Subtitles**:
   - Card Titles: `text-lg md:text-xl font-bold text-[#111111] line-clamp-1`
   - Metadata / Venues: `text-xs text-[#555555] tracking-[0.15em] uppercase`
4. **Body Copy**:
   - `text-sm text-[#555555] leading-relaxed`
   - Secondary Lead: `text-base md:text-lg text-[#555555] font-medium leading-relaxed`

---

## 4. Layout Architecture & Global Components

### 4.1 Shell & Sticky Top Navigation (`Navbar.tsx`)
- **Container**: `sticky top-0 z-50 bg-white border-b border-[#E5E5E5]`
- **Dimensions**: Fixed heights (`h-[72px] md:h-[88px]`) with responsive horizontal padding (`px-6 md:px-12`).
- **Brand Logo**: Left-aligned `"whereInVIT"` in uppercase bold tracking-tight (`text-xl font-bold tracking-tight text-[#111111]`).
- **Desktop Navigation Links**: Plain text links uppercase with wide tracking (`text-xs tracking-widest`).
  - Active State: `text-[#111111] font-semibold`.
  - Inactive State: `text-[#555555] hover:text-[#111111] transition-colors`.
  - *Design Rule*: Top navigation items must strictly remain plain text without backgrounds, pills, or sliding boxes.
- **Authenticated Actions**:
  - `NOTIFICATIONS` badge with real-time unread count indicator.
  - `MESSAGES` link for active handoff communications.
  - `REPORT LOST` and `REPORT FOUND` explicit entry points.
  - User identity badge: 2-line stacked profile (`profile.name` in bold and `profile.email` in gray), separated by a vertical border (`border-l border-[#E5E5E5] pl-8`).
  - `LOGOUT` button.
- **Unauthenticated**: Minimalist `LOGIN` trigger leading to the Google OAuth SSO gateway.
- **Mobile Menu**: Responsive hamburger toggle with animated slide-down sheet framed by `#E5E5E5` borders and shadow.

### 4.2 Type Selector Component (`TypeSelector.tsx`)
The primary sliding segmented toggle used when creating or toggling items between **LOST** and **FOUND**:
- Outer Frame: `relative flex w-full border border-[#E5E5E5] bg-[#F7F7F5] p-1`
- Sliding Active Indicator: A full-height black box (`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-[#111111] transition-transform duration-500 ease-in-out`) that glides horizontally between position 0 and 100%.
- Segment Buttons: Full uppercase tracked labels (`text-xs font-bold tracking-[0.2em]`) that flip between `text-white` when active and `text-[#555555]` when idle.

### 4.3 3D Editorial Carousel (`HeroCarousel.tsx`)
Featured prominently on the homepage, presenting recently reported items:
- **Perspective Track**: Multi-item 3D depth system with smooth autoplay cycling every 2400ms (`all 550ms cubic-bezier(0.22, 1, 0.36, 1)`).
- **Center Slide**:
  - Active width: 600px × 400px (desktop) with 24px border radius (`rounded-[24px]`).
  - Heavy elevation shadow: `box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8)`.
  - Foreground text overlay: High-contrast bottom gradient (`from-black/80 via-black/20 to-transparent`) showing two-tone stacked typography (`LOST ITEM` / `FOUND ITEM` tag + bold split title).
- **Flanking Slides**:
  - Scaled down: 170px × 290px with reduced brightness and saturation (`brightness(0.7) saturate(0.8)`).
- **Graceful Fallbacks**: Categorized default images (e.g. keys, calculators, headphones, water bottles, student ID cards) with seamless `onError` recovery.

### 4.4 Item Feed & Search Engine (`ItemsFeed.tsx`)
A dedicated search and discovery workspace for `/lost` and `/found`:
- **Large Search Hero**: Off-white backdrop (`bg-[#F7F7F5]`) housing an oversized search field (`py-6 pl-16 text-xl`) with magnifying search glyph.
- **Editorial Filter Tabs**: Monochromatic underline tabs for `ALL`, `CATEGORY`, and `VENUE` with 2px bottom borders (`h-[2px] bg-[#111111]`).
- **Quick-Filter Select Boxes**: Clean square-edge inputs with border transitions.
- **Result Grid**: 4-column responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`) presenting item cards.
- **Pagination**: Monochromatic `Previous` / `Next` button bar showing active page ratio (`Page X of Y`).

### 4.5 Standard Item Card (`ItemCard.tsx` / `Home.ItemCard`)
- Clean rectangular frame with `border border-[#E5E5E5] bg-white`.
- Aspect ratio: `aspect-[4/3]` image view with subtle hover zoom (`group-hover:scale-105 transition-transform duration-700`).
- Floating Category Tag: Top-left glassmorphic chip (`bg-white/95 backdrop-blur px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#111111]`).
- Metadata row: Venue name, truncated title, multi-line excerpt, and an arrow hover affordance (`View Details →`).

---

## 5. Screen & Page Structure

### 5.1 Homepage (`/`)
1. **Hero Header**: Extreme typography (`LOST IT? / FIND IT.`), platform description, and dual primary CTAs (`REPORT LOST ITEM` vs `REPORT FOUND ITEM`).
2. **Carousel Section**: Section divider with editorial introduction into `HeroCarousel`.
3. **Recent Lost Items Showcase**: 4-card teaser grid with direct link to `/lost`.
4. **Recent Found Items Showcase**: 4-card teaser grid with direct link to `/found`.
5. **How whereInVIT Works**: 4-step architectural process matrix (`01 REPORT`, `02 VERIFY`, `03 CONNECT`, `04 RETURN`) on subtle grid borders.
6. **Campus Coverage**: Monochromatic index of campus clusters (Academic Blocks, Hostels, Central Library, Dining, Sports).
7. **High-Impact CTA**: Deep night container (`#0D0D0D`) with split action columns for reporters and finders.
8. **Minimal Footer**: Copyright, metadata, and VIT campus designation.

### 5.2 Item Creation & Editing (`/items/new`, `/items/[id]/edit`)
- Centered editorial form box (`max-w-3xl bg-white border border-[#E5E5E5] p-10 md:p-14`).
- Interactive TypeSelector on creation mode.
- Rectangular input elements without border-radii (`rounded-none`).
- Image Uploader: Drag-and-drop / dashed perimeter uploader with live preview, removal button, and strict file constraints (JPEG/PNG/WEBP < 5MB).
- Dynamic data integration for categories and venues.

### 5.3 Item Details View (`/items/[id]`)
- **Split Hero Display**: Left image gallery with high-resolution inspection; right metadata block with category, venue, timestamp, reporter info, and status pills.
- **Claim & Verification Gateway**:
  - Found items require answering verification challenge questions.
  - Multi-state claim tracking (Pending, Approved, Rejected).
- **Handoff Coordination**: Shows meeting details, security PIN confirmation, and handoff progress once a claim is approved.
- **Owner Controls**: Authorized action bar for reporters (Edit Details, Delete Listing, Resolve Item).

### 5.4 Communication & Notifications (`/messages`, `/notifications`)
- **Messages**: Direct conversation threads between verified claimants and item finders with message feed and timestamp history.
- **Notifications**: Chronological stream of updates (claim updates, approval statuses, handoff bookings) with single-click mark-as-read and mark-all-as-read actions.

### 5.5 Authentication Gateway (`/login`)
- Clean centered modal card on `#F7F7F5` backdrop.
- Restrictive policy label emphasizing `@vitstudent.ac.in` domain access.
- Integrated Google OAuth popup button rendered via `@react-oauth/google` with outline rectangular styling.

### 5.6 Admin Suite (`/admin`)
- Split sidebar-content workspace (`layout.tsx`).
- Side navigation with links to Overview, Items, Reports, Claims, and Users.
- Strict role-based protection ensuring only accounts with role `ADMIN` enter.

---

## 6. Interaction & Motion Guidelines

- **Duration Tokens**:
  - Fast feedback (hover/focus): `200ms - 300ms ease-out`
  - Segmented sliding transitions: `500ms ease-in-out`
  - Hero Carousel slide translations: `550ms cubic-bezier(0.22, 1, 0.36, 1)`
- **Hover Micro-interactions**:
  - Primary buttons darken from `#111111` to `#333333`.
  - Secondary buttons transition borders from `#E5E5E5` to `#111111`.
  - Images inside cards smoothly scale up by 5% (`scale-105`) over 700ms.
- **Accessibility & Reduced Motion**:
  - Explicit checks for `prefers-reduced-motion: reduce` in `HeroCarousel`, disabling automatic slide translation and switching to static layout updates.
