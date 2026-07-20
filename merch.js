/* =========================================================
   DROPBOX SETTINGS
========================================================= */

const DROPBOX_API_BASE =
  "https://family-photo-api.emilyzohar.workers.dev";

const DROPBOX_MERCH_ROOT =
  "/Zohar Family/Merch";


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


/* =========================================================
   STATE
========================================================= */

let activeQuickViewItem =
  null;

let activeQuickViewImageIndex =
  0;

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
          "&":
            "&amp;",

          "<":
            "&lt;",

          ">":
            "&gt;",

          "\"":
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
   FETCH COMPLETE MERCH TREE

   This uses one recursive folder request instead of
   requesting every subfolder separately.
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
   METADATA
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
          currentKey &&
          line.trim()
        ) {
          metadata[
            currentKey
          ] = `${
            metadata[
              currentKey
            ]
          } ${line.trim()}`.trim();
        }
      }
    );

  return metadata;
}


/* =========================================================
   GROUP RECURSIVE RESULTS BY MERCH FOLDER
========================================================= */

function groupEntriesByMerchFolder(
  entries
) {
  const folders =
    new Map();

  entries.forEach(
    entry => {
      if (
        String(
          entry.type ?? ""
        )
          .toLowerCase() !==
        "file"
      ) {
        return;
      }

      const fullPath =
        normalizePath(
          entry.displayPath ||
          entry.path
        );

      const relativePath =
        trimSlashes(
          fullPath
            .replace(
              new RegExp(
                `^${DROPBOX_MERCH_ROOT}`,
                "i"
              ),
              ""
            )
        );

      const pathParts =
        relativePath.split("/");

      /*
        A merch file must be inside:

        /Merch/item-folder/file.ext
      */

      if (
        pathParts.length <
        2
      ) {
        return;
      }

      const folderName =
        pathParts[0];

      if (
        !folders.has(
          folderName
        )
      ) {
        folders.set(
          folderName,
          {
            name:
              folderName,

            path:
              joinDropboxPath(
                DROPBOX_MERCH_ROOT,
                folderName
              ),

            files:
              []
          }
        );
      }

      folders
        .get(
          folderName
        )
        .files
        .push({
          name:
            entry.name ||
            getFilename(
              fullPath
            ),

          path:
            fullPath
        });
    }
  );

  return Array.from(
    folders.values()
  );
}


/* =========================================================
   IMAGE PATHS
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


/* =========================================================
   BUILD ONE MERCH ITEM
========================================================= */

async function buildMerchItem(
  folder
) {
  const metadataFile =
    folder.files.find(
      file =>
        file.name
          .toLowerCase() ===
        "merch.txt"
    ) ||
    folder.files.find(
      file =>
        getExtension(
          file.name
        ) ===
        "txt"
    );

  let metadata = {};

  if (
    metadataFile
  ) {
    const metadataText =
      await fetchDropboxText(
        metadataFile.path
      );

    metadata =
      parseMerchMetadata(
        metadataText
      );
  }

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
              folder.path
            )
        )
        .filter(
          Boolean
        );
  } else {
    imagePaths =
      folder.files
        .filter(
          file =>
            MERCH_IMAGE_EXTENSIONS.has(
              getExtension(
                file.name
              )
            )
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
        )
        .map(
          file =>
            file.path
        );
  }

  if (
    imagePaths.length ===
    0
  ) {
    console.warn(
      `Skipping ${folder.path}: no images found.`
    );

    return null;
  }

  return {
    id:
      metadata.id ||
      folder.name,

    name:
      metadata.name ||
      titleFromFilename(
        folder.name
      ),

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
   PRELOAD SECONDARY IMAGES
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

    const folders =
      groupEntriesByMerchFolder(
        entries
      );

    const results =
      await Promise.all(
        folders.map(
          folder =>
            buildMerchItem(
              folder
            )
              .catch(
                error => {
                  console.error(
                    `Could not load ${folder.path}:`,
                    error
                  );

                  return null;
                }
              )
        )
      );

    const merchItems =
      results
        .filter(
          Boolean
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

    /*
      Load secondary pictures after the page is usable.
    */

    window.setTimeout(
      () => {
        merchItems.forEach(
          item =>
            preloadImages(
              item.images
            )
        );
      },
      150
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
    !images[index]
  ) {
    return;
  }

  imageElement.src =
    images[index];

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

  card.innerHTML = `
    <div class="merch-image-wrap">

      <img
        class="merch-image"
        src="${escapeHtml(item.images[0])}"
        alt="${escapeHtml(item.name)}"
        loading="lazy"
        decoding="async"
      >

    </div>

    <div class="merch-card-dots"></div>

    <h2>
      ${escapeHtml(item.name)}
    </h2>
  `;

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

  card.addEventListener(
    "click",
    event => {
      /*
        Do not open the modal when a dot was clicked.
      */

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
    !activeQuickViewItem
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
  activeQuickViewItem =
    item;

  activeQuickViewImageIndex =
    0;

  lastFocusedElement =
    document.activeElement;

  quickViewName.textContent =
    item.name;

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

  quickViewClose.focus();

  preloadImages(
    item.images
  );
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

  activeQuickViewItem =
    null;

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


/* =========================================================
   EVENTS
========================================================= */

quickViewClose.addEventListener(
  "click",
  closeQuickView
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