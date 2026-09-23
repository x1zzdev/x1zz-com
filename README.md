# x1zz.com

Technology studio site — compilers, type systems, and data infrastructure in Rust.

The root (`/`) is the x1zz brand page. The personal page of founder Sewoo Jang
lives at `/founder`.

## Structure

```
src/
  layouts/Layout.astro    shared head, SEO meta, fonts, lang persistence
  pages/
    index.astro           brand landing: mission, products, bridges, research, open source
    founder/index.astro   founder page: bio, featured projects, language lab, bridges, research, contributions
    portfolio/index.astro IDE-style project log (includes next.xz / rails.xz)
    writing/index.astro   engineering notes
    blog/                 notes on compilers, Rust, and ML tooling
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

English and Korean strings live side by side as `lang-en` / `lang-kr` spans;
a plain-CSS toggle shows one set at a time. The toggle stores the choice in
`localStorage['x1zz-lang']`, which wins on every later visit.

On a first visit (no saved choice) the language is picked automatically: the
browser locale gives an instant, flash-free guess, then Cloudflare's
`/cdn-cgi/trace` endpoint provides the visitor's country from their IP —
`loc=KR` switches the page to Korean, anything else stays English.