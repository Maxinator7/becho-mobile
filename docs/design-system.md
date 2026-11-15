# Becho design system (from the Stitch designs, Nov 2026)

Source: Stitch project "Becho Classifieds Marketplace Platform" — 15 mobile screens (390px, light + dark) and 5 admin desktop screens (1280px).
Reference renders (HTML + PNG) live outside the repo; see the screen map below.

## Principles
- Clean, trustworthy, photo-first. Slate neutrals + one indigo accent; green only for "verified/success".
- **Only show real data.** Design elements for features Becho doesn't have yet (Aadhaar/DigiLocker KYC, escrow/GMV, ratings & reviews, distance in km, maps, IMEI/battery/AppleCare reports, view counts, TOTP/FIDO/SAML login, compliance claims like ISO 27001/SOC2/CERT-In) are **omitted**, never faked.
- Verification we *do* have: email verified, mobile number on file (SMS verification coming), staff-verified listing badge, phone-verified account status.

## Colour tokens — marketplace & mobile
| Token | Light | Dark | Use |
|---|---|---|---|
| bg | `#F8FAFC` (slate-50) | `#0B0F19` | page background |
| surface | `#FFFFFF` | `#161F30` | cards, sheets, nav |
| surface-2 | `#F1F5F9` (slate-100) | `#1E293B` | chips, inputs, subtle fills |
| surface-deep | `#0F172A` (slate-900) | `#070A12` | dark promo cards, bottom CTA |
| border | `#E2E8F0` (slate-200) | `rgba(39,53,77,0.7)` | card borders, dividers |
| text | `#0F172A` | `#F1F5F9` | primary text |
| text-secondary | `#475569` (slate-600) | `#CBD5E1` | body/secondary |
| text-muted | `#64748B` (slate-500) | `#94A3B8` | meta, captions |
| primary | `#4F46E5` (indigo-600) | `#6366F1` | primary buttons, active tab, FAB |
| primary-text | `#4338CA` (indigo-700) | `#818CF8` | links, prices accent, selected chip text |
| primary-soft | `#EEF2FF` (indigo-50) | `rgba(99,102,241,0.15)` | selected chip bg, info boxes |
| success | `#047857` (text) / `#059669` (fill) | `#34D399` | verified, live, deal agreed |
| success-soft | `#ECFDF5` + border `#A7F3D0` | `rgba(2,44,34,0.9)` + border `rgba(16,185,129,0.4)` | verified banners, deal panel |
| warning | `#B45309` / soft `#FFFBEB` | `#FBBF24` / `rgba(120,53,15,0.35)` | under review, attention |
| danger | `#E11D48` (rose-600) / soft `#FFF1F2` | `#FB7185` / `rgba(136,19,55,0.35)` | action required, errors, badge dot |

Prices are **bold, text colour** (not gradient), with an optional struck-through original price in muted.

## Typography
- Headings & brand: **Plus Jakarta Sans** 700/800. Body & UI: **Inter** 400/500/600.
- Scale: page title 22–24/700, section title 16–18/700, card title 15–16/600, body 14–15/400, meta 12/500, overline 10–11/600 UPPERCASE letter-spacing 0.06em.

## Shape, spacing, elevation
- Radius: cards 12px, inputs/buttons 8–10px, chips & pills 9999px, images inside cards 8–12px.
- Spacing on 4px grid; screen padding 16px (mobile), card padding 12–16px, section gap 20–24px.
- Shadow: `0 1px 2px rgba(0,0,0,0.05)` on cards; FAB/raised `0 4px 6px -1px rgba(0,0,0,0.1)`. Borders do most of the separation.

## Components
- **Top bar (mobile)**: logo "Becho" (indigo wordmark) · city pill (📍 Bengaluru, KA ⌄) · bell with red dot · avatar.
- **Bottom tab bar (mobile)**: Home · Explore · **Sell** (raised indigo circular FAB with +) · Chats (badge) · Account. Active = indigo icon + label.
- **Search bar**: rounded-full, slate-100 fill, search icon left, filter icon button right.
- **City chips row**: horizontal scroll pills; selected = dark (slate-900 bg / white text) with a location icon.
- **Trust banner**: success-soft card with shield icon, "Verified people only" title, short line, "Know more ›".
- **Category grid**: 4 columns, square tiles (surface, border, 12px radius) with outlined icon + label.
- **Promo card**: surface-deep (dark) card with overline, title, subtitle and a small primary button.
- **Listing card (grid, 2 columns)**: photo (4:3, 12px radius) with top-left condition chip ("Like New") and top-right "✓ VERIFIED" green chip, heart button bottom-right; below: price bold (+ optional "Negotiable" soft chip), title 1–2 lines, meta line (city) muted.
- **Status chips** (uppercase 10–11/600, pill, soft fill): UNDER REVIEW (warning), ACTION REQUIRED / CHANGES REQUESTED (danger), LIVE & VERIFIED / LIVE (success), SOLD (slate), RESERVED (indigo).
- **Staff remark box** (My listings): warning/danger soft box with icon "Staff remark: …" + "Edit & resubmit →" danger/primary button.
- **Listing details**: full-bleed gallery with "PHOTO 1 OF 6" pill and dots, video pill; staff-verified banner (success-soft); category/brand chips; title 22/700; city · posted time; price block (price, struck original, "Fixed price / Negotiable"); spec cards grid (2 columns: label + value); "Included in the deal" checklist; seller card (avatar, name ✓, member since); sticky bottom bar: bookmark icon · "Make offer" (outlined) · "Chat with {seller}" (primary).
- **Chat**: header with avatar, name ✓, "Online"/last seen if available; listing strip (thumb, title, price, "View ad"); **deal panel** (success-soft card: "Deal agreed for ₹70,000!" + "LOCKED"/"RESERVED" pill, sub-line, buttons "Mark as sold" (dark/success) + "Cancel reservation" (outlined)); system/event rows as cards with icon, "Priya made an offer ₹68,000" + status pill (Countered/Negotiated/Accepted); own bubbles primary, other bubbles surface with border; quick-action chips above the composer ("Make an offer"); composer: + button, text field rounded-full, send button primary circle.
- **Post Ad (sell)**: header "Post Ad" with close; step indicator "STEP 1 OF 2: PHOTOS & DETAILS" + progress bar; "Photos & Video Showcase  4 / 11 items" dashed upload tile + horizontal thumbnails (COVER tag, video badge); tip box (primary-soft); Category row with breadcrumb + edit pencil; Brand/Model selects in 2 columns; Ad title with counter "54 / 70"; Item condition as 2×2 radio cards (title + subtitle); price input with ₹ prefix large; "Price negotiable" toggle (only if supported — otherwise omit); description textarea with "Recommended: 150+ chars"; sticky footer "Save draft" (outlined) + "Submit for review & publish →" (primary).
- **My account**: overline "ACCOUNT & TRUST CENTER" + title; profile card (avatar, name, role chip, user code with copy); trust checklist rows (mobile, email) with Verified/Not verified pills; stats row (Live ads · Sold · Total sold ₹ — compute from own listings); "My listings" with tabs (Live n · Under review n · Changes requested n · Sold…) and listing rows; "Account & support" list (Saved ads, Notifications, Change password, Sign out).

## Admin (desktop) — separate palette, Inter only
| Token | Value |
|---|---|
| bg | `#F8F9FF` |
| surface | `#FFFFFF`, soft panels `#EFF4FF` / `#E5EEFF` |
| sidebar | `#091426` (navy) with `#94A3B8` items, active item filled `#1E293B` / indigo text |
| text | `#0B1C30`, secondary `#45474C`, muted `#8590A6` |
| primary | `#4E45D5` (hover `#4338CA`), soft `#E5E7FF` |
| success | `#24A375` text / `#D1FAE5`–`#85F8C4` fill |
| danger | `#BA1A1A` text / `#FFDAD6` fill |
| warning | `#B45309` / `#FEF3C7` |
Dense: 14px body, 11px/600 uppercase table headers, 8px radius, 1px borders `#E2E8F0`, KPI tiles with small label, big number (24–28/700), delta line. Header: breadcrumb "Becho Admin › Console", global search pill, region pill, bell, staff name + role. Dark mode: derive from marketplace dark tokens (bg `#0B0F19`, surface `#161F30`, sidebar `#070A12`).

## Screen map (Stitch file → our screen)
Mobile/web marketplace: 05/06 (light) & 13 (dark) Home/Browse · 18 (light) & 14 (dark) Listing details · 15/16 (light) & 09 (dark) Chat · 02/04 Post ad · 07/01 (light) & 12 (dark) My account + My listings.
Admin: 08 Staff sign-in · 10 Overview dashboard · 17 Review queue · 03 Listing review detail · 19 Users (list + detail panel).
Screens without a design (Register, Verify, Forgot password, Notifications, Favorites, Account settings sub-pages, Admin listings list, Service areas) reuse the nearest construct.
