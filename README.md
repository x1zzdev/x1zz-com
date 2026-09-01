# x1zz.com

Personal site of Sewoo Jang — compilers and data pipeline tools in Rust.

## Structure

```
src/
  layouts/Layout.astro    shared head, SEO meta, fonts, lang persistence
  pages/
    index.astro           landing: hero, featured Xazz, projects, research
    portfolio/index.astro IDE-style project log
    writing/index.astro   engineering notes
   404.astro
  styles/global.css        design tokens + components
public/                   favicons, robots.txt, sitemap.xml, assets
```

## Development

```sh
npm install
npm run dev        # local server
npm run build      # static build to dist/
npm run preview    # preview the build
```

The dev server is managed in the background:

```sh
npx astro dev --background
npx astro dev status
npx astro dev logs
```

## Deploy

Cloudflare Pages — the build output directory is `dist` (see `wrangler.json`).

## Language

The site defaults to English. `localStorage['x1zz-lang']` remembers the
KR/EN choice across visits. English and Korean strings live side by side as
`lang-en` / `lang-kr` spans; a plain-CSS toggle shows one set at a time.