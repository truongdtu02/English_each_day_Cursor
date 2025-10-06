# 📚 English Learning Progress

- [Day 1](./days/day1.md) — Focus: Present Simple, “get up”, “look for”

## 🔍 Search by Keyword
- **get up:** [Day 1](./days/day1.md)
- **look for:** [Day 1](./days/day1.md)
- **present simple:** [Day 1](./days/day1.md)

---

## 🌐 GitHub Pages site (pure browser)
This repository includes a static site in `docs/` that runs fully client-side (no PowerShell/Node needed). It can:
- Browse all `days/*.md`
- Full-text search sentences and keywords
- Generate a new day file and open GitHub Web UI with prefilled content
- Build `README.md` content (copy to clipboard or open edit page)

### Enable Pages
1. Push this repo to GitHub
2. In Repository Settings → Pages → Source: select `Deploy from a branch`
3. Branch: `main`, Folder: `/docs`
4. Save. The site will be available at your GitHub Pages URL.

### Configure the site
Open `docs/` site, then set:
- Repo Owner
- Repo Name
- Branch (default: `main`)

The app stores this in your browser (localStorage). You can also prefill these in `docs/app.js`.

### Permissions
The site reads files using public GitHub APIs (no token). For creating/updating files, it prepares content and opens GitHub Web UI with everything prefilled so you can commit in the browser.
