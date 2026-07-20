/* =========================================================
   DROPBOX ARCHIVE SETTINGS
========================================================= */

const DROPBOX_API_BASE =
  "https://family-photo-api.emilyzohar.workers.dev";

const DROPBOX_ARCHIVE_ROOT =
  "/Works/Sabba";


/* =========================================================
   SUPPORTED FILE TYPES
========================================================= */
const ARCHIVE_BACKGROUND_IMAGE =
  "assets/sabba/file.png";


function applyArchiveBackground() {
  document.body.style.backgroundImage =
    `url("${ARCHIVE_BACKGROUND_IMAGE}")`;

  document.body.style.backgroundRepeat =
    "no-repeat";

  document.body.style.backgroundPosition =
    "center top";

  document.body.style.backgroundSize =
    "100% auto";
}


/*
  Apply the GitHub background immediately.
  This runs before Dropbox starts loading.
*/

applyArchiveBackground();

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp"
]);

const PDF_EXTENSIONS = new Set([
  "pdf"
]);

const POWERPOINT_EXTENSIONS = new Set([
  "ppt",
  "pptx"
]);

const DOCUMENT_EXTENSIONS = new Set([
  "doc",
  "docx",
  "odt",
  "rtf",
  "txt"
]);


/* =========================================================
   OPTIONAL METADATA OVERRIDES

   These are optional.

   New files do not need to be added here. They will still
   appear automatically using a title derived from the
   filename.

   Keys are paths relative to /Works/Sabba.

   Example:

   "articles/football/peleletter.avif": {
     title: "Pele — My Inspirational Hero",
     description: "A documentary about Pelé.",
     url: "https://example.com"
   }
========================================================= */

const ARCHIVE_OVERRIDES = {

  "books/LoveTriangle.pdf": {
    title:
      "Love Triangle"
  },

  "books/The Voyage.pdf": {
    title:
      "The Voyage"
  },

  "articles/politics/rightwrong.pdf": {
    title:
      "How to do the right thing, the wrong way",

    year:
      "2003"
  }

};


/* =========================================================
   CATEGORY SETTINGS

   Folder names are matched case-insensitively.

   Any new top-level folder that is not listed here will
   still become a category automatically.
========================================================= */

const CATEGORY_SETTINGS = {

  poems: {
    title:
      "Poems",

    label:
      "Poem"
  },

  books: {
    title:
      "Books",

    label:
      "Book"
  },

  articles: {
    title:
      "Articles",

    label:
      "Article"
  },

  lectures: {
    title:
      "Lectures",

    label:
      "Lecture"
  },

  pictures: {
    title:
      "Pictures",

    label:
      "Photograph"
  }

};


/* =========================================================
   STATE
========================================================= */

let ARCHIVE_DATA =
  [];

let activeSectionIndex =
  0;

let pdfReturnContext =
  null;

let imageReturnContext =
  null;


/* =========================================================
   DOM
========================================================= */

const archiveTabs =
  document.getElementById(
    "archiveTabs"
  );

const archiveStage =
  document.getElementById(
    "archiveStage"
  );

const archiveStageContent =
  document.getElementById(
    "archiveStageContent"
  );


/* =========================================================
   GENERAL HELPERS
========================================================= */

function normalisePath(
  value
) {
  return String(
    value ?? ""
  )
    .replace(
      /\\/g,
      "/"
    )
    .replace(
      /\/+/g,
      "/"
    );
}


function trimSlashes(
  value
) {
  return normalisePath(
    value
  )
    .replace(
      /^\/+|\/+$/g,
      ""
    );
}


function joinDropboxPath(
  ...parts
) {
  const cleanParts =
    parts
      .map(
        trimSlashes
      )
      .filter(
        Boolean
      );

  return (
    "/" +
    cleanParts.join("/")
  );
}


function getRelativeArchivePath(
  fullPath
) {
  const normalisedRoot =
    trimSlashes(
      DROPBOX_ARCHIVE_ROOT
    );

  const normalisedPath =
    trimSlashes(
      fullPath
    );

  if (
    normalisedPath
      .toLowerCase()
      .startsWith(
        normalisedRoot.toLowerCase()
      )
  ) {
    return normalisedPath
      .slice(
        normalisedRoot.length
      )
      .replace(
        /^\/+/,
        ""
      );
  }

  return normalisedPath;
}


function getFilename(
  path
) {
  return normalisePath(
    path
  )
    .split("/")
    .pop() || "";
}


function getExtension(
  path
) {
  const filename =
    getFilename(
      path
    );

  const match =
    filename.match(
      /\.([^.]+)$/
    );

  return match
    ? match[1].toLowerCase()
    : "";
}


function removeExtension(
  filename
) {
  return String(
    filename ?? ""
  )
    .replace(
      /\.[^.]+$/,
      ""
    );
}


function titleFromFilename(
  filename
) {
  const base =
    removeExtension(
      filename
    );

  return base
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}


function titleFromFolder(
  folderName
) {
  return titleFromFilename(
    folderName
  );
}


function escapeHtml(
  value
) {
  return String(
    value ?? ""
  )
    .replace(
      /[&<>"']/g,
      character => {
        const entities = {
          "&":
            "&amp;",

          "<":
            "&lt;",

          ">":
            "&gt;",

          '"':
            "&quot;",

          "'":
            "&#039;"
        };

        return entities[
          character
        ];
      }
    );
}


function compareNaturally(
  valueA,
  valueB
) {
  return String(
    valueA ?? ""
  )
    .localeCompare(
      String(
        valueB ?? ""
      ),
      undefined,
      {
        numeric:
          true,

        sensitivity:
          "base"
      }
    );
}


/* =========================================================
   DROPBOX API
========================================================= */

function buildDropboxApiUrl(
  endpoint,
  parameters = {}
) {
  const base =
    DROPBOX_API_BASE.endsWith("/")
      ? DROPBOX_API_BASE
      : `${DROPBOX_API_BASE}/`;

  const cleanEndpoint =
    String(
      endpoint
    )
      .replace(
        /^\/+/,
        ""
      );

  const url =
    new URL(
      cleanEndpoint,
      base
    );

  Object.entries(
    parameters
  )
    .forEach(
      (
        [
          key,
          value
        ]
      ) => {
        if (
          value !== undefined &&
          value !== null
        ) {
          url.searchParams.set(
            key,
            String(
              value
            )
          );
        }
      }
    );

  return url.toString();
}


function getDropboxFileUrl(
  path
) {
  if (
    !path
  ) {
    return "";
  }

  return buildDropboxApiUrl(
    "/file",
    {
      path
    }
  );
}


async function fetchDropboxFolder(
  path
) {
  const response =
    await fetch(
      buildDropboxApiUrl(
        "/folder",
        {
          path
        }
      ),
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json"
        }
      }
    );

  if (
    !response.ok
  ) {
    const errorText =
      await response.text();

    throw new Error(
      `Could not list ${path}. HTTP ${response.status}. ${errorText}`
    );
  }

  const entries =
    await response.json();

  if (
    !Array.isArray(
      entries
    )
  ) {
    throw new Error(
      `The Dropbox folder endpoint did not return an array for ${path}.`
    );
  }

  return entries;
}


/* =========================================================
   RECURSIVE DROPBOX SCAN
========================================================= */

async function scanDropboxFolder(
  folderPath
) {
  const entries =
    await fetchDropboxFolder(
      folderPath
    );

  const files =
    [];

  const childFolders =
    [];

  entries.forEach(
    entry => {
      const entryType =
        String(
          entry.type ?? ""
        )
          .toLowerCase();

      if (
        entryType ===
        "file"
      ) {
        files.push({
          type:
            "file",

          name:
            entry.name ||
            getFilename(
              entry.path
            ),

          path:
            entry.path ||
            joinDropboxPath(
              folderPath,
              entry.name
            ),

          size:
            entry.size ??
            null
        });
      }

      if (
        entryType ===
        "folder"
      ) {
        childFolders.push({
          type:
            "folder",

          name:
            entry.name ||
            getFilename(
              entry.path
            ),

          path:
            entry.path ||
            joinDropboxPath(
              folderPath,
              entry.name
            )
        });
      }
    }
  );

  const childResults =
    await Promise.all(
      childFolders.map(
        folder =>
          scanDropboxFolder(
            folder.path
          )
      )
    );

  return {
    name:
      getFilename(
        folderPath
      ),

    path:
      folderPath,

    files:
      files.sort(
        (
          fileA,
          fileB
        ) =>
          compareNaturally(
            fileA.name,
            fileB.name
          )
      ),

    folders:
      childResults.sort(
        (
          folderA,
          folderB
        ) =>
          compareNaturally(
            folderA.name,
            folderB.name
          )
      )
  };
}


/* =========================================================
   FILE CLASSIFICATION
========================================================= */

function classifyFile(
  file
) {
  const extension =
    getExtension(
      file.name
    );

  if (
    IMAGE_EXTENSIONS.has(
      extension
    )
  ) {
    return "image";
  }

  if (
    PDF_EXTENSIONS.has(
      extension
    )
  ) {
    return "pdf";
  }

  if (
    POWERPOINT_EXTENSIONS.has(
      extension
    )
  ) {
    return "pptx";
  }

  if (
    DOCUMENT_EXTENSIONS.has(
      extension
    )
  ) {
    return "document";
  }

  return "download";
}


/* =========================================================
   RELATED FILE GROUPING

   alon.avif
   alon2.avif
   alon3.avif

   become one gallery named "Alon".

   A trailing page number is removed only for grouping.
========================================================= */

function getGroupingStem(
  filename
) {
  return removeExtension(
    filename
  )
    .replace(
      /(?:[\s_-]*(?:page|scan|image|photo))?[\s_-]*\d+$/i,
      ""
    )
    .replace(
      /[\s_-]+$/g,
      ""
    )
    .trim()
    .toLowerCase();
}


function getDisplayStem(
  filename
) {
  return removeExtension(
    filename
  )
    .replace(
      /(?:[\s_-]*(?:page|scan|image|photo))?[\s_-]*\d+$/i,
      ""
    )
    .replace(
      /[\s_-]+$/g,
      ""
    )
    .trim();
}


/* =========================================================
   OVERRIDES
========================================================= */

function getArchiveOverride(
  fullPath
) {
  const relativePath =
    getRelativeArchivePath(
      fullPath
    );

  const exactMatch =
    ARCHIVE_OVERRIDES[
      relativePath
    ];

  if (
    exactMatch
  ) {
    return exactMatch;
  }

  const matchingKey =
    Object.keys(
      ARCHIVE_OVERRIDES
    )
      .find(
        key =>
          key.toLowerCase() ===
          relativePath.toLowerCase()
      );

  return matchingKey
    ? ARCHIVE_OVERRIDES[
        matchingKey
      ]
    : {};
}


/* =========================================================
   BUILD AN ARCHIVE ITEM FROM ONE FILE
========================================================= */

function createItemFromFile(
  file,
  categoryLabel
) {
  const type =
    classifyFile(
      file
    );

  const override =
    getArchiveOverride(
      file.path
    );

  return {
    title:
      override.title ||
      titleFromFilename(
        file.name
      ),

    author:
      override.author ||
      "",

    year:
      override.year ||
      "",

    description:
      override.description ||
      "",

    url:
      override.url ||
      "",

    type:
      override.type ||
      type,

    file:
      file.path,

    image:
      override.image ||
      (
        type === "image"
          ? file.path
          : ""
      ),

    quickViewImage:
      override.quickViewImage ||
      "",

    label:
      override.label ||
      categoryLabel ||
      "Archive",

    sourcePath:
      file.path
  };
}


/* =========================================================
   COMBINE RELATED FILES

   Examples:

   alon.avif + alon2.avif
   → imageGallery

   LoveTriangle.pdf + LoveTriangle.avif
   → PDF with image thumbnail

   poem.pdf + poem.avif
   → mediaGallery
========================================================= */

function combineRelatedFiles(
  files,
  categoryLabel
) {
  const groups =
    new Map();

  files.forEach(
    file => {
      const groupStem =
        getGroupingStem(
          file.name
        ) ||
        removeExtension(
          file.name
        )
          .toLowerCase();

      if (
        !groups.has(
          groupStem
        )
      ) {
        groups.set(
          groupStem,
          []
        );
      }

      groups
        .get(
          groupStem
        )
        .push(
          file
        );
    }
  );

  const items =
    [];

  groups.forEach(
    groupedFiles => {
      groupedFiles.sort(
        (
          fileA,
          fileB
        ) =>
          compareNaturally(
            fileA.name,
            fileB.name
          )
      );

      const typedFiles =
        groupedFiles.map(
          file => ({
            file,
            type:
              classifyFile(
                file
              )
          })
        );

      const imageFiles =
        typedFiles.filter(
          entry =>
            entry.type ===
            "image"
        );

      const nonImageFiles =
        typedFiles.filter(
          entry =>
            entry.type !==
            "image"
        );

      const displayTitle =
        titleFromFilename(
          getDisplayStem(
            groupedFiles[0].name
          )
        );

      /*
        Several images and no documents:
        create an image gallery.
      */

      if (
        imageFiles.length > 1 &&
        nonImageFiles.length === 0
      ) {
        const firstOverride =
          getArchiveOverride(
            imageFiles[0].file.path
          );

        items.push({
          title:
            firstOverride.title ||
            displayTitle,

          type:
            "imageGallery",

          image:
            imageFiles[0].file.path,

          file:
            imageFiles.map(
              entry =>
                entry.file.path
            ),

          label:
            firstOverride.label ||
            categoryLabel ||
            "Images",

          year:
            firstOverride.year ||
            "",

          description:
            firstOverride.description ||
            ""
        });

        return;
      }

      /*
        One document and one or more matching images:
        use the first image as the document thumbnail.
      */

      if (
        nonImageFiles.length === 1 &&
        imageFiles.length >= 1
      ) {
        const documentItem =
          createItemFromFile(
            nonImageFiles[0].file,
            categoryLabel
          );

        documentItem.image =
          imageFiles[0].file.path;

        items.push(
          documentItem
        );

        return;
      }

      /*
        Images mixed with several documents:
        create one mixed-media collection.
      */

      if (
        imageFiles.length >= 1 &&
        nonImageFiles.length >= 1
      ) {
        const firstOverride =
          getArchiveOverride(
            groupedFiles[0].path
          );

        items.push({
          title:
            firstOverride.title ||
            displayTitle,

          type:
            "mediaGallery",

          image:
            imageFiles[0].file.path,

          file:
            typedFiles.map(
              entry => ({
                title:
                  getArchiveOverride(
                    entry.file.path
                  ).title ||
                  titleFromFilename(
                    entry.file.name
                  ),

                type:
                  entry.type,

                file:
                  entry.file.path
              })
            ),

          label:
            firstOverride.label ||
            categoryLabel ||
            "Collection"
        });

        return;
      }

      /*
        Otherwise, create one card for each file.
      */

      groupedFiles.forEach(
        file => {
          items.push(
            createItemFromFile(
              file,
              categoryLabel
            )
          );
        }
      );
    }
  );

  return items.sort(
    (
      itemA,
      itemB
    ) =>
      compareNaturally(
        itemA.title,
        itemB.title
      )
  );
}


/* =========================================================
   FIND FILES DIRECTLY INSIDE A FOLDER
========================================================= */

function getDisplayableFiles(
  folder
) {
  return folder.files.filter(
    file => {
      const lowerName =
        String(
          file.name ?? ""
        )
          .toLowerCase();

      if (
        lowerName ===
        "file.png"
      ) {
        return false;
      }

      if (
        lowerName.startsWith(
          "."
        )
      ) {
        return false;
      }

      return true;
    }
  );
}


/* =========================================================
   FLATTEN ALL FILES INSIDE A FOLDER TREE
========================================================= */

function flattenFolderFiles(
  folder
) {
  const files = [
    ...getDisplayableFiles(
      folder
    )
  ];

  folder.folders.forEach(
    childFolder => {
      files.push(
        ...flattenFolderFiles(
          childFolder
        )
      );
    }
  );

  return files;
}


/* =========================================================
   BUILD ONE TOP-LEVEL CATEGORY
========================================================= */

function buildCategoryFromFolder(
  categoryFolder
) {
  const categoryKey =
    categoryFolder.name
      .toLowerCase();

  const settings =
    CATEGORY_SETTINGS[
      categoryKey
    ] || {};

  const sectionTitle =
    settings.title ||
    titleFromFolder(
      categoryFolder.name
    );

  const categoryLabel =
    settings.label ||
    sectionTitle.replace(
      /s$/i,
      ""
    );

  const directFiles =
    getDisplayableFiles(
      categoryFolder
    );

  /*
    No subfolders:
    show one simple category carousel.
  */

  if (
    categoryFolder.folders.length === 0
  ) {
    return {
      section:
        sectionTitle,

      items:
        combineRelatedFiles(
          directFiles,
          categoryLabel
        )
    };
  }

  /*
    Folder contains subfolders:
    each subfolder becomes a group.

    Files stored directly in the category folder are placed
    in an "Other" group.
  */

  const groups =
    [];

  if (
    directFiles.length > 0
  ) {
    groups.push({
      title:
        "Other",

      items:
        combineRelatedFiles(
          directFiles,
          categoryLabel
        )
    });
  }

  categoryFolder.folders.forEach(
    groupFolder => {
      const groupFiles =
        flattenFolderFiles(
          groupFolder
        );

      groups.push({
        title:
          titleFromFolder(
            groupFolder.name
          ),

        items:
          combineRelatedFiles(
            groupFiles,
            categoryLabel
          )
      });
    }
  );

  return {
    section:
      sectionTitle,

    groups:
      groups.filter(
        group =>
          group.items.length > 0
      )
  };
}


/* =========================================================
   ARCHIVE BACKGROUND
========================================================= */

function findArchiveBackground(
  rootTree
) {
  const rootBackground =
    rootTree.files.find(
      file =>
        file.name.toLowerCase() ===
        "file.png"
    );

  if (
    rootBackground
  ) {
    return rootBackground.path;
  }

  for (
    const folder of
    rootTree.folders
  ) {
    const background =
      folder.files.find(
        file =>
          file.name.toLowerCase() ===
          "file.png"
      );

    if (
      background
    ) {
      return background.path;
    }
  }

  return "";
}


/* =========================================================
   BUILD ARCHIVE DATA
========================================================= */

function buildArchiveData(
  rootTree
) {
  const preferredOrder = [
    "poems",
    "books",
    "articles",
    "lectures",
    "pictures"
  ];

  const categoryFolders = [
    ...rootTree.folders
  ];

  categoryFolders.sort(
    (
      folderA,
      folderB
    ) => {
      const indexA =
        preferredOrder.indexOf(
          folderA.name.toLowerCase()
        );

      const indexB =
        preferredOrder.indexOf(
          folderB.name.toLowerCase()
        );

      if (
        indexA !== -1 &&
        indexB !== -1
      ) {
        return indexA - indexB;
      }

      if (
        indexA !== -1
      ) {
        return -1;
      }

      if (
        indexB !== -1
      ) {
        return 1;
      }

      return compareNaturally(
        folderA.name,
        folderB.name
      );
    }
  );

  return categoryFolders
    .map(
      buildCategoryFromFolder
    )
    .filter(
      section => {
        if (
          Array.isArray(
            section.items
          )
        ) {
          return section.items.length > 0;
        }

        if (
          Array.isArray(
            section.groups
          )
        ) {
          return section.groups.length > 0;
        }

        return false;
      }
    );
}


/* =========================================================
   LOADING AND ERROR STATES
========================================================= */

function showArchiveLoading() {
  archiveTabs.innerHTML =
    "";

  archiveStageContent.innerHTML = `
    <div class="archive-loading">
      Loading…
    </div>
  `;
}


function showArchiveError(
  message
) {
  archiveTabs.innerHTML =
    "";

  archiveStageContent.innerHTML = `
    <div class="archive-loading archive-error">
      <h2>Sabba's works could not be loaded</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}


/* =========================================================
   LOAD ARCHIVE
========================================================= */

async function loadArchiveFromDropbox() {
  /*
    Reapply it in case another style changed it,
    but do not wait for Dropbox.
  */

  applyArchiveBackground();

  showArchiveLoading();

  try {
    const rootTree =
      await scanDropboxFolder(
        DROPBOX_ARCHIVE_ROOT
      );

    ARCHIVE_DATA =
      buildArchiveData(
        rootTree
      );

    if (
      ARCHIVE_DATA.length === 0
    ) {
      throw new Error(
        `No supported archive files were found in ${DROPBOX_ARCHIVE_ROOT}.`
      );
    }

    activeSectionIndex =
      0;

    buildArchiveTabs();

    renderActiveSection();

  } catch (
    error
  ) {
    console.error(
      "Archive loading failed:",
      error
    );

    showArchiveError(
      error.message ||
      "An unknown error occurred."
    );
  }
}


/* =========================================================
   BUILD CATEGORY TABS
========================================================= */

function buildArchiveTabs() {
  archiveTabs.innerHTML =
    "";

  ARCHIVE_DATA.forEach(
    (
      section,
      index
    ) => {
      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "archive-category-tab";

      button.textContent =
        section.section;

      button.addEventListener(
        "click",
        () => {
          activeSectionIndex =
            index;

          renderActiveSection();
        }
      );

      archiveTabs.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   RENDER ACTIVE CATEGORY
========================================================= */

function renderActiveSection() {
  const section =
    ARCHIVE_DATA[
      activeSectionIndex
    ];

  if (
    !section
  ) {
    return;
  }

  document
    .querySelectorAll(
      ".archive-category-tab"
    )
    .forEach(
      (
        tab,
        index
      ) => {
        tab.classList.toggle(
          "active",
          index ===
          activeSectionIndex
        );
      }
    );

  archiveStageContent.innerHTML =
    "";

  archiveStageContent.scrollTop =
    0;

  if (
    Array.isArray(
      section.items
    )
  ) {
    archiveStageContent.appendChild(
      createCarousel(
        section.items
      )
    );

    return;
  }

  if (
    Array.isArray(
      section.groups
    )
  ) {
    section.groups.forEach(
      group => {
        const groupElement =
          document.createElement(
            "section"
          );

        groupElement.className =
          "archive-group";

        const heading =
          document.createElement(
            "h2"
          );

        heading.className =
          "archive-group-title";

        heading.textContent =
          group.title;

        groupElement.appendChild(
          heading
        );

        groupElement.appendChild(
          createCarousel(
            group.items
          )
        );

        archiveStageContent.appendChild(
          groupElement
        );
      }
    );
  }
}


/* =========================================================
   CREATE CAROUSEL
========================================================= */

function createCarousel(
  items
) {
  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "carousel-wrapper";

  const previousButton =
    document.createElement(
      "button"
    );

  previousButton.type =
    "button";

  previousButton.className =
    "carousel-button carousel-button-left";

  previousButton.textContent =
    "←";

  previousButton.setAttribute(
    "aria-label",
    "Scroll left"
  );

  const carousel =
    document.createElement(
      "div"
    );

  carousel.className =
    "archive-carousel";

  items.forEach(
    item => {
      carousel.appendChild(
        createCard(
          item
        )
      );
    }
  );

  const nextButton =
    document.createElement(
      "button"
    );

  nextButton.type =
    "button";

  nextButton.className =
    "carousel-button carousel-button-right";

  nextButton.textContent =
    "→";

  nextButton.setAttribute(
    "aria-label",
    "Scroll right"
  );

  function getScrollAmount() {
    const card =
      carousel.querySelector(
        ".archive-card"
      );

    if (
      !card
    ) {
      return 400;
    }

    return (
      card.offsetWidth +
      25
    );
  }

  previousButton.addEventListener(
    "click",
    () => {
      carousel.scrollBy({
        left:
          -getScrollAmount(),

        behavior:
          "smooth"
      });
    }
  );

  nextButton.addEventListener(
    "click",
    () => {
      carousel.scrollBy({
        left:
          getScrollAmount(),

        behavior:
          "smooth"
      });
    }
  );

  wrapper.append(
    previousButton,
    carousel,
    nextButton
  );

  return wrapper;
}


/* =========================================================
   DISPLAY URL HELPERS
========================================================= */

function getItemThumbnailUrl(
  item
) {
  return item.image
    ? getDropboxFileUrl(
        item.image
      )
    : "";
}


function getItemFileUrl(
  item
) {
  return item.file
    ? getDropboxFileUrl(
        item.file
      )
    : "";
}


/* =========================================================
   CREATE CARD
========================================================= */

function createCard(
  item
) {
  if (
    item.type ===
    "blurb"
  ) {
    return createBlurbCard(
      item
    );
  }

  const card =
    document.createElement(
      "article"
    );

  card.className =
    "archive-card";

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "archive-card-content";

  const thumbnailUrl =
    getItemThumbnailUrl(
      item
    );

  content.innerHTML = `
    <span class="item-type">
      ${escapeHtml(item.label || "Archive")}
    </span>

    <div class="item-main-row">

      <div class="item-main-text">

        <h3 class="item-title">
          ${escapeHtml(item.title || "")}
        </h3>

        ${
          item.author
            ? `
              <p class="item-author">
                ${escapeHtml(item.author)}
              </p>
            `
            : ""
        }

      </div>

      ${
        thumbnailUrl
          ? `
            <div class="card-thumbnail-wrap">
              <img
                class="card-thumbnail"
                src="${escapeHtml(thumbnailUrl)}"
                alt="${escapeHtml(item.title || "")}"
                loading="lazy"
              >
            </div>
          `
          : ""
      }

    </div>

    <div class="item-footer">

      <span class="item-meta">
        ${escapeHtml(item.year || "")}
      </span>

      <span class="item-action">
        ${escapeHtml(getActionText(item.type))}
      </span>

    </div>
  `;

  card.appendChild(
    content
  );

  card.addEventListener(
    "click",
    () => {
      handleItem(
        item
      );
    }
  );

  return card;
}


/* =========================================================
   BLURB CARD
========================================================= */

function createBlurbCard(
  item
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "archive-card blurb-carousel-card";

  const text =
    document.createElement(
      "div"
    );

  text.className =
    "blurb-carousel-text";

  text.textContent =
    item.text;

  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    "blurb-read-more";

  button.textContent =
    "Read more →";

  button.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      openBlurbQuickView(
        item.title ||
        "Introduction",

        item.text
      );
    }
  );

  card.append(
    text,
    button
  );

  return card;
}


/* =========================================================
   ACTION TEXT
========================================================= */

function getActionText(
  type
) {
  switch (
    type
  ) {
    case "pdf":
      return "Preview →";

    case "pptx":
      return "Open presentation ↗";

    case "document":
      return "Open document ↗";

    case "download":
      return "Open file ↗";

    case "image":
      return "View image →";

    case "imageGallery":
      return "View images →";

    case "mediaGallery":
      return "View collection →";

    case "articleCollection":
      return "View articles →";

    case "link":
      return "Quick view →";

    default:
      return "View →";
  }
}


/* =========================================================
   HANDLE ITEM
========================================================= */

function handleItem(
  item
) {
  switch (
    item.type
  ) {
    case "pdf":
      openPDF(
        item
      );

      return;

    case "image":
      openImage(
        item
      );

      return;

    case "imageGallery":
      openImageGallery(
        item
      );

      return;

    case "mediaGallery":
      openMediaGallery(
        item
      );

      return;

    case "pptx":
      openPowerPoint(
        item
      );

      return;

    case "document":
    case "download":
      openDropboxFile(
        item
      );

      return;

    case "articleCollection":
      openArticleCollection(
        item
      );

      return;

    default:
      openQuickView(
        item
      );
  }
}


/* =========================================================
   OPEN GENERIC DROPBOX FILE
========================================================= */

function openDropboxFile(
  item
) {
  const fileUrl =
    getItemFileUrl(
      item
    );

  if (
    !fileUrl
  ) {
    return;
  }

  window.open(
    fileUrl,
    "_blank",
    "noopener"
  );
}


/* =========================================================
   BLURB QUICK VIEW
========================================================= */

function openBlurbQuickView(
  title,
  text
) {
  const modal =
    document.getElementById(
      "quickViewModal"
    );

  modal
    .querySelector(
      ".quick-view-window"
    )
    .classList.add(
      "blurb-view"
    );

  document.getElementById(
    "quickViewCategory"
  ).textContent =
    "Introduction";

  document.getElementById(
    "quickViewTitle"
  ).textContent =
    title;

  document.getElementById(
    "quickViewAuthor"
  ).textContent =
    "";

  document.getElementById(
    "quickViewYear"
  ).textContent =
    "";

  const description =
    document.getElementById(
      "quickViewDescription"
    );

  description.innerHTML =
    "";

  text
    .split(
      /\n\s*\n/
    )
    .forEach(
      paragraphText => {
        const paragraph =
          document.createElement(
            "p"
          );

        paragraph.textContent =
          paragraphText.trim();

        description.appendChild(
          paragraph
        );
      }
    );

  clearQuickViewImage();

  document.getElementById(
    "quickViewActions"
  ).innerHTML =
    "";

  openModal(
    modal
  );
}


/* =========================================================
   ARTICLE COLLECTION
========================================================= */

function openArticleCollection(
  item
) {
  const modal =
    document.getElementById(
      "quickViewModal"
    );

  modal
    .querySelector(
      ".quick-view-window"
    )
    .classList.remove(
      "blurb-view"
    );

  fillCollectionHeader(
    item
  );

  const description =
    document.getElementById(
      "quickViewDescription"
    );

  description.innerHTML =
    "";

  const list =
    document.createElement(
      "div"
    );

  list.className =
    "article-list";

  const articles =
    Array.isArray(
      item.articles
    )
      ? item.articles
      : [];

  articles.forEach(
    article => {
      list.appendChild(
        createCollectionRow(
          article,
          () => {
            if (
              article.type ===
              "pdf"
            ) {
              hideModal(
                modal
              );

              openPDF(
                article,
                {
                  type:
                    "articleCollection",

                  item:
                    item
                }
              );
            } else {
              openDropboxFile(
                article
              );
            }
          }
        )
      );
    }
  );

  description.appendChild(
    list
  );

  clearQuickViewImage();

  document.getElementById(
    "quickViewActions"
  ).innerHTML =
    "";

  openModal(
    modal
  );
}


/* =========================================================
   MIXED MEDIA COLLECTION
========================================================= */

function openMediaGallery(
  item
) {
  const modal =
    document.getElementById(
      "quickViewModal"
    );

  modal
    .querySelector(
      ".quick-view-window"
    )
    .classList.remove(
      "blurb-view"
    );

  fillCollectionHeader(
    item
  );

  const description =
    document.getElementById(
      "quickViewDescription"
    );

  description.innerHTML =
    "";

  const list =
    document.createElement(
      "div"
    );

  list.className =
    "article-list";

  const mediaFiles =
    Array.isArray(
      item.file
    )
      ? item.file
      : [];

  mediaFiles.forEach(
    media => {
      list.appendChild(
        createCollectionRow(
          media,
          () => {
            hideModal(
              modal
            );

            const returnContext = {
              type:
                "mediaGallery",

              item:
                item
            };

            if (
              media.type ===
              "image"
            ) {
              openImage(
                media,
                returnContext
              );
            } else if (
              media.type ===
              "pdf"
            ) {
              openPDF(
                media,
                returnContext
              );
            } else if (
              media.type ===
              "pptx"
            ) {
              openPowerPoint(
                media
              );
            } else {
              openDropboxFile(
                media
              );
            }
          }
        )
      );
    }
  );

  description.appendChild(
    list
  );

  clearQuickViewImage();

  document.getElementById(
    "quickViewActions"
  ).innerHTML =
    "";

  openModal(
    modal
  );
}


/* =========================================================
   COLLECTION ROW
========================================================= */

function createCollectionRow(
  item,
  action
) {
  const row =
    document.createElement(
      "div"
    );

  row.className =
    "article-list-item";

  const text =
    document.createElement(
      "div"
    );

  text.className =
    "article-list-text";

  const title =
    document.createElement(
      "h3"
    );

  title.textContent =
    item.title ||
    "Untitled";

  text.appendChild(
    title
  );

  const arrow =
    document.createElement(
      "span"
    );

  arrow.className =
    "article-list-arrow";

  arrow.textContent =
    getActionText(
      item.type
    );

  row.append(
    text,
    arrow
  );

  row.addEventListener(
    "click",
    action
  );

  return row;
}


/* =========================================================
   COLLECTION HEADER
========================================================= */

function fillCollectionHeader(
  item
) {
  document.getElementById(
    "quickViewCategory"
  ).textContent =
    item.label ||
    "Collection";

  document.getElementById(
    "quickViewTitle"
  ).textContent =
    item.title ||
    "";

  document.getElementById(
    "quickViewAuthor"
  ).textContent =
    "";

  document.getElementById(
    "quickViewYear"
  ).textContent =
    "";
}


/* =========================================================
   IMAGE GALLERY
========================================================= */

function openImageGallery(
  item
) {
  imageReturnContext =
    null;

  const modal =
    document.getElementById(
      "imageModal"
    );

  const windowElement =
    modal.querySelector(
      ".image-modal-window"
    );

  const image =
    document.getElementById(
      "lightboxImage"
    );

  const files =
    Array.isArray(
      item.file
    )
      ? item.file
      : [
          item.file
        ];

  let currentIndex =
    0;

  let previous =
    document.getElementById(
      "imageGalleryPrev"
    );

  let next =
    document.getElementById(
      "imageGalleryNext"
    );

  if (
    !previous
  ) {
    previous =
      createImageArrow(
        "imageGalleryPrev",
        "image-gallery-arrow image-gallery-arrow-left",
        "‹"
      );

    windowElement.appendChild(
      previous
    );
  }

  if (
    !next
  ) {
    next =
      createImageArrow(
        "imageGalleryNext",
        "image-gallery-arrow image-gallery-arrow-right",
        "›"
      );

    windowElement.appendChild(
      next
    );
  }

  function showImage() {
    image.src =
      getDropboxFileUrl(
        files[
          currentIndex
        ]
      );

    image.alt =
      `${item.title || "Image"} ${currentIndex + 1}`;

    document.getElementById(
      "lightboxTitle"
    ).textContent =
      item.title ||
      "";

    document.getElementById(
      "lightboxDescription"
    ).textContent =
      `${currentIndex + 1} of ${files.length}`;
  }

  previous.style.display =
    files.length > 1
      ? "flex"
      : "none";

  next.style.display =
    files.length > 1
      ? "flex"
      : "none";

  previous.onclick =
    event => {
      event.stopPropagation();

      currentIndex =
        (
          currentIndex -
          1 +
          files.length
        ) %
        files.length;

      showImage();
    };

  next.onclick =
    event => {
      event.stopPropagation();

      currentIndex =
        (
          currentIndex +
          1
        ) %
        files.length;

      showImage();
    };

  image.onclick =
    files.length > 1
      ? next.onclick
      : null;

  showImage();

  openModal(
    modal
  );
}


/* =========================================================
   IMAGE ARROW
========================================================= */

function createImageArrow(
  id,
  className,
  text
) {
  const button =
    document.createElement(
      "button"
    );

  button.id =
    id;

  button.type =
    "button";

  button.className =
    className;

  button.textContent =
    text;

  return button;
}


/* =========================================================
   SINGLE IMAGE
========================================================= */

function openImage(
  item,
  returnContext = null
) {
  imageReturnContext =
    returnContext;

  const modal =
    document.getElementById(
      "imageModal"
    );

  const image =
    document.getElementById(
      "lightboxImage"
    );

  const previous =
    document.getElementById(
      "imageGalleryPrev"
    );

  const next =
    document.getElementById(
      "imageGalleryNext"
    );

  if (
    previous
  ) {
    previous.style.display =
      "none";
  }

  if (
    next
  ) {
    next.style.display =
      "none";
  }

  image.onclick =
    null;

  image.src =
    getDropboxFileUrl(
      item.file ||
      item.image
    );

  image.alt =
    item.title ||
    "";

  document.getElementById(
    "lightboxTitle"
  ).textContent =
    item.title ||
    "";

  document.getElementById(
    "lightboxDescription"
  ).textContent =
    item.description ||
    "";

  openModal(
    modal
  );
}


/* =========================================================
   PDF
========================================================= */

function openPDF(
  item,
  returnContext = null
) {
  pdfReturnContext =
    returnContext;

  const modal =
    document.getElementById(
      "pdfModal"
    );

  const fileUrl =
    getDropboxFileUrl(
      item.file
    );

  document.getElementById(
    "pdfFrame"
  ).src =
    fileUrl;

  document.getElementById(
    "pdfTitle"
  ).textContent =
    item.title ||
    "Document";

  document.getElementById(
    "pdfNewTab"
  ).href =
    fileUrl;

  openModal(
    modal
  );
}


/* =========================================================
   POWERPOINT
========================================================= */

/* =========================================================
   POWERPOINT

   Opens the Dropbox file directly. The browser will
   download it or open it in the user's PowerPoint app.
========================================================= */
async function getDropboxSharedLink(
  path
) {
  const response =
    await fetch(
      buildDropboxApiUrl(
        "/shared-link",
        {
          path
        }
      )
    );

  if (
    !response.ok
  ) {
    const errorText =
      await response.text();

    throw new Error(
      `Could not create Dropbox preview link. HTTP ${response.status}. ${errorText}`
    );
  }

  const result =
    await response.json();

  if (
    !result.url
  ) {
    throw new Error(
      "The Worker did not return a Dropbox shared link."
    );
  }

  return result.url;
}

async function openPowerPoint(
  item
) {
  if (
    !item?.file
  ) {
    console.error(
      "PowerPoint item has no file path.",
      item
    );

    return;
  }

  /*
    Open the tab immediately while the click
    is still considered a direct user action.
    This prevents popup blockers from stopping it.
  */

  const previewWindow =
    window.open(
      "",
      "_blank"
    );

  if (
    previewWindow
  ) {
    previewWindow.opener =
      null;

    previewWindow.document.title =
      "Opening presentation…";

    previewWindow.document.body.innerHTML = `
      <p
        style="
          font-family: Georgia, serif;
          padding: 40px;
          color: #681116;
        "
      >
        Opening presentation…
      </p>
    `;
  }

  try {
    const sharedLink =
      await getDropboxSharedLink(
        item.file
      );

    if (
      previewWindow
    ) {
      previewWindow.location.href =
        sharedLink;
    } else {
      window.location.href =
        sharedLink;
    }

  } catch (
    error
  ) {
    console.error(
      "Could not open Dropbox preview:",
      error
    );

    const fallbackUrl =
      getDropboxFileUrl(
        item.file
      );

    if (
      previewWindow
    ) {
      previewWindow.location.href =
        fallbackUrl;
    } else {
      window.location.href =
        fallbackUrl;
    }
  }
}


/* =========================================================
   STANDARD QUICK VIEW
========================================================= */

function openQuickView(
  item
) {
  const modal =
    document.getElementById(
      "quickViewModal"
    );

  modal
    .querySelector(
      ".quick-view-window"
    )
    .classList.remove(
      "blurb-view"
    );

  document.getElementById(
    "quickViewCategory"
  ).textContent =
    item.label ||
    "Archive";

  document.getElementById(
    "quickViewTitle"
  ).textContent =
    item.title ||
    "";

  document.getElementById(
    "quickViewAuthor"
  ).textContent =
    item.author ||
    "";

  document.getElementById(
    "quickViewYear"
  ).textContent =
    item.year ||
    "";

  document.getElementById(
    "quickViewDescription"
  ).textContent =
    item.description ||
    "";

  const imageContainer =
    document.getElementById(
      "quickViewImageContainer"
    );

  const image =
    document.getElementById(
      "quickViewImage"
    );

  if (
    item.quickViewImage
  ) {
    image.src =
      getDropboxFileUrl(
        item.quickViewImage
      );

    image.alt =
      item.title ||
      "";

    imageContainer.classList.add(
      "visible"
    );
  } else {
    clearQuickViewImage();
  }

  const actions =
    document.getElementById(
      "quickViewActions"
    );

  actions.innerHTML =
    "";

  if (
    item.url
  ) {
    const link =
      document.createElement(
        "a"
      );

    link.href =
      item.url;

    link.target =
      "_blank";

    link.rel =
      "noopener";

    link.className =
      "primary-button";

    link.textContent =
      "Visit Link ↗";

    actions.appendChild(
      link
    );
  } else if (
    item.file
  ) {
    const link =
      document.createElement(
        "a"
      );

    link.href =
      getDropboxFileUrl(
        item.file
      );

    link.target =
      "_blank";

    link.rel =
      "noopener";

    link.className =
      "primary-button";

    link.textContent =
      "Open File ↗";

    actions.appendChild(
      link
    );
  }

  openModal(
    modal
  );
}


/* =========================================================
   CLEAR QUICK VIEW IMAGE
========================================================= */

function clearQuickViewImage() {
  const container =
    document.getElementById(
      "quickViewImageContainer"
    );

  const image =
    document.getElementById(
      "quickViewImage"
    );

  image.src =
    "";

  image.alt =
    "";

  container.classList.remove(
    "visible"
  );
}


/* =========================================================
   MODAL HELPERS
========================================================= */

function openModal(
  modal
) {
  modal.classList.add(
    "is-open"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}


function hideModal(
  modal
) {
  modal.classList.remove(
    "is-open"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================================
   RESTORE COLLECTION
========================================================= */

function restoreContext(
  context
) {
  if (
    !context
  ) {
    document.body.style.overflow =
      "";

    return;
  }

  if (
    context.type ===
    "articleCollection"
  ) {
    openArticleCollection(
      context.item
    );
  } else if (
    context.type ===
    "mediaGallery"
  ) {
    openMediaGallery(
      context.item
    );
  }
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeSingleModal(
  modal
) {
  hideModal(
    modal
  );

  if (
    modal.id ===
    "pdfModal"
  ) {
    document.getElementById(
      "pdfFrame"
    ).src =
      "";

    const context =
      pdfReturnContext;

    pdfReturnContext =
      null;

    restoreContext(
      context
    );

    return;
  }

  if (
    modal.id ===
    "imageModal"
  ) {
    const image =
      document.getElementById(
        "lightboxImage"
      );

    image.onclick =
      null;

    image.src =
      "";

    const context =
      imageReturnContext;

    imageReturnContext =
      null;

    restoreContext(
      context
    );

    return;
  }

  document.body.style.overflow =
    "";
}


/* =========================================================
   CLOSE CONTROLS
========================================================= */

document
  .querySelectorAll(
    "[data-close-modal]"
  )
  .forEach(
    element => {
      element.addEventListener(
        "click",
        event => {
          const modal =
            event.currentTarget.closest(
              ".modal"
            );

          if (
            modal
          ) {
            closeSingleModal(
              modal
            );
          }
        }
      );
    }
  );


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
      "Escape"
    ) {
      const openModalElement =
        document.querySelector(
          ".modal.is-open"
        );

      if (
        openModalElement
      ) {
        closeSingleModal(
          openModalElement
        );
      }

      return;
    }

    const imageModal =
      document.getElementById(
        "imageModal"
      );

    if (
      !imageModal.classList.contains(
        "is-open"
      )
    ) {
      return;
    }

    const previous =
      document.getElementById(
        "imageGalleryPrev"
      );

    const next =
      document.getElementById(
        "imageGalleryNext"
      );

    if (
      event.key ===
        "ArrowLeft" &&
      previous &&
      previous.style.display !==
        "none"
    ) {
      previous.click();
    }

    if (
      event.key ===
        "ArrowRight" &&
      next &&
      next.style.display !==
        "none"
    ) {
      next.click();
    }
  }
);


/* =========================================================
   START
========================================================= */

loadArchiveFromDropbox();