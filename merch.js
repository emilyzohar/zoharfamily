/* =========================================================
   DROPBOX SETTINGS
========================================================= */

const DROPBOX_API_BASE =
  "https://family-photo-api.emilyzohar.workers.dev";


/* =========================================================
   PERSONAL PAGE CONTEXT
========================================================= */

function getPersonalPageContext(defaultSectionName) {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const cleanFolderPart = value =>
    String(value ?? "")
      .replace(/[\\/]+/g, "")
      .trim();

  const person =
    cleanFolderPart(
      parameters.get("person")
    );

  const section =
    cleanFolderPart(
      parameters.get("section")
    ) || defaultSectionName;

  const peek =
    parameters.get("peek") === "true";

  if (peek) {
    document.body.classList.add(
      "person-peek-mode"
    );
  }

  return {
    person,
    section,
    peek
  };
}


const merchPageContext =
  getPersonalPageContext(
    "Merch"
  );


const DROPBOX_MERCH_ROOT =
  merchPageContext.person
    ? `/Zohar Family/Works/${merchPageContext.person}/${merchPageContext.section}`
    : "/Zohar Family/Merch";


if (merchPageContext.person) {
  document.title =
    `${merchPageContext.person}'s Merch | Zohar Family`;
}


const MERCH_IMAGE_EXTENSIONS =
  new Set([
    "avif",
    "gif",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "webp"
  ]);


const RESERVED_ROOT_TEXT_FILES =
  new Set([
    "name.txt",
    "blurb.txt"
  ]);


/* =========================================================
   DOM
========================================================= */

const merchGrid =
  document.getElementById(
    "merch-grid"
  );

const merchStatus =
  document.getElementById(
    "merch-status"
  );

const quickView =
  document.getElementById(
    "quick-view"
  );

const quickViewImage =
  document.getElementById(
    "quick-view-image"
  );

const quickViewDots =
  document.getElementById(
    "quick-view-dots"
  );

const quickViewName =
  document.getElementById(
    "quick-view-name"
  );

const quickViewDescription =
  document.getElementById(
    "quick-view-description"
  );

const quickViewCreated =
  document.getElementById(
    "quick-view-created"
  );

const quickViewCreator =
  document.getElementById(
    "quick-view-creator"
  );

const quickViewOwner =
  document.getElementById(
    "quick-view-owner"
  );

const quickViewClose =
  document.getElementById(
    "quick-view-close"
  );

const quickViewItemPrev =
  document.getElementById(
    "quick-view-item-prev"
  );

const quickViewItemNext =
  document.getElementById(
    "quick-view-item-next"
  );

const createdRow =
  document.getElementById(
    "created-row"
  );

const creatorRow =
  document.getElementById(
    "creator-row"
  );

const ownerRow =
  document.getElementById(
    "owner-row"
  );

const quickViewLayout =
  quickView?.querySelector(
    ".quick-view-layout"
  );

const quickViewGallery =
  quickView?.querySelector(
    ".quick-view-gallery"
  );


/*
  Insert a subtitle element without requiring a merch.html change.
*/
let quickViewSubtitle =
  document.getElementById(
    "quick-view-subtitle"
  );

if (
  !quickViewSubtitle &&
  quickViewName
) {
  quickViewSubtitle =
    document.createElement(
      "p"
    );

  quickViewSubtitle.id =
    "quick-view-subtitle";

  quickViewSubtitle.className =
    "quick-view-subtitle";

  quickViewName.insertAdjacentElement(
    "afterend",
    quickViewSubtitle
  );
}


/* =========================================================
   MERCH-SPECIFIC STYLES

   These are injected here so this update only requires
   replacing merch.js.
========================================================= */

function installMerchTextStyles() {
  if (
    document.getElementById(
      "structured-merch-styles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "structured-merch-styles";

  style.textContent = `
    .merch-card.has-subtitle h2 {
      margin-bottom: 7px;
    }

    .merch-card-subtitle {
      margin:
        0
        20px
        27px;

      text-align: center;

      color: #756c69;

      font-size: 1rem;
      font-style: italic;
      line-height: 1.3;
    }

    .merch-card.no-image {
      min-height: 235px;

      display: flex;
      flex-direction: column;
      justify-content: center;

      padding-top: 30px;
    }

    .merch-card.no-image h2 {
      margin-top: 18px;
    }

    .quick-view-subtitle {
      margin:
        -14px
        0
        24px;

      color: #756c69;

      font-size: 1.25rem;
      font-style: italic;
      line-height: 1.35;
    }

    .quick-view-layout.no-image {
      display: block;
    }

    .quick-view-layout.no-image .quick-view-gallery {
      display: none;
    }

    .quick-view-layout.no-image .quick-view-info {
      max-width: 760px;
      margin: 0 auto;
    }

    .quick-view-layout.no-image .quick-view-description {
      white-space: pre-wrap;
    }
  `;

  document.head.appendChild(
    style
  );
}

installMerchTextStyles();


/* =========================================================
   STATE
========================================================= */

let activeQuickViewItem =
  null;

let activeQuickViewItemIndex =
  -1;

let activeQuickViewImageIndex =
  0;

let loadedMerchItems =
  [];

let lastFocusedElement =
  null;


/* =========================================================
   PATH HELPERS
========================================================= */

function normalizePath(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
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
  return normalizePath(
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


function getFilename(
  path
) {
  return normalizePath(
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
  return removeExtension(
    filename
  )
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
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\"": "&quot;",
          "'": "&#039;"
        };

        return entities[
          character
        ];
      }
    );
}


function escapeRegExp(
  value
) {
  return String(
    value ?? ""
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}


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


/* =========================================================
   DROPBOX URL HELPERS
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
  return buildDropboxApiUrl(
    "/file",
    {
      path
    }
  );
}


/* =========================================================
   FETCH MERCH
========================================================= */

async function fetchAllMerchEntries() {
  const response =
    await fetch(
      buildDropboxApiUrl(
        "/folder",
        {
          path:
            DROPBOX_MERCH_ROOT,

          recursive:
            "true"
        }
      ),
      {
        headers: {
          Accept:
            "application/json"
        }
      }
    );

  if (
    !response.ok
  ) {
    const details =
      await response.text();

    throw new Error(
      `Could not load merch. HTTP ${response.status}. ${details}`
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
      "The Dropbox Worker did not return a valid merch folder listing."
    );
  }

  return entries;
}


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
      )
    );

  if (
    !response.ok
  ) {
    const details =
      await response.text();

    throw new Error(
      `Could not load ${path}. HTTP ${response.status}. ${details}`
    );
  }

  return response.text();
}


/* =========================================================
   PERSON-SPECIFIC MERCH TITLE
========================================================= */

async function applyPersonalMerchTitle() {
  if (
    !merchPageContext.person
  ) {
    return;
  }

  const namePath =
    joinDropboxPath(
      DROPBOX_MERCH_ROOT,
      "name.txt"
    );

  try {
    const customName =
      String(
        await fetchDropboxText(
          namePath
        )
      )
        .replace(
          /\r\n?/g,
          "\n"
        )
        .split(
          "\n"
        )
        .map(
          line =>
            line.trim()
        )
        .filter(
          Boolean
        )
        .join(
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (
      !customName
    ) {
      return;
    }

    document.title =
      `${customName} | Zohar Family`;

    document
      .querySelectorAll(
        "#merch-title, .merch-title, [data-person-page-title]"
      )
      .forEach(
        element => {
          element.textContent =
            customName;
        }
      );

    if (
      window.parent &&
      window.parent !== window
    ) {
      window.parent.postMessage(
        {
          type:
            "person-page-title",

          section:
            "merch",

          person:
            merchPageContext.person,

          title:
            customName
        },

        window.location.origin
      );
    }

  } catch (
    error
  ) {
    console.info(
      `No personalized Merch name found at ${namePath}.`
    );
  }
}


/* =========================================================
   STRUCTURED TXT PARSING

   Supported example:

   Story: Road Trip
   Car: 1967 Mustang
   Description: Full story text...
========================================================= */

function parseMerchMetadata(
  text
) {
  const metadata = {};

  let currentKey =
    null;

  String(
    text ?? ""
  )
    .replace(
      /\r\n?/g,
      "\n"
    )
    .split("\n")
    .forEach(
      line => {
        const fieldMatch =
          line.match(
            /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/
          );

        if (
          fieldMatch
        ) {
          currentKey =
            fieldMatch[1]
              .toLowerCase();

          metadata[
            currentKey
          ] =
            fieldMatch[2].trim();

          return;
        }

        if (
          currentKey
        ) {
          const existing =
            metadata[
              currentKey
            ] || "";

          /*
            Preserve paragraph breaks in Description, while
            retaining the older one-line metadata behavior for
            other fields.
          */
          if (
            currentKey ===
            "description"
          ) {
            metadata[
              currentKey
            ] =
              `${existing}\n${line}`
                .replace(
                  /^\n/,
                  ""
                );
          } else if (
            line.trim()
          ) {
            metadata[
              currentKey
            ] =
              `${existing} ${line.trim()}`
                .trim();
          }
        }
      }
    );

  return metadata;
}


/* =========================================================
   ENTRY HELPERS
========================================================= */

function getEntryFullPath(
  entry
) {
  return normalizePath(
    entry?.displayPath ||
    entry?.path ||
    ""
  );
}


function getRelativeMerchPath(
  fullPath
) {
  const normalizedRoot =
    normalizePath(
      DROPBOX_MERCH_ROOT
    )
      .replace(
        /\/+$/,
        ""
      );

  const normalizedPath =
    normalizePath(
      fullPath
    );

  return normalizedPath
    .replace(
      new RegExp(
        `^${escapeRegExp(normalizedRoot)}/?`,
        "i"
      ),
      ""
    );
}


function getFileEntries(
  entries
) {
  return entries
    .filter(
      entry =>
        String(
          entry.type ?? ""
        )
          .toLowerCase() ===
        "file"
    )
    .map(
      entry => {
        const path =
          getEntryFullPath(
            entry
          );

        return {
          name:
            entry.name ||
            getFilename(
              path
            ),

          path,

          relativePath:
            getRelativeMerchPath(
              path
            )
        };
      }
    );
}


function getRootFiles(
  fileEntries
) {
  return fileEntries.filter(
    file =>
      !file.relativePath.includes(
        "/"
      )
  );
}


function getFolderFilesMap(
  fileEntries
) {
  const folders =
    new Map();

  fileEntries.forEach(
    file => {
      const slashIndex =
        file.relativePath.indexOf(
          "/"
        );

      if (
        slashIndex < 0
      ) {
        return;
      }

      const folderName =
        file.relativePath.slice(
          0,
          slashIndex
        );

      if (
        !folders.has(
          folderName
        )
      ) {
        folders.set(
          folderName,
          []
        );
      }

      folders
        .get(
          folderName
        )
        .push(
          file
        );
    }
  );

  return folders;
}


/* =========================================================
   IMAGE MATCHING
========================================================= */

function resolveMerchImagePath(
  imagePath,
  folderPath
) {
  const cleanPath =
    normalizePath(
      imagePath
    );

  if (
    !cleanPath
  ) {
    return "";
  }

  if (
    cleanPath.startsWith("/")
  ) {
    return cleanPath;
  }

  return joinDropboxPath(
    folderPath,
    cleanPath
  );
}


function getAutomaticImagesForText(
  textFile,
  candidateFiles,
  allowAllWhenOnlyText = false
) {
  const images =
    candidateFiles.filter(
      file =>
        MERCH_IMAGE_EXTENSIONS.has(
          getExtension(
            file.name
          )
        )
    );

  const textStem =
    getGroupingStem(
      textFile.name
    );

  const matchingImages =
    images
      .filter(
        imageFile =>
          getGroupingStem(
            imageFile.name
          ) ===
          textStem
      )
      .sort(
        (
          fileA,
          fileB
        ) =>
          compareNaturally(
            fileA.name,
            fileB.name
          )
      );

  if (
    matchingImages.length > 0
  ) {
    return matchingImages.map(
      file =>
        file.path
    );
  }

  if (
    allowAllWhenOnlyText
  ) {
    return images
      .sort(
        (
          fileA,
          fileB
        ) =>
          compareNaturally(
            fileA.name,
            fileB.name
          )
      )
      .map(
        file =>
          file.path
      );
  }

  return [];
}


/* =========================================================
   BUILD ITEM FROM ONE TXT FILE
========================================================= */

async function buildMerchItemFromText({
  textFile,
  siblingFiles,
  folderPath,
  allowAllImages = false
}) {
  const metadataText =
    await fetchDropboxText(
      textFile.path
    );

  const metadata =
    parseMerchMetadata(
      metadataText
    );

  let imagePaths = [];

  if (
    metadata.images
  ) {
    imagePaths =
      metadata.images
        .split(",")
        .map(
          imagePath =>
            resolveMerchImagePath(
              imagePath.trim(),
              folderPath
            )
        )
        .filter(
          Boolean
        );
  } else {
    imagePaths =
      getAutomaticImagesForText(
        textFile,
        siblingFiles,
        allowAllImages
      );
  }

  return {
    id:
      metadata.id ||
      textFile.path,

    /*
      Story is the preferred title for the new text format.
      Name remains supported for older Merch metadata.
    */
    name:
      metadata.story ||
      metadata.name ||
      titleFromFilename(
        textFile.name
      ),

    /*
      Car is the preferred subtitle.
    */
    subtitle:
      metadata.car ||
      metadata.subtitle ||
      "",

    description:
      metadata.description ||
      "",

    created:
      metadata.created ||
      "",

    createdBy:
      metadata.createdby ||
      metadata.creator ||
      "",

    owner:
      metadata.owner ||
      "",

    order:
      Number.isFinite(
        Number(
          metadata.order
        )
      )
        ? Number(
            metadata.order
          )
        : 9999,

    images:
      imagePaths.map(
        getDropboxFileUrl
      )
  };
}


/* =========================================================
   BUILD LEGACY ITEM FOLDER

   Keeps support for:
   /Merch/Some Item/merch.txt
========================================================= */

async function buildLegacyFolderItem(
  folderName,
  folderFiles
) {
  const metadataFile =
    folderFiles.find(
      file =>
        file.name
          .toLowerCase() ===
        "merch.txt"
    );

  if (
    !metadataFile
  ) {
    return null;
  }

  return buildMerchItemFromText({
    textFile:
      metadataFile,

    siblingFiles:
      folderFiles,

    folderPath:
      joinDropboxPath(
        DROPBOX_MERCH_ROOT,
        folderName
      ),

    allowAllImages:
      true
  });
}


/* =========================================================
   BUILD ALL MERCH ITEMS

   New behavior:
   - Every .txt directly in /Merch is an item.
   - name.txt and blurb.txt are reserved.
   - Images are optional.
   - Subfolders still work.
   - A subfolder with several structured .txt files can show
     each one as its own item.
========================================================= */

async function buildAllMerchItems(
  entries
) {
  const files =
    getFileEntries(
      entries
    );

  const items =
    [];

  const rootFiles =
    getRootFiles(
      files
    );

  const rootTextFiles =
    rootFiles.filter(
      file =>
        getExtension(
          file.name
        ) ===
          "txt" &&
        !RESERVED_ROOT_TEXT_FILES.has(
          file.name.toLowerCase()
        )
    );

  const rootResults =
    await Promise.all(
      rootTextFiles.map(
        textFile =>
          buildMerchItemFromText({
            textFile,
            siblingFiles:
              rootFiles,
            folderPath:
              DROPBOX_MERCH_ROOT
          })
            .catch(
              error => {
                console.error(
                  `Could not load ${textFile.path}:`,
                  error
                );

                return null;
              }
            )
      )
    );

  items.push(
    ...rootResults.filter(
      Boolean
    )
  );


  const folderMap =
    getFolderFilesMap(
      files
    );

  for (
    const [
      folderName,
      folderFiles
    ]
    of folderMap.entries()
  ) {
    const legacyMetadata =
      folderFiles.find(
        file =>
          file.name
            .toLowerCase() ===
          "merch.txt"
      );

    if (
      legacyMetadata
    ) {
      try {
        const legacyItem =
          await buildLegacyFolderItem(
            folderName,
            folderFiles
          );

        if (
          legacyItem
        ) {
          items.push(
            legacyItem
          );
        }
      } catch (
        error
      ) {
        console.error(
          `Could not load ${legacyMetadata.path}:`,
          error
        );
      }

      continue;
    }

    const textFiles =
      folderFiles.filter(
        file =>
          getExtension(
            file.name
          ) ===
          "txt"
      );

    for (
      const textFile
      of textFiles
    ) {
      try {
        const item =
          await buildMerchItemFromText({
            textFile,

            siblingFiles:
              folderFiles,

            folderPath:
              joinDropboxPath(
                DROPBOX_MERCH_ROOT,
                folderName
              ),

            /*
              When a folder contains one TXT, preserve the old
              convenient behavior where any images in that
              folder belong to that item.
            */
            allowAllImages:
              textFiles.length ===
              1
          });

        items.push(
          item
        );

      } catch (
        error
      ) {
        console.error(
          `Could not load ${textFile.path}:`,
          error
        );
      }
    }
  }

  return items;
}


/* =========================================================
   PRELOAD IMAGES
========================================================= */

function preloadImages(
  images
) {
  images
    .slice(
      1
    )
    .forEach(
      imageSource => {
        const image =
          new Image();

        image.src =
          imageSource;
      }
    );
}


/* =========================================================
   STATUS
========================================================= */

function showMerchLoading() {
  merchGrid.hidden =
    true;

  merchStatus.hidden =
    false;

  merchStatus.className =
    "merch-status merch-loading";

  merchStatus.textContent =
    "Loading merch…";
}


function showMerchEmpty() {
  merchGrid.hidden =
    true;

  merchStatus.hidden =
    false;

  merchStatus.className =
    "merch-status merch-empty";

  merchStatus.textContent =
    "No merch has been added yet.";
}


function showMerchError(
  message
) {
  merchGrid.hidden =
    true;

  merchStatus.hidden =
    false;

  merchStatus.className =
    "merch-status merch-error";

  merchStatus.innerHTML = `
    <strong>
      Merch could not be loaded.
    </strong>

    <span>
      ${escapeHtml(message)}
    </span>
  `;
}


/* =========================================================
   LOAD MERCH
========================================================= */

async function loadMerch() {
  showMerchLoading();

  try {
    const entries =
      await fetchAllMerchEntries();

    await applyPersonalMerchTitle();

    const merchItems =
      (
        await buildAllMerchItems(
          entries
        )
      )
        .sort(
          (
            itemA,
            itemB
          ) => {
            if (
              itemA.order !==
              itemB.order
            ) {
              return (
                itemA.order -
                itemB.order
              );
            }

            return compareNaturally(
              itemA.name,
              itemB.name
            );
          }
        );

    if (
      merchItems.length ===
      0
    ) {
      showMerchEmpty();

      return;
    }

    renderMerchInventory(
      merchItems
    );

  } catch (
    error
  ) {
    console.error(
      "Merch loading failed:",
      error
    );

    showMerchError(
      error.message ||
      "The merch inventory could not be loaded."
    );
  }
}


/* =========================================================
   RENDER INVENTORY
========================================================= */

function renderMerchInventory(
  merchItems
) {
  loadedMerchItems =
    merchItems.slice();

  merchGrid.innerHTML =
    "";

  merchItems.forEach(
    item => {
      merchGrid.appendChild(
        createMerchCard(
          item
        )
      );
    }
  );

  merchStatus.hidden =
    true;

  merchGrid.hidden =
    false;
}


/* =========================================================
   SET ACTIVE IMAGE AND DOT
========================================================= */

function setActiveImage({
  imageElement,
  dotsContainer,
  images,
  index
}) {
  if (
    !imageElement ||
    !images[index]
  ) {
    return;
  }

  imageElement.src =
    images[index];

  if (
    !dotsContainer
  ) {
    return;
  }

  dotsContainer
    .querySelectorAll(
      ".merch-dot"
    )
    .forEach(
      (
        dot,
        dotIndex
      ) => {
        const isActive =
          dotIndex ===
          index;

        dot.classList.toggle(
          "active",
          isActive
        );

        dot.setAttribute(
          "aria-current",
          isActive
            ? "true"
            : "false"
        );
      }
    );
}


/* =========================================================
   CREATE DOTS
========================================================= */

function createImageDots({
  images,
  imageElement,
  container,
  onChange
}) {
  if (
    !container
  ) {
    return;
  }

  container.innerHTML =
    "";

  if (
    images.length <=
    1
  ) {
    container.hidden =
      true;

    return;
  }

  container.hidden =
    false;

  images.forEach(
    (
      imageSource,
      index
    ) => {
      const dot =
        document.createElement(
          "button"
        );

      dot.type =
        "button";

      dot.className =
        index === 0
          ? "merch-dot active"
          : "merch-dot";

      dot.dataset.imageIndex =
        String(
          index
        );

      dot.setAttribute(
        "aria-label",
        `View image ${index + 1}`
      );

      dot.setAttribute(
        "aria-current",
        index === 0
          ? "true"
          : "false"
      );

      dot.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          setActiveImage({
            imageElement,

            dotsContainer:
              container,

            images,

            index
          });

          if (
            typeof onChange ===
            "function"
          ) {
            onChange(
              index
            );
          }
        }
      );

      container.appendChild(
        dot
      );
    }
  );
}


/* =========================================================
   CREATE CARD
========================================================= */

function createMerchCard(
  item
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "merch-card";

  if (
    item.subtitle
  ) {
    card.classList.add(
      "has-subtitle"
    );
  }

  if (
    item.images.length ===
    0
  ) {
    card.classList.add(
      "no-image"
    );
  }

  card.tabIndex =
    0;

  card.setAttribute(
    "role",
    "button"
  );

  card.setAttribute(
    "aria-label",
    `View ${item.name}`
  );


  const imageMarkup =
    item.images.length > 0
      ? `
        <div class="merch-image-wrap">
          <img
            class="merch-image"
            src="${escapeHtml(item.images[0])}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
          >
        </div>

        <div class="merch-card-dots"></div>
      `
      : "";


  const subtitleMarkup =
    item.subtitle
      ? `
        <p class="merch-card-subtitle">
          ${escapeHtml(item.subtitle)}
        </p>
      `
      : "";


  card.innerHTML = `
    ${imageMarkup}

    <h2>
      ${escapeHtml(item.name)}
    </h2>

    ${subtitleMarkup}
  `;


  if (
    item.images.length > 0
  ) {
    const image =
      card.querySelector(
        ".merch-image"
      );

    const dotsContainer =
      card.querySelector(
        ".merch-card-dots"
      );

    createImageDots({
      images:
        item.images,

      imageElement:
        image,

      container:
        dotsContainer
    });
  }


  card.addEventListener(
    "click",
    event => {
      if (
        event.target.closest(
          ".merch-dot"
        )
      ) {
        return;
      }

      openQuickView(
        item
      );
    }
  );


  card.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
          "Enter" ||
        event.key ===
          " "
      ) {
        event.preventDefault();

        openQuickView(
          item
        );
      }
    }
  );

  return card;
}


/* =========================================================
   QUICK VIEW IMAGE
========================================================= */

function showQuickViewImage(
  index
) {
  if (
    !activeQuickViewItem ||
    activeQuickViewItem.images.length ===
      0
  ) {
    return;
  }

  activeQuickViewImageIndex =
    index;

  setActiveImage({
    imageElement:
      quickViewImage,

    dotsContainer:
      quickViewDots,

    images:
      activeQuickViewItem.images,

    index
  });

  quickViewImage.alt =
    activeQuickViewItem.images.length >
    1
      ? `${activeQuickViewItem.name}, image ${index + 1}`
      : activeQuickViewItem.name;
}


/* =========================================================
   OPEN QUICK VIEW
========================================================= */

function openQuickView(
  item
) {
  const wasAlreadyOpen =
    quickView.classList.contains(
      "open"
    );

  activeQuickViewItem =
    item;

  activeQuickViewItemIndex =
    loadedMerchItems.indexOf(
      item
    );

  activeQuickViewImageIndex =
    0;

  if (
    !wasAlreadyOpen
  ) {
    lastFocusedElement =
      document.activeElement;
  }


  quickViewName.textContent =
    item.name;


  if (
    quickViewSubtitle
  ) {
    quickViewSubtitle.textContent =
      item.subtitle ||
      "";

    quickViewSubtitle.hidden =
      !item.subtitle;
  }


  quickViewDescription.textContent =
    item.description ||
    "";

  quickViewDescription.hidden =
    !item.description;


  quickViewCreated.textContent =
    item.created ||
    "";

  quickViewCreator.textContent =
    item.createdBy ||
    "";

  quickViewOwner.textContent =
    item.owner ||
    "";


  createdRow.hidden =
    !item.created;

  creatorRow.hidden =
    !item.createdBy;

  ownerRow.hidden =
    !item.owner;


  const hasImages =
    item.images.length >
    0;

  if (
    quickViewLayout
  ) {
    quickViewLayout.classList.toggle(
      "no-image",
      !hasImages
    );
  }

  if (
    quickViewGallery
  ) {
    quickViewGallery.hidden =
      !hasImages;
  }


  if (
    hasImages
  ) {
    createImageDots({
      images:
        item.images,

      imageElement:
        quickViewImage,

      container:
        quickViewDots,

      onChange:
        index => {
          activeQuickViewImageIndex =
            index;
        }
    });

    showQuickViewImage(
      0
    );

    preloadImages(
      item.images
    );

  } else {
    quickViewImage.src =
      "";

    quickViewImage.alt =
      "";

    quickViewDots.innerHTML =
      "";
  }


  const canNavigateItems =
    loadedMerchItems.length >
      1;

  if (
    quickViewItemPrev
  ) {
    quickViewItemPrev.hidden =
      !canNavigateItems;

    quickViewItemPrev.setAttribute(
      "aria-label",
      canNavigateItems
        ? `Previous merch item before ${item.name}`
        : "Previous merch item"
    );
  }

  if (
    quickViewItemNext
  ) {
    quickViewItemNext.hidden =
      !canNavigateItems;

    quickViewItemNext.setAttribute(
      "aria-label",
      canNavigateItems
        ? `Next merch item after ${item.name}`
        : "Next merch item"
    );
  }

  quickView.classList.add(
    "open"
  );

  quickView.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );

  if (
    !wasAlreadyOpen
  ) {
    quickViewClose.focus();
  }
}


/* =========================================================
   CLOSE QUICK VIEW
========================================================= */

function closeQuickView() {
  if (
    !quickView.classList.contains(
      "open"
    )
  ) {
    return;
  }

  quickView.classList.remove(
    "open"
  );

  quickView.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-open"
  );

  quickViewImage.src =
    "";

  quickViewImage.alt =
    "";

  quickViewDots.innerHTML =
    "";

  if (
    quickViewLayout
  ) {
    quickViewLayout.classList.remove(
      "no-image"
    );
  }

  if (
    quickViewGallery
  ) {
    quickViewGallery.hidden =
      false;
  }

  activeQuickViewItem =
    null;

  activeQuickViewItemIndex =
    -1;

  activeQuickViewImageIndex =
    0;

  if (
    lastFocusedElement &&
    typeof lastFocusedElement.focus ===
      "function"
  ) {
    lastFocusedElement.focus();
  }
}


function showAdjacentQuickViewItem(
  direction
) {
  if (
    loadedMerchItems.length <=
      1
  ) {
    return;
  }

  const currentIndex =
    activeQuickViewItemIndex >=
      0
      ? activeQuickViewItemIndex
      : 0;

  const nextIndex =
    (
      currentIndex +
      direction +
      loadedMerchItems.length
    ) %
    loadedMerchItems.length;

  openQuickView(
    loadedMerchItems[
      nextIndex
    ]
  );
}


/* =========================================================
   EVENTS
========================================================= */

quickViewClose.addEventListener(
  "click",
  closeQuickView
);

quickViewItemPrev?.addEventListener(
  "click",
  () =>
    showAdjacentQuickViewItem(
      -1
    )
);

quickViewItemNext?.addEventListener(
  "click",
  () =>
    showAdjacentQuickViewItem(
      1
    )
);


document
  .querySelector(
    ".quick-view-backdrop"
  )
  .addEventListener(
    "click",
    closeQuickView
  );


document.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
      "Escape"
    ) {
      closeQuickView();

      return;
    }

    if (
      !quickView.classList.contains(
        "open"
      ) ||
      !activeQuickViewItem ||
      activeQuickViewItem.images.length <=
        1
    ) {
      return;
    }

    if (
      event.key ===
      "ArrowRight"
    ) {
      const nextIndex =
        (
          activeQuickViewImageIndex +
          1
        ) %
        activeQuickViewItem.images.length;

      showQuickViewImage(
        nextIndex
      );
    }

    if (
      event.key ===
      "ArrowLeft"
    ) {
      const previousIndex =
        (
          activeQuickViewImageIndex -
          1 +
          activeQuickViewItem.images.length
        ) %
        activeQuickViewItem.images.length;

      showQuickViewImage(
        previousIndex
      );
    }
  }
);


/* =========================================================
   START
========================================================= */

loadMerch();
