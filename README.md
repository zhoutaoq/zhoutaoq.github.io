# Minimal Mistakes Jekyll Theme

> A flexible two-column Jekyll theme.

**Minimal Mistakes** is a flexible two-column Jekyll theme, perfect for building personal sites, blogs, and portfolios.

## Installation

### Using Docker (Recommended)

```bash
# Build and run
docker build -t zhoutaoq-site .
docker run -d -p 4000:4000 --name zhoutaoq-site zhoutaoq-site

# Or run directly
docker run --rm -it -v "$PWD:/site" -p 4000:4000 brettfisher/jekyll-serve

# Stop and remove
docker stop zhoutaoq-site
docker rm zhoutaoq-site
```

### Using Ruby (Alternative)

1. **Install Ruby** (version 2.5 or higher)
   - Windows: Download from [RubyInstaller](https://rubyinstaller.org/downloads/)
   - macOS: `brew install ruby`
   - Linux: `sudo apt install ruby-full`

2. **Install Bundler**
   ```bash
   gem install bundler
   ```

3. **Install dependencies**
   ```bash
   bundle install
   ```

4. **Run the site**
   ```bash
   bundle exec jekyll serve
   ```

5. **View your site** at `http://localhost:4000`

## Usage

- Edit files in `_pages/` to update content
- Update `_config.yml` for site settings
- Add images to `images/` folder

## Site map

| URL | What it is | Where |
| --- | --- | --- |
| `/` | 19-second intro film, auto-forwards to `/en/` when done (static page, no Jekyll layout) | `index.html` |
| `/en/` | English landing page | `_pages/about.html` |
| `/cn/` | Chinese landing page | `_pages/cn.html` |
| `/?embed=1` | Same film without the auto-forward, used inside the modal | `index.html` |

- The `Intro` button in the masthead replays the film in a modal (`_includes/intro-modal.html`, iframe lazily points at `/?embed=1`).
- Edit the film in `index.html`; landing-page copy lives in `_data/profile.yml`.
- Light/dark follows the browser (`prefers-color-scheme`) by default; the toggle cycles auto → dark → light and stores the override in `localStorage.theme`.

## License

MIT
