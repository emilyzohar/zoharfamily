/* =========================================================
   DROPBOX ARCHIVE SETTINGS
========================================================= */

const DROPBOX_API_BASE =
  "https://family-photo-api.emilyzohar.workers.dev";

const DROPBOX_WORKS_ROOT =
  "/Zohar Family/Works";


/* =========================================================
   CURRENT PERSON

   Examples:

   archive.html
   → Sabba

   archive.html?person=Emily
   → Emily

   archive.html?person=Eyal
   → Eyal
========================================================= */

const archiveParameters =
  new URLSearchParams(
    window.location.search
  );

const requestedPersonParameter =
  archiveParameters
    .get("person")
    ?.trim()
  ||
  "Sabba";


/*
  Limit the parameter to one folder name so it cannot
  navigate outside /Zohar Family/Works.
*/

const requestedPerson =
  requestedPersonParameter
    .replace(
      /[\\/]+/g,
      ""
    )
    .trim()
  ||
  "Sabba";


const DROPBOX_ARCHIVE_ROOT =
  `${DROPBOX_WORKS_ROOT}/${requestedPerson}`;


/* =========================================================
   PAGE TITLE
========================================================= */

function getPossessiveName(
  name
) {
  return /s$/i.test(
    name
  )
    ? `${name}'`
    : `${name}'s`;
}


const archivePageTitle =
  `${getPossessiveName(
    requestedPerson
  )} Works`;


document.title =
  `${archivePageTitle} | Zohar Family`;


function updateArchivePageTitle() {
  const titleElement =
    document.getElementById(
      "archive-page-title"
    )
    ||
    document.querySelector(
      ".archive-page-title"
    );

  if (
    titleElement
  ) {
    titleElement.textContent =
      archivePageTitle;
  }
}


/* =========================================================
   ARCHIVE BACKGROUND
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


applyArchiveBackground();


/* =========================================================
   SUPPORTED FILE TYPES
========================================================= */

const IMAGE_EXTENSIONS =
  new Set([
    "avif",
    "bmp",
    "gif",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "webp"
  ]);


const PDF_EXTENSIONS =
  new Set([
    "pdf"
  ]);


const POWERPOINT_EXTENSIONS =
  new Set([
    "ppt",
    "pptx"
  ]);


const DOCUMENT_EXTENSIONS =
  new Set([
    "doc",
    "docx",
    "odt",
    "rtf",
    "txt"
  ]);


/* =========================================================
   PERSON-SPECIFIC ARCHIVE OVERRIDES

   Keys inside each person are relative to that person's
   Works folder.

   Example:

   Dropbox:
   /Zohar Family/Works/Sabba/poems/alon.avif

   Override:
   "poems/alon.avif"

   A website link can also be customized here, although a
   .txt file containing only a URL is detected automatically.
========================================================= */

const ARCHIVE_OVERRIDES = {

  Sabba: {

    "poems/safta.avif": {
      title:
        "Poems for Safta",

      order:
        1
    },

    "poems/sabba.avif": {
      title:
        "Poem for Myself",

      order:
        2
    },

    "poems/yal.avif": {
      title:
        "Poem for Eyal",

      order:
        3
    },

    "poems/alon.avif": {
      title:
        "Poems for Alon",

      order:
        4
    },

    "poems/sharon.avif": {
      title:
        "Poem for Sharon",

      order:
        5
    },

    "poems/erin.avif": {
      title:
        "Poems for Erin",

      order:
        6
    },

    "poems/ethan.avif": {
      title:
        "Poems for Ethan",

      order:
        7
    },

    "poems/emily.avif": {
      title:
        "Poem for Emily",

      order:
        8
    },

    "poems/zachary.avif": {
      title:
        "Poem for Zach",

      order:
        9
    },

    "poems/jacklyn.avif": {
      title:
        "Poem for Jacklyn",

      order:
        10
    },

    "poems/jaime.avif": {
      title:
        "Poem for Jaime",

      order:
        11
    },

    "poems/alexandra.avif": {
      title:
        "Poems for Alexandra",

      order:
        12
    },

    "poems/ema.avif": {
      title:
        "Poem for Ema",

      order:
        13
    },

    "poems/abba.avif": {
      title:
        "Poem for Abba",

      order:
        14
    },

    "poems/sister.avif": {
      title:
        "Poem for Sister",

      order:
        15
    },

    "poems/hebrew.avif": {
      title:
        "Poems in Hebrew",

      order:
        16
    },

    "poems/coby.avif": {
      title:
        "Poem for Coby",

      order:
        17
    },

    "poems/friend.avif": {
      title:
        "Poem for a Friend",

      order:
        18
    },

    "poems/rotem.avif": {
      title:
        "Poem for Rotem",

      order:
        19
    },

    "poems/other.avif": {
      title:
        "Other Poems",

      order:
        20
    }


    /*
      WEBSITE OVERRIDE EXAMPLE

      Dropbox:

      /Zohar Family/Works/Sabba/Websites/substack.txt
      /Zohar Family/Works/Sabba/Websites/substack.png

      The TXT should contain only:

      https://example.substack.com

      The matching PNG becomes the card preview.

      "websites/substack.txt": {
        title:
          "My Substack",

        label:
          "Website",

        description:
          "Essays and writing.",

        order:
          1
      }
    */

  },


  Emily: {

  },


  Eyal: {

  },


  Alon: {

  },


  Sharon: {

  }

};


/* =========================================================
   CATEGORY SETTINGS
========================================================= */

const CATEGORY_SETTINGS = {

  poems: {
    title:
      "Poems",

    label:
      "Poem",

    order:
      1
  },

  books: {
    title:
      "Books",

    label:
      "Book",

    order:
      2
  },

  articles: {
    title:
      "Articles",

    label:
      "Article",

    order:
      3
  },

  lectures: {
    title:
      "Lectures",

    label:
      "Lecture",

    order:
      4
  },

  pictures: {
    title:
      "Pictures",

    label:
      "Photograph",

    order:
      5
  },

  websites: {
    title:
      "Websites",

    label:
      "Website",

    order:
      6
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
  const root =
    trimSlashes(
      DROPBOX_ARCHIVE_ROOT
    );

  const path =
    trimSlashes(
      fullPath
    );

  if (
    path
      .toLowerCase()
      .startsWith(
        root.toLowerCase()
      )
  ) {
    return path
      .slice(
        root.length
      )
      .replace(
        /^\/+/,
        ""
      );
  }

  return path;
}


function getFilename(
  path
) {
  return normalisePath(
    path
  )
    .split("/")
    .pop()
  ||
  "";
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


function getNumericOrder(
  value
) {
  const numericValue =
    Number(
      value
    );

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : 9999;
}


/* =========================================================
   CURRENT PERSON OVERRIDES
========================================================= */

function getCurrentPersonOverrides() {
  const personKey =
    Object.keys(
      ARCHIVE_OVERRIDES
    )
      .find(
        key =>
          key.toLowerCase() ===
          requestedPerson.toLowerCase()
      );

  return personKey
    ? ARCHIVE_OVERRIDES[
        personKey
      ]
    : {};
}


/* =========================================================
   DROPBOX API URL
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
          value !== undefined
          &&
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


/* =========================================================
   FETCH DROPBOX TEXT FILE
========================================================= */

async function fetchDropboxText(
  path
) {
  const response =
    await fetch(
      buildDropboxApiUrl(
        "/text",
        {
          path
        }
      ),
      {
        method:
          "GET",

        headers: {
          Accept:
            "text/plain"
        }
      }
    );

  if (
    !response.ok
  ) {
    const errorText =
      await response.text();

    throw new Error(
      `Could not load ${path}. HTTP ${response.status}. ${errorText}`
    );
  }

  return response.text();
}


/* =========================================================
   FETCH ENTIRE ARCHIVE IN ONE REQUEST
========================================================= */

async function fetchAllArchiveEntries() {
  const response =
    await fetch(
      buildDropboxApiUrl(
        "/folder",
        {
          path:
            DROPBOX_ARCHIVE_ROOT,

          recursive:
            "true"
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
      `Could not load ${DROPBOX_ARCHIVE_ROOT}. HTTP ${response.status}. ${errorText}`
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
      "The Dropbox archive endpoint did not return an array."
    );
  }

  return entries;
}


/* =========================================================
   FOLDER TREE HELPERS
========================================================= */

function getEntryPath(
  entry
) {
  return normalisePath(
    entry.displayPath
    ||
    entry.path
    ||
    ""
  );
}


function normalizePathKey(
  path
) {
  return normalisePath(
    path
  )
    .replace(
      /\/+$/,
      ""
    )
    .toLowerCase();
}


function getParentPath(
  path
) {
  const cleanPath =
    normalisePath(
      path
    )
      .replace(
        /\/+$/,
        ""
      );

  const lastSlash =
    cleanPath.lastIndexOf(
      "/"
    );

  if (
    lastSlash <= 0
  ) {
    return "";
  }

  return cleanPath.slice(
    0,
    lastSlash
  );
}


function getPathDepth(
  path
) {
  return trimSlashes(
    path
  )
    .split("/")
    .filter(
      Boolean
    )
    .length;
}


/* =========================================================
   BUILD FOLDER TREE
========================================================= */

function buildArchiveFolderTree(
  entries
) {
  const root = {
    name:
      getFilename(
        DROPBOX_ARCHIVE_ROOT
      ),

    path:
      DROPBOX_ARCHIVE_ROOT,

    files:
      [],

    folders:
      []
  };

  const folderMap =
    new Map();

  folderMap.set(
    normalizePathKey(
      DROPBOX_ARCHIVE_ROOT
    ),
    root
  );


  entries
    .filter(
      entry =>
        String(
          entry.type ?? ""
        )
          .toLowerCase() ===
        "folder"
    )
    .sort(
      (
        entryA,
        entryB
      ) =>
        getPathDepth(
          getEntryPath(
            entryA
          )
        )
        -
        getPathDepth(
          getEntryPath(
            entryB
          )
        )
    )
    .forEach(
      entry => {
        const path =
          getEntryPath(
            entry
          );

        if (
          path
        ) {
          ensureFolderNode(
            path,
            folderMap,
            root
          );
        }
      }
    );


  entries
    .filter(
      entry =>
        String(
          entry.type ?? ""
        )
          .toLowerCase() ===
        "file"
    )
    .forEach(
      entry => {
        const filePath =
          getEntryPath(
            entry
          );

        if (
          !filePath
        ) {
          return;
        }

        const parentFolder =
          ensureFolderNode(
            getParentPath(
              filePath
            ),
            folderMap,
            root
          );

        parentFolder.files.push({
          type:
            "file",

          name:
            entry.name
            ||
            getFilename(
              filePath
            ),

          path:
            filePath,

          size:
            entry.size
            ??
            null,

          websiteUrl:
            ""
        });
      }
    );


  sortFolderTree(
    root
  );

  return root;
}


/* =========================================================
   ENSURE FOLDER NODE
========================================================= */

function ensureFolderNode(
  folderPath,
  folderMap,
  root
) {
  const cleanPath =
    normalisePath(
      folderPath
    )
      .replace(
        /\/+$/,
        ""
      );

  const key =
    normalizePathKey(
      cleanPath
    );

  if (
    !cleanPath
    ||
    key ===
      normalizePathKey(
        DROPBOX_ARCHIVE_ROOT
      )
  ) {
    return root;
  }

  if (
    folderMap.has(
      key
    )
  ) {
    return folderMap.get(
      key
    );
  }

  const parentFolder =
    ensureFolderNode(
      getParentPath(
        cleanPath
      ),
      folderMap,
      root
    );

  const folder = {
    name:
      getFilename(
        cleanPath
      ),

    path:
      cleanPath,

    files:
      [],

    folders:
      []
  };

  parentFolder.folders.push(
    folder
  );

  folderMap.set(
    key,
    folder
  );

  return folder;
}


/* =========================================================
   SORT FOLDER TREE
========================================================= */

function sortFolderTree(
  folder
) {
  folder.files.sort(
    (
      fileA,
      fileB
    ) =>
      compareNaturally(
        fileA.name,
        fileB.name
      )
  );

  folder.folders.sort(
    (
      folderA,
      folderB
    ) =>
      compareNaturally(
        folderA.name,
        folderB.name
      )
  );

  folder.folders.forEach(
    sortFolderTree
  );
}


/* =========================================================
   WEBSITE URL DETECTION
========================================================= */

function getWebsiteUrlFromText(
  text
) {
  const cleanText =
    String(
      text ?? ""
    )
      .trim();

  if (
    !/^https?:\/\/\S+$/i.test(
      cleanText
    )
  ) {
    return "";
  }

  try {
    const parsedUrl =
      new URL(
        cleanText
      );

    if (
      parsedUrl.protocol !==
        "http:"
      &&
      parsedUrl.protocol !==
        "https:"
    ) {
      return "";
    }

    return parsedUrl.toString();

  } catch (
    error
  ) {
    return "";
  }
}


/* =========================================================
   IDENTIFY TXT WEBSITE FILES

   A .txt file becomes a website item when its entire
   contents consist of one HTTP or HTTPS address.
========================================================= */

async function identifyWebsiteLinkFiles(
  rootFolder
) {
  const textFiles =
    [];


  function collectTextFiles(
    folder
  ) {
    folder.files.forEach(
      file => {
        if (
          getExtension(
            file.name
          ) ===
          "txt"
        ) {
          textFiles.push(
            file
          );
        }
      }
    );

    folder.folders.forEach(
      collectTextFiles
    );
  }


  collectTextFiles(
    rootFolder
  );


  const results =
    await Promise.allSettled(
      textFiles.map(
        async file => {
          const text =
            await fetchDropboxText(
              file.path
            );

          return {
            file,

            websiteUrl:
              getWebsiteUrlFromText(
                text
              )
          };
        }
      )
    );


  results.forEach(
    result => {
      if (
        result.status !==
        "fulfilled"
      ) {
        console.warn(
          "Could not inspect archive text file:",
          result.reason
        );

        return;
      }

      if (
        result.value.websiteUrl
      ) {
        result.value.file.websiteUrl =
          result.value.websiteUrl;
      }
    }
  );
}


/* =========================================================
   FILE CLASSIFICATION
========================================================= */

function classifyFile(
  file
) {
  if (
    file.websiteUrl
  ) {
    return "link";
  }

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
   NUMBERED-FILE GROUPING
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
   OVERRIDE LOOKUP
========================================================= */

function getArchiveOverride(
  fullPath
) {
  const overrides =
    getCurrentPersonOverrides();

  const relativePath =
    getRelativeArchivePath(
      fullPath
    );

  if (
    overrides[
      relativePath
    ]
  ) {
    return overrides[
      relativePath
    ];
  }

  const matchingKey =
    Object.keys(
      overrides
    )
      .find(
        key =>
          key.toLowerCase() ===
          relativePath.toLowerCase()
      );

  return matchingKey
    ? overrides[
        matchingKey
      ]
    : {};
}


/* =========================================================
   RESOLVE OVERRIDE DROPBOX PATH
========================================================= */

function resolveOverrideDropboxPath(
  path
) {
  const cleanPath =
    String(
      path ?? ""
    )
      .trim();

  if (
    !cleanPath
  ) {
    return "";
  }

  if (
    cleanPath.startsWith("/")
  ) {
    return normalisePath(
      cleanPath
    );
  }

  return joinDropboxPath(
    DROPBOX_ARCHIVE_ROOT,
    cleanPath
  );
}


/* =========================================================
   CREATE ONE ARCHIVE ITEM
========================================================= */

function createItemFromFile(
  file,
  categoryLabel
) {
  const classifiedType =
    classifyFile(
      file
    );

  const override =
    getArchiveOverride(
      file.path
    );

  return {
    title:
      override.title
      ||
      titleFromFilename(
        file.name
      ),

    author:
      override.author
      ||
      "",

    year:
      override.year
      ||
      "",

    description:
      override.description
      ||
      "",

    url:
      override.url
      ||
      file.websiteUrl
      ||
      "",

    order:
      getNumericOrder(
        override.order
      ),

    type:
      override.type
      ||
      classifiedType,

    file:
      file.path,

    image:
      override.image
        ? resolveOverrideDropboxPath(
            override.image
          )
        : (
            classifiedType ===
              "image"
              ? file.path
              : ""
          ),

    quickViewImage:
      override.quickViewImage
        ? resolveOverrideDropboxPath(
            override.quickViewImage
          )
        : "",

    label:
      override.label
      ||
      (
        classifiedType ===
          "link"
          ? "Website"
          : categoryLabel
      )
      ||
      "Archive",

    sourcePath:
      file.path
  };
}


/* =========================================================
   FIND UNNUMBERED BASE IMAGE
========================================================= */

function findBaseImageEntry(
  imageFiles
) {
  return (
    imageFiles.find(
      entry =>
        !/\d+$/.test(
          removeExtension(
            entry.file.name
          )
        )
    )
    ||
    imageFiles[0]
  );
}


/* =========================================================
   COMBINE RELATED FILES
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
        )
        ||
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
        Multiple images only:
        create a gallery.
      */

      if (
        imageFiles.length > 1
        &&
        nonImageFiles.length === 0
      ) {
        const baseImageEntry =
          findBaseImageEntry(
            imageFiles
          );

        const override =
          getArchiveOverride(
            baseImageEntry.file.path
          );

        items.push({
          title:
            override.title
            ||
            displayTitle,

          order:
            getNumericOrder(
              override.order
            ),

          type:
            "imageGallery",

          image:
            override.image
              ? resolveOverrideDropboxPath(
                  override.image
                )
              : baseImageEntry.file.path,

          file:
            imageFiles.map(
              entry =>
                entry.file.path
            ),

          label:
            override.label
            ||
            categoryLabel
            ||
            "Images",

          year:
            override.year
            ||
            "",

          description:
            override.description
            ||
            ""
        });

        return;
      }


      /*
        One non-image file plus one or more matching images.

        Examples:

        book.pdf + book.png
        substack.txt + substack.png

        The matching image becomes the card preview.
      */

      if (
        nonImageFiles.length === 1
        &&
        imageFiles.length >= 1
      ) {
        const item =
          createItemFromFile(
            nonImageFiles[0].file,
            categoryLabel
          );

        const baseImageEntry =
          findBaseImageEntry(
            imageFiles
          );

        if (
          !item.image
        ) {
          item.image =
            baseImageEntry.file.path;
        }

        if (
          item.type ===
            "link"
          &&
          !item.quickViewImage
        ) {
          item.quickViewImage =
            item.image;
        }

        items.push(
          item
        );

        return;
      }


      /*
        Images mixed with several non-image files:
        create a collection.
      */

      if (
        imageFiles.length >= 1
        &&
        nonImageFiles.length >= 1
      ) {
        const baseImageEntry =
          findBaseImageEntry(
            imageFiles
          );

        const override =
          getArchiveOverride(
            baseImageEntry.file.path
          );

        items.push({
          title:
            override.title
            ||
            displayTitle,

          order:
            getNumericOrder(
              override.order
            ),

          type:
            "mediaGallery",

          image:
            override.image
              ? resolveOverrideDropboxPath(
                  override.image
                )
              : baseImageEntry.file.path,

          file:
            typedFiles.map(
              entry => {
                const itemOverride =
                  getArchiveOverride(
                    entry.file.path
                  );

                return {
                  title:
                    itemOverride.title
                    ||
                    titleFromFilename(
                      entry.file.name
                    ),

                  type:
                    itemOverride.type
                    ||
                    entry.type,

                  file:
                    entry.file.path,

                  url:
                    itemOverride.url
                    ||
                    entry.file.websiteUrl
                    ||
                    "",

                  description:
                    itemOverride.description
                    ||
                    ""
                };
              }
            ),

          label:
            override.label
            ||
            categoryLabel
            ||
            "Collection",

          year:
            override.year
            ||
            "",

          description:
            override.description
            ||
            ""
        });

        return;
      }


      /*
        Otherwise, create one card per file.
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
    ) => {
      const orderA =
        getNumericOrder(
          itemA.order
        );

      const orderB =
        getNumericOrder(
          itemB.order
        );

      if (
        orderA !==
        orderB
      ) {
        return orderA - orderB;
      }

      return compareNaturally(
        itemA.title,
        itemB.title
      );
    }
  );
}


/* =========================================================
   DISPLAYABLE FILES
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
        lowerName.startsWith(
          "."
        )
      ) {
        return false;
      }

      if (
        lowerName ===
        "file.png"
      ) {
        return false;
      }

      return true;
    }
  );
}


/* =========================================================
   FLATTEN FOLDER FILES
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
   BUILD ONE CATEGORY
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
    ]
    ||
    {};

  const sectionTitle =
    settings.title
    ||
    titleFromFolder(
      categoryFolder.name
    );

  const categoryLabel =
    settings.label
    ||
    sectionTitle.replace(
      /s$/i,
      ""
    );

  const directFiles =
    getDisplayableFiles(
      categoryFolder
    );


  if (
    categoryFolder.folders.length === 0
  ) {
    return {
      section:
        sectionTitle,

      order:
        getNumericOrder(
          settings.order
        ),

      items:
        combineRelatedFiles(
          directFiles,
          categoryLabel
        )
    };
  }


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

    order:
      getNumericOrder(
        settings.order
      ),

    groups:
      groups.filter(
        group =>
          group.items.length > 0
      )
  };
}


/* =========================================================
   BUILD ARCHIVE DATA
========================================================= */

function buildArchiveData(
  rootTree
) {
  const categories =
    rootTree.folders
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


  categories.sort(
    (
      categoryA,
      categoryB
    ) => {
      const orderA =
        getNumericOrder(
          categoryA.order
        );

      const orderB =
        getNumericOrder(
          categoryB.order
        );

      if (
        orderA !==
        orderB
      ) {
        return orderA - orderB;
      }

      return compareNaturally(
        categoryA.section,
        categoryB.section
      );
    }
  );


  return categories;
}


/* =========================================================
   LOADING / EMPTY / ERROR STATES
========================================================= */

function showArchiveLoading() {
  if (
    archiveTabs
  ) {
    archiveTabs.innerHTML =
      "";
  }

  if (
    archiveStageContent
  ) {
    archiveStageContent.innerHTML = `
      <div class="archive-loading">
        Loading ${escapeHtml(
          archivePageTitle
        )}…
      </div>
    `;
  }
}


function showArchiveEmpty() {
  if (
    archiveTabs
  ) {
    archiveTabs.innerHTML =
      "";
  }

  if (
    archiveStageContent
  ) {
    archiveStageContent.innerHTML = `
      <div class="archive-loading archive-empty">

        <h2>
          No works have been added yet
        </h2>

        <p>
          There are currently no works available in
          ${escapeHtml(
            archivePageTitle
          )}.
        </p>

        <a
          class="archive-empty-link"
          href="index.html"
        >
          Return to the family tree
        </a>

      </div>
    `;
  }
}


function showArchiveNotFound() {
  if (
    archiveTabs
  ) {
    archiveTabs.innerHTML =
      "";
  }

  if (
    archiveStageContent
  ) {
    archiveStageContent.innerHTML = `
      <div class="archive-loading archive-error">

        <h2>
          Archive not found
        </h2>

        <p>
          No Works folder was found for
          ${escapeHtml(
            requestedPerson
          )}.
        </p>

        <a
          class="archive-empty-link"
          href="index.html"
        >
          Return to the family tree
        </a>

      </div>
    `;
  }
}


function showArchiveError(
  message
) {
  if (
    archiveTabs
  ) {
    archiveTabs.innerHTML =
      "";
  }

  if (
    archiveStageContent
  ) {
    archiveStageContent.innerHTML = `
      <div class="archive-loading archive-error">

        <h2>
          ${escapeHtml(
            archivePageTitle
          )} could not be loaded
        </h2>

        <p>
          ${escapeHtml(
            message
          )}
        </p>

      </div>
    `;
  }
}


/* =========================================================
   LOAD ARCHIVE
========================================================= */

async function loadArchiveFromDropbox() {
  applyArchiveBackground();

  showArchiveLoading();

  try {
    const entries =
      await fetchAllArchiveEntries();

    const rootTree =
      buildArchiveFolderTree(
        entries
      );


    /*
      Detect .txt files containing only a website URL.
    */

    await identifyWebsiteLinkFiles(
      rootTree
    );


    ARCHIVE_DATA =
      buildArchiveData(
        rootTree
      );


    if (
      ARCHIVE_DATA.length === 0
    ) {
      showArchiveEmpty();

      return;
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

    const message =
      String(
        error?.message
        ||
        ""
      );

    if (
      message.includes(
        "HTTP 409"
      )
    ) {
      showArchiveNotFound();

      return;
    }

    showArchiveError(
      message
      ||
      "An unknown error occurred."
    );
  }
}


/* =========================================================
   CATEGORY TABS
========================================================= */

function buildArchiveTabs() {
  if (
    !archiveTabs
  ) {
    return;
  }

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
    ||
    !archiveStageContent
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
   CAROUSEL
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

    return card
      ? card.offsetWidth + 25
      : 400;
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
   ITEM URL HELPERS
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
   CARD PREVIEW HTML

   Website preview priority:

   1. Matching screenshot image.
   2. Live iframe when no screenshot exists.
========================================================= */

function getCardPreviewHtml(
  item
) {
  const thumbnailUrl =
    getItemThumbnailUrl(
      item
    );


  if (
    item.type ===
      "link"
    &&
    thumbnailUrl
  ) {
    return `
      <div
        class="card-thumbnail-wrap website-screenshot-wrap"
      >
        <img
          class="card-thumbnail website-screenshot"
          src="${escapeHtml(
            thumbnailUrl
          )}"
          alt="Preview of ${escapeHtml(
            item.title
            ||
            "website"
          )}"
          loading="lazy"
          decoding="async"
        >
      </div>
    `;
  }


  if (
    item.type ===
      "link"
    &&
    item.url
  ) {
    return `
      <div
        class="card-thumbnail-wrap website-preview-wrap"
        aria-hidden="true"
      >
        <iframe
          class="website-live-preview"
          src="${escapeHtml(
            item.url
          )}"
          title=""
          loading="lazy"
          tabindex="-1"
        ></iframe>

        <div class="website-preview-fallback">
          Website
        </div>
      </div>
    `;
  }


  if (
    thumbnailUrl
  ) {
    return `
      <div class="card-thumbnail-wrap">
        <img
          class="card-thumbnail"
          src="${escapeHtml(
            thumbnailUrl
          )}"
          alt="${escapeHtml(
            item.title
            ||
            ""
          )}"
          loading="lazy"
          decoding="async"
        >
      </div>
    `;
  }


  return "";
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

  card.setAttribute(
    "role",
    "button"
  );

  card.tabIndex =
    0;


  const content =
    document.createElement(
      "div"
    );

  content.className =
    "archive-card-content";


  content.innerHTML = `
    <span class="item-type">
      ${escapeHtml(
        item.label
        ||
        "Archive"
      )}
    </span>

    <div class="item-main-row">

      <div class="item-main-text">

        <h3 class="item-title">
          ${escapeHtml(
            item.title
            ||
            ""
          )}
        </h3>

        ${
          item.author
            ? `
              <p class="item-author">
                ${escapeHtml(
                  item.author
                )}
              </p>
            `
            : ""
        }

      </div>

      ${getCardPreviewHtml(
        item
      )}

    </div>

    <div class="item-footer">

      <span class="item-meta">
        ${escapeHtml(
          item.year
          ||
          ""
        )}
      </span>

      <span class="item-action">
        ${escapeHtml(
          getActionText(
            item.type
          )
        )}
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


  card.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
          "Enter"
        ||
        event.key ===
          " "
      ) {
        event.preventDefault();

        handleItem(
          item
        );
      }
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
        item.title
        ||
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
      return "Visit website ↗";

    default:
      return "View →";
  }
}


/* =========================================================
   HANDLE CARD CLICK
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

    case "link":
      if (
        item.url
      ) {
        window.open(
          item.url,
          "_blank",
          "noopener"
        );
      }

      return;

    default:
      openQuickView(
        item
      );
  }
}


/* =========================================================
   OPEN DROPBOX FILE
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

  if (
    !modal
  ) {
    return;
  }


  modal
    .querySelector(
      ".quick-view-window"
    )
    ?.classList.add(
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

  if (
    !modal
  ) {
    return;
  }


  modal
    .querySelector(
      ".quick-view-window"
    )
    ?.classList.remove(
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

                  item
                }
              );

            } else if (
              article.type ===
              "link"
              &&
              article.url
            ) {
              window.open(
                article.url,
                "_blank",
                "noopener"
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
   MEDIA GALLERY
========================================================= */

function openMediaGallery(
  item
) {
  const modal =
    document.getElementById(
      "quickViewModal"
    );

  if (
    !modal
  ) {
    return;
  }


  modal
    .querySelector(
      ".quick-view-window"
    )
    ?.classList.remove(
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

            } else if (
              media.type ===
              "link"
              &&
              media.url
            ) {
              window.open(
                media.url,
                "_blank",
                "noopener"
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
      "button"
    );

  row.type =
    "button";

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
    item.title
    ||
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
    item.label
    ||
    "Collection";


  document.getElementById(
    "quickViewTitle"
  ).textContent =
    item.title
    ||
    "";


  document.getElementById(
    "quickViewAuthor"
  ).textContent =
    "";


  document.getElementById(
    "quickViewYear"
  ).textContent =
    item.year
    ||
    "";


  document.getElementById(
    "quickViewDescription"
  ).textContent =
    item.description
    ||
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

  if (
    !modal
  ) {
    return;
  }


  const windowElement =
    modal.querySelector(
      ".image-modal-window"
    );


  const image =
    document.getElementById(
      "lightboxImage"
    );

    let loader =
  windowElement.querySelector(
    ".image-gallery-loader"
  );


if (
  !loader
) {
  loader =
    document.createElement(
      "div"
    );

  loader.className =
    "image-gallery-loader";

  loader.setAttribute(
    "aria-hidden",
    "true"
  );

  windowElement.appendChild(
    loader
  );
}


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

  /*
    Show loading state immediately.
  */

  loader.classList.add(
    "is-loading"
  );

  image.classList.add(
    "is-loading"
  );


  /*
    Hide loader once the new image
    has successfully loaded.
  */

  image.onload =
    () => {

      loader.classList.remove(
        "is-loading"
      );

      image.classList.remove(
        "is-loading"
      );

    };


  /*
    Also remove loading state if
    the image fails to load.
  */

  image.onerror =
    () => {

      loader.classList.remove(
        "is-loading"
      );

      image.classList.remove(
        "is-loading"
      );

    };


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
    item.title
    ||
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
          currentIndex
          -
          1
          +
          files.length
        )
        %
        files.length;

      showImage();
    };


  next.onclick =
    event => {
      event.stopPropagation();

      currentIndex =
        (
          currentIndex
          +
          1
        )
        %
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

  if (
    !modal
  ) {
    return;
  }


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
      item.file
      ||
      item.image
    );


  image.alt =
    item.title
    ||
    "";


  document.getElementById(
    "lightboxTitle"
  ).textContent =
    item.title
    ||
    "";


  document.getElementById(
    "lightboxDescription"
  ).textContent =
    item.description
    ||
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

  if (
    !modal
  ) {
    return;
  }


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
    item.title
    ||
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
   POWERPOINT SHARED LINK
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


/* =========================================================
   OPEN POWERPOINT
========================================================= */

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

  if (
    !modal
  ) {
    return;
  }


  modal
    .querySelector(
      ".quick-view-window"
    )
    ?.classList.remove(
      "blurb-view"
    );


  document.getElementById(
    "quickViewCategory"
  ).textContent =
    item.label
    ||
    "Archive";


  document.getElementById(
    "quickViewTitle"
  ).textContent =
    item.title
    ||
    "";


  document.getElementById(
    "quickViewAuthor"
  ).textContent =
    item.author
    ||
    "";


  document.getElementById(
    "quickViewYear"
  ).textContent =
    item.year
    ||
    "";


  document.getElementById(
    "quickViewDescription"
  ).textContent =
    item.description
    ||
    "";


  const imageContainer =
    document.getElementById(
      "quickViewImageContainer"
    );


  const image =
    document.getElementById(
      "quickViewImage"
    );


  const quickViewImagePath =
    item.quickViewImage
    ||
    item.image
    ||
    "";


  if (
    quickViewImagePath
  ) {
    image.src =
      getDropboxFileUrl(
        quickViewImagePath
      );

    image.alt =
      item.title
      ||
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


  if (
    image
  ) {
    image.src =
      "";

    image.alt =
      "";
  }


  if (
    container
  ) {
    container.classList.remove(
      "visible"
    );
  }
}


/* =========================================================
   MODAL HELPERS
========================================================= */

function openModal(
  modal
) {
  if (
    !modal
  ) {
    return;
  }

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
  if (
    !modal
  ) {
    return;
  }

  modal.classList.remove(
    "is-open"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================================
   RESTORE COLLECTION CONTEXT
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
    const frame =
      document.getElementById(
        "pdfFrame"
      );

    if (
      frame
    ) {
      frame.src =
        "";
    }


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


    if (
      image
    ) {
      image.onclick =
        null;

      image.src =
        "";
    }


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
   MODAL CLOSE CONTROLS
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
   KEYBOARD CONTROLS
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
      !imageModal
      ||
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
        "ArrowLeft"
      &&
      previous
      &&
      previous.style.display !==
        "none"
    ) {
      previous.click();
    }


    if (
      event.key ===
        "ArrowRight"
      &&
      next
      &&
      next.style.display !==
        "none"
    ) {
      next.click();
    }
  }
);


/* =========================================================
   INITIALISE
========================================================= */

updateArchivePageTitle();

loadArchiveFromDropbox();