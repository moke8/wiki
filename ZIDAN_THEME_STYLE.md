# Zidan Theme Style Guide

This file is the persistent style reference for the `zidan` theme. If conversation context is lost, read this first before changing theme UI.

## Scope Rules

- Prefer changing files under `client/themes/zidan/`.
- Avoid changing shared components under `client/components/common/` unless the requested behavior is system-wide or cannot be implemented from the theme.
- If a shared component must be changed, keep behavior backward-compatible for non-zidan themes.
- Do not change `client/components/comments.vue` or `client/components/common/nav-header.vue` for visual-only zidan adjustments; style them from zidan theme wrappers instead.

## Core Visual Direction

- Overall direction: clean MUI-like SaaS documentation UI, white, minimal, left-aligned, low-shadow.
- Reference feel: `wiki.51zidan.com` content blocks and `www.51zidan.com` business footer/navigation tone.
- Avoid dark/heavy Wiki.js defaults in the zidan theme.
- Prefer flat surfaces, light borders, subtle hover backgrounds, no decorative divider clutter.

## Color Tokens

Use these colors consistently:

- Primary blue: `#3248F2`
- Link/action blue: `#0063ff`
- Main text: `#171c19` or `#111111`
- Secondary text: `#637381`
- Muted nav text: `#717572`
- Placeholder/meta text: `#919EAB`
- Border: `#ECEEF1`
- Light hover/background: `#F6F7F9`
- White surface: `#FFF`
- Dark page background: `#14141B`
- Dark panel: `#181820`
- Dark hover/panel secondary: `#202027`
- Dark border: `#2f2f3a`
- Dark active blue: `#7986FF`

## Typography

- App font stack:
  - `'Gilroy', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Markdown/content font stack:
  - `'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`
- Markdown base size: `17px`
- Markdown line height: `1.85`
- Avoid sudden font-size changes by placing critical base `.v-main .contents` styles early in `client/themes/zidan/scss/app.scss`.

## Layout

### Main Page

Primary file: `client/themes/zidan/components/page.vue`

- Root wrapper: `.zidan-app`
- Main area: `.zidan-main`
- Content container: `.zidan-content-container`
- Left content column: `.zidan-content-col`
- Right TOC/sidebar: `.zidan-right-sidebar`
- Footer wrapper: `.zidan-page-footer`

Content container padding:

```scss
.zidan-content-container {
  padding-left: 24px !important;
  padding-right: 24px !important;
  padding-top: 16px !important;

  @media (min-width: 1264px) {
    padding-left: 32px !important;
    padding-right: 32px !important;
  }

  @media (max-width: 600px) {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
}
```

- Content and page title should be left-aligned.
- Do not let content stick to the left navigation drawer.
- Right TOC appears only on large screens and should be sticky near the top.
- Footer must sit in the content area, not underneath the left drawer. Desktop offset is `260px`.

## Header

Do not edit `client/components/common/nav-header.vue` for zidan-only visual changes.

Style from `client/themes/zidan/components/page.vue` using `.zidan-app .nav-header`.

Header rules:

- White background.
- `overflow: hidden`.
- Border bottom: `1px solid #ECEEF1`.
- Icons/buttons: `#637381`.
- Site title: `#171c19`.
- Search input background: `#F6F7F9`.
- Search text/placeholder/icon: `#637381`.

## Left Sidebar

Primary file: `client/themes/zidan/components/nav-sidebar.vue`

Style rules:

- White background.
- Keep only a clean tree/menu structure.
- Hide drawer border and internal dividers.
- Item height around `34px`.
- Border radius: `6px`.
- Default text/icon: `#717572`.
- Hover: background `#F6F7F9`, text `#171c19`.
- Active: background `#F6F7F9`, text/icon `#3248F2`, weight `500`.
- Avoid shadows and heavy separators.

Important drawer wrapper in `page.vue`:

```pug
v-navigation-drawer.zidan-nav-drawer(width='260')
```

Important border override:

```scss
.zidan-app .v-navigation-drawer__border {
  display: none !important;
}
```

## Right Sidebar / TOC

Primary file: `client/themes/zidan/components/page.vue`

- Wrapper: `.zidan-right-sidebar`
- Inner card: `.zidan-right-sidebar-inner`
- TOC link: `.zidan-rs-toc-link`

Style rules:

- Sticky, top around `80px`.
- White card, border `#ECEEF1`, radius `10px`, no shadow.
- Label: `#637381`, `0.75rem`, weight `500`.
- TOC default: `#717572 !important`.
- TOC hover: `#171c19 !important`, background `#F6F7F9`.
- TOC active: `#3248F2 !important`, weight `500`.
- Subitems: smaller font, left padding.
- Use `!important` for TOC colors where Vuetify `.v-application a` overrides anchors.

## Markdown Content

Primary file: `client/themes/zidan/scss/app.scss`

Style direction: Typora/GitHub-like document reading experience.

Base `.v-main .contents`:

- Text: `#111111`
- Font size: `17px`
- Line height: `1.85`
- Padding: `8px 0 8px`
- Left aligned

Headings:

- Remove decorative `border-bottom` / gradient rules in the later Typora override.
- Heading color: `#111111`; dark mode `#FFFFFF`.
- Weight: `600`.
- h3 top margin should be relatively large: `2rem 0 .8rem`.

Links:

- Color: `#0063ff`.
- Hover: keep `#0063ff` and no underline.

Lists:

- Marker color: `#0063FF`.
- Marker weight: `600`.
- Use native bullets instead of custom triangle bullets in Typora override.

Tables:

- Do not stretch small tables full width.
- Use `width: auto; max-width: 100%; margin: 0;`.
- Border: `#d0d7de`, radius `6px`.
- Cell padding around `.7rem 1rem`.
- Use `.table-container` for horizontal overflow.

Code:

- Inline code: neutral light background, dark text.
- Code blocks: light GitHub-like surface in light mode, dark neutral surface in dark mode.

## Comments

Do not edit `client/components/comments.vue` for zidan-only style changes.

Style comments from `client/themes/zidan/components/page.vue` under `.comments-container`.

Rules:

- `#discussion` must remain visible.
- Hide useless empty text/separators when there are no comments.
- Container border: `1px solid #ECEEF1`.
- Border radius: `10px`.
- Background: `#FFF`.
- Overflow: `auto`.
- Primary buttons/avatar/dot: `#0063ff`.
- Text: `#171c19`; meta: `#637381` / `#919EAB`.
- Inputs: white background, border `#ECEEF1`, focus border `#0063ff`.
- Cards: white, border `#ECEEF1`, radius `10px`, no shadow.

## Footer

Primary file: `client/themes/zidan/components/nav-footer.vue`

Footer is a business-style footer:

- Left: website logo, site name, website/company description.
- Right: product/support/company link groups from `www.51zidan.com`.
- White background, border top `#ECEEF1`.
- No boxed max-width unless needed; align with content area.
- Desktop page footer is offset from left drawer using `.zidan-page-footer` in `page.vue`.

Current groups:

- 产品功能
  - 无卡发薪
  - 日结保险
  - 电子合同
  - 智能考勤
  - 预支薪资
- 了解子弹云
  - 关于我们
  - 加入我们
  - 最新资讯
- 支持与服务
  - 视频教学
  - 常见问题

## Page Selector Modal

Primary file: `client/components/common/page-selector.vue`

This is a shared component, but it was intentionally updated because page creation workflow is global.

Design / behavior requirements:

- Modal style should match zidan: white, simple, `#3248F2` header/action, `#ECEEF1` borders, `#F6F7F9` backgrounds.
- Split new page location workflow into:
  1. Select existing folder or create a virtual new folder.
  2. Fill article path slug.
- Article slug must not support `/` or `\`; convert to `-`.
- Spaces convert to `-`; repeated hyphens collapse.
- Final path is composed as `folderPath/articleSlug`.
- Do not add backend folder APIs unless explicitly requested; folders are virtual and generated from page paths by `server/jobs/rebuild-tree.js`.

## Important Architecture Note: Folders

Wiki folders are virtual. They are generated from page paths, not stored as standalone folder records.

Relevant file: `server/jobs/rebuild-tree.js`

The tree is built by splitting each page path by `/` and creating folder nodes for intermediate path segments. Therefore:

- Creating `/case/nanjing-company` creates virtual folder `case` if it does not exist.
- A UI “new folder” can be represented client-side by selecting a new path segment before creating the page.
- Do not look for a separate folder creation mutation unless the backend architecture is intentionally changed.

## Interaction Details

- Edit FAB button: primary `#3248F2`, pencil icon must be white.
- Up button: `#3248F2`, white icon.
- Keep focus/hover states subtle.
- Prefer `border-radius: 6px` for small controls, `10px` for cards/containers.
- Avoid unnecessary shadows.
- Avoid underlined links in theme UI and Markdown hover states.

## Dark Mode

Dark mode is supported but secondary to the clean light theme.

Use:

- Page background: `#14141B`
- Panels: `#181820`
- Hover: `#202027`
- Border: `#2f2f3a`
- Main text: `#FFFFFF`
- Meta text: `#919EAB`
- Active/link blue: `#7986FF`

## Quick File Map

- Main page layout and zidan scoped global component styling:
  - `client/themes/zidan/components/page.vue`
- Markdown/content styles:
  - `client/themes/zidan/scss/app.scss`
- Left sidebar/tree:
  - `client/themes/zidan/components/nav-sidebar.vue`
- Business footer:
  - `client/themes/zidan/components/nav-footer.vue`
- Shared page selector workflow and modal style:
  - `client/components/common/page-selector.vue`
- Virtual folder generation:
  - `server/jobs/rebuild-tree.js`

## Common Pitfalls

- Do not reintroduce dark Wiki.js header styling into zidan.
- Do not globally modify shared header/comments for visual-only theme work.
- Do not hide `#discussion` entirely; only hide useless empty text/separators.
- Do not let `.zidan-footer` slide underneath the left drawer.
- Do not use full-width tables for short Markdown tables.
- Do not use `/` in the article slug part of page creation; only folder selection/new-folder should create path nesting.
- Do not add visual borders under all Markdown headings.
