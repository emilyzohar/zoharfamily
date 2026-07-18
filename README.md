# Zohar Family Website

## Landing screen

The homepage now uses `assets/landing-background.png` as the complete landing-screen artwork.

The square photo in the middle is a separate image layered on top. To change it, put the new image in `assets/` and edit this line in `data.js`:

```js
const LANDING_PHOTO = "assets/family-photo.jpg";
```

For example:

```js
const LANDING_PHOTO = "assets/new-family-photo.jpg";
```

You do not need to edit the background image to change the central photograph.


This is a static family keepsake website designed to be easy to edit in VS Code and publish with GitHub Pages.

## Main files

- `index.html` — homepage
- `person.html` — reusable profile page for every family member
- `data.js` — the main content file you will edit most often
- `app.js` — builds the family tree
- `person.js` — builds each family member page
- `styles.css` — design and layout
- `assets/` — photos and local video files

## Change the main homepage photo

Put the new image in `assets/`, then edit this line in `data.js`:

```js
const HERO_IMAGE = "assets/family-photo.jpg";
```

Example:

```js
const HERO_IMAGE = "assets/new-family-photo.jpg";
```

## Change homepage text

Edit this line in `data.js`:

```js
const HERO_CAPTION = "Zohar family — our heirloom for Zohar heirs and successors";
```

## Add or edit a person's keepsake page

In `data.js`, find their entry inside `PEOPLE`.

Example:

```js
aliza: {
  name: "Aliza",
  summary: "Short introduction.",
  story: [
    "First paragraph.",
    "Second paragraph."
  ],
  photo: "assets/aliza-main.jpg",
  photos: [
    "assets/aliza-1.jpg",
    "assets/aliza-2.jpg"
  ],
  videos: [
    "assets/aliza-video.mp4"
  ]
}
```

You can add as many photos as needed.

For large video collections, hosting videos externally and linking to them is usually better than storing all videos directly in GitHub.

## How the clickable names work

Every name on the homepage links to the same reusable page:

`person.html?person=aliza`

The `person=aliza` part tells the page which profile to load from `data.js`.

## Run locally in VS Code

The easiest method is the VS Code extension **Live Server**.

1. Open the folder in VS Code.
2. Install Live Server.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload all files from this folder to the repository root.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Save.

This project does not require a database or server backend. The content is kept in `data.js`, making it straightforward to maintain.

## Manual family tree editing

The family tree is now hand-positioned for exact visual control.

### Move a person's name

Open `styles.css` and find entries like:

```css
.erin {
  left: 42.5%;
  top: 67.5%;
}
```

- Increase `left` to move the name right.
- Decrease `left` to move it left.
- Increase `top` to move the name down.
- Decrease `top` to move it up.

### Edit the connector lines

Open `index.html` and find the `<svg class="tree-lines">` section.

Each line is written as:

```html
<line x1="820" y1="390" x2="1230" y2="390" />
```

- `x1` and `x2` control horizontal position.
- `y1` and `y2` control vertical position.
- Horizontal lines have the same `y1` and `y2`.
- Vertical lines have the same `x1` and `x2`.

The SVG uses a fixed `viewBox="0 0 2000 650"`, so the names and lines scale together with the browser width.
