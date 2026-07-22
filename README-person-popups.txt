PERSONAL FAMILY POPUPS

Dropbox structure expected
--------------------------
/Zohar Family/Works/Emily/
    poems/                 <- appears under Works
    Recipes/               <- enables Recipes tab
    Merch/                 <- enables Merch tab
    Memories/              <- enables Memories tab
    Travel/                <- enables Travel tab

The folder names Recipes, Merch, Memories, and Travel are matched case-insensitively.
The actual Dropbox folder spelling/casing is preserved when the tab is opened.

Behavior
--------
1. index.html lists /Zohar Family/Works.
2. A family-tree name becomes clickable only when it matches a person folder there.
3. Clicking the name opens one popup with a Works tab.
4. The popup checks that person folder and adds Recipes, Merch, Memories, and Travel tabs only when the matching folder exists.
5. Works uses archive.html with that person's /Works/{person} root.
6. The other tabs reuse the normal page templates but point them at /Works/{person}/{Section}.
7. Recipes/Merch/Memories/Travel are excluded from the Works archive.

Files changed
-------------
index.html
styles.css
archive.js
recipes.js
merch.js
memories.js
travel.js

The other included HTML/CSS files are unchanged copies with their normal production filenames. Keep your existing assets/ and data.js; they were not part of the upload and are not included here.
