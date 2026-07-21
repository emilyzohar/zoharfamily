/* =========================================================
   DROPBOX MEMORIES SETTINGS
========================================================= */

const DROPBOX_API_BASE =
  "https://family-photo-api.emilyzohar.workers.dev";


const DROPBOX_MEMORIES_ROOT =
  "/Zohar Family/Memories";


/* =========================================================
   SUPPORTED MEDIA
========================================================= */

const MEMORY_IMAGE_EXTENSIONS =
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


const MEMORY_VIDEO_EXTENSIONS =
  new Set([
    "mp4",
    "mov",
    "m4v",
    "webm",
    "ogg"
  ]);


/* =========================================================
   ENDLESS ALBUM SETTINGS
========================================================= */

const MEMORY_BATCH_SIZE =
  24;


/* =========================================================
   STATE
========================================================= */

let memoryRootTree =
  null;


let currentMemoryFolder =
  null;


let currentAlbumItems =
  [];


let renderedAlbumCount =
  0;


let lightboxIndex =
  0;


let albumObserver =
  null;


/* =========================================================
   DOM
========================================================= */

const memoriesContent =
  document.getElementById(
    "memoriesContent"
  );


const memoriesPageTitle =
  document.getElementById(
    "memoriesPageTitle"
  );


const memoriesPageSubtitle =
  document.getElementById(
    "memoriesPageSubtitle"
  );


const memoriesBreadcrumbs =
  document.getElementById(
    "memoriesBreadcrumbs"
  );


const memoriesLoadSentinel =
  document.getElementById(
    "memoriesLoadSentinel"
  );


const memoryLightbox =
  document.getElementById(
    "memoryLightbox"
  );


const memoryLightboxBackdrop =
  document.getElementById(
    "memoryLightboxBackdrop"
  );


const memoryLightboxClose =
  document.getElementById(
    "memoryLightboxClose"
  );


const memoryLightboxPrev =
  document.getElementById(
    "memoryLightboxPrev"
  );


const memoryLightboxNext =
  document.getElementById(
    "memoryLightboxNext"
  );


const memoryLightboxMedia =
  document.getElementById(
    "memoryLightboxMedia"
  );


const memoryLightboxTitle =
  document.getElementById(
    "memoryLightboxTitle"
  );


const memoryLightboxCount =
  document.getElementById(
    "memoryLightboxCount"
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


function getFilename(
  path
) {

  return normalisePath(
    path
  )

    .split(
      "/"
    )

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

    ? match[1]
        .toLowerCase()

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


function titleFromFolder(
  value
) {

  return String(
    value ?? ""
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

    .trim();

}


function titleFromFilename(
  value
) {

  return titleFromFolder(

    removeExtension(
      value
    )

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

    cleanPath
      .lastIndexOf(
        "/"
      );


  if (
    lastSlash <=
      0
  ) {

    return "";

  }


  return cleanPath
    .slice(
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

    .split(
      "/"
    )

    .filter(
      Boolean
    )

    .length;

}


/* =========================================================
   DROPBOX API
========================================================= */

function buildDropboxApiUrl(
  endpoint,
  parameters = {}
) {

  const base =

    DROPBOX_API_BASE
      .endsWith(
        "/"
      )

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


  Object
    .entries(
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
          value !==
            undefined

          &&

          value !==
            null
        ) {

          url
            .searchParams
            .set(

              key,

              String(
                value
              )

            );

        }

      }

    );


  return url
    .toString();

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
   FETCH ALL MEMORIES

   One recursive request keeps folder navigation fast.
========================================================= */

async function fetchAllMemoryEntries() {

  const response =

    await fetch(

      buildDropboxApiUrl(

        "/folder",

        {

          path:
            DROPBOX_MEMORIES_ROOT,

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

      await response
        .text();


    throw new Error(

      `Could not load memories. HTTP ${response.status}. ${errorText}`

    );

  }


  const entries =

    await response
      .json();


  if (
    !Array.isArray(
      entries
    )
  ) {

    throw new Error(

      "The Dropbox Memories folder did not return a file list."

    );

  }


  return entries;

}


/* =========================================================
   ENTRY PATH
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


/* =========================================================
   BUILD MEMORY FOLDER TREE
========================================================= */

function buildMemoryFolderTree(
  entries
) {

  const root = {

    name:
      "Memories",

    path:
      DROPBOX_MEMORIES_ROOT,

    files:
      [],

    folders:
      [],

    parent:
      null

  };


  const folderMap =

    new Map();


  folderMap.set(

    normalizePathKey(
      DROPBOX_MEMORIES_ROOT
    ),

    root

  );


  /*
    Create folder nodes.
  */

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

          ensureMemoryFolderNode(

            path,

            folderMap,

            root

          );

        }

      }

    );


  /*
    Add files.
  */

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

          ensureMemoryFolderNode(

            getParentPath(
              filePath
            ),

            folderMap,

            root

          );


        parentFolder
          .files
          .push({

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

              null

          });

      }

    );


  sortMemoryFolderTree(
    root
  );


  return root;

}


/* =========================================================
   ENSURE FOLDER NODE
========================================================= */

function ensureMemoryFolderNode(
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
        DROPBOX_MEMORIES_ROOT
      )

  ) {

    return root;

  }


  if (
    folderMap.has(
      key
    )
  ) {

    return folderMap
      .get(
        key
      );

  }


  const parentFolder =

    ensureMemoryFolderNode(

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
      [],

    parent:
      parentFolder

  };


  parentFolder
    .folders
    .push(
      folder
    );


  folderMap.set(

    key,

    folder

  );


  return folder;

}


/* =========================================================
   SORT TREE
========================================================= */

function sortMemoryFolderTree(
  folder
) {

  folder
    .files
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


  folder
    .folders
    .sort(

      (
        folderA,
        folderB
      ) =>

        compareNaturally(

          folderA.name,

          folderB.name

        )

    );


  folder
    .folders
    .forEach(
      sortMemoryFolderTree
    );

}


/* =========================================================
   MEDIA CLASSIFICATION
========================================================= */

function getMemoryMediaType(
  file
) {

  const extension =

    getExtension(
      file.name
    );


  if (
    MEMORY_IMAGE_EXTENSIONS.has(
      extension
    )
  ) {

    return "image";

  }


  if (
    MEMORY_VIDEO_EXTENSIONS.has(
      extension
    )
  ) {

    return "video";

  }


  return "";

}


/* =========================================================
   GET MEDIA INSIDE A FOLDER

   This is recursive so a leaf album can contain nested
   organizational folders if needed.
========================================================= */

function getAllMediaInFolder(
  folder
) {

  const media =

    folder
      .files

      .map(

        file => ({

          ...file,

          mediaType:
            getMemoryMediaType(
              file
            )

        })

      )

      .filter(

        file =>
          Boolean(
            file.mediaType
          )

      );


  folder
    .folders
    .forEach(

      childFolder => {

        media.push(

          ...getAllMediaInFolder(
            childFolder
          )

        );

      }

    );


  return media;

}


/* =========================================================
   FIND FOLDER COVER IMAGE

   Priority:

   1. cover.*
   2. folder.*
   3. thumbnail.*
   4. first direct image
   5. first image anywhere inside folder
========================================================= */

function findFolderCoverImage(
  folder
) {

  const directImages =

    folder
      .files
      .filter(

        file =>

          getMemoryMediaType(
            file
          ) ===
            "image"

      );


  const preferredNames = [

    "cover",

    "folder",

    "thumbnail",

    "landing"

  ];


  for (
    const preferredName
    of
    preferredNames
  ) {

    const matchingFile =

      directImages
        .find(

          file =>

            removeExtension(
              file.name
            )

              .toLowerCase() ===
                preferredName

        );


    if (
      matchingFile
    ) {

      return matchingFile;

    }

  }


  if (
    directImages.length >
      0
  ) {

    return directImages[
      0
    ];

  }


  for (
    const childFolder
    of
    folder.folders
  ) {

    const childCover =

      findFolderCoverImage(
        childFolder
      );


    if (
      childCover
    ) {

      return childCover;

    }

  }


  return null;

}


/* =========================================================
   ROUTING

   URL example:

   memories.html?folder=Zohar%20Olympics/2008
========================================================= */

function getRequestedFolderPath() {

  const parameters =

    new URLSearchParams(
      window.location.search
    );


  return parameters
    .get(
      "folder"
    )
    ?.trim()

    ||

    "";

}


/* =========================================================
   FIND FOLDER BY RELATIVE PATH
========================================================= */

function findFolderByRelativePath(
  relativePath
) {

  if (
    !relativePath
  ) {

    return memoryRootTree;

  }


  const segments =

    trimSlashes(
      relativePath
    )

      .split(
        "/"
      )

      .filter(
        Boolean
      );


  let folder =

    memoryRootTree;


  for (
    const segment
    of
    segments
  ) {

    const child =

      folder
        .folders
        .find(

          candidate =>

            candidate
              .name
              .toLowerCase()

            ===

            segment
              .toLowerCase()

        );


    if (
      !child
    ) {

      return null;

    }


    folder =
      child;

  }


  return folder;

}


/* =========================================================
   RELATIVE FOLDER PATH
========================================================= */

function getRelativeFolderPath(
  folder
) {

  const rootPath =

    trimSlashes(
      DROPBOX_MEMORIES_ROOT
    );


  const folderPath =

    trimSlashes(
      folder.path
    );


  return folderPath

    .slice(
      rootPath.length
    )

    .replace(
      /^\/+/,
      ""
    );

}


/* =========================================================
   NAVIGATE TO FOLDER
========================================================= */

function navigateToFolder(
  folder,
  pushHistory = true
) {

  currentMemoryFolder =
    folder;


  const relativePath =

    getRelativeFolderPath(
      folder
    );


  const url =

    relativePath

      ? `memories.html?folder=${encodeURIComponent(
          relativePath
        )}`

      : "memories.html";


  if (
    pushHistory
  ) {

    window.history
      .pushState(

        {
          folder:
            relativePath
        },

        "",

        url

      );

  }


  renderCurrentMemoryFolder();


  window.scrollTo({

    top:
      0,

    behavior:
      "smooth"

  });

}


/* =========================================================
   RENDER CURRENT FOLDER
========================================================= */

function renderCurrentMemoryFolder() {

  if (
    !currentMemoryFolder
  ) {
    return;
  }


  stopAlbumObserver();


  const hasSubfolders =
    currentMemoryFolder
      .folders
      .length > 0;


  const directMedia =
    getDirectMediaInFolder(
      currentMemoryFolder
    );


  const hasDirectMedia =
    directMedia.length > 0;


  memoriesPageTitle.textContent =

    currentMemoryFolder ===
      memoryRootTree

      ? "Memories"

      : titleFromFolder(
          currentMemoryFolder.name
        );


  memoriesPageSubtitle.textContent =

    hasSubfolders

      ? "Choose an album"

      : "";


  renderBreadcrumbs();


  /*
    Main Memories landing page:
    retain the original large, overlapping polaroids.
  */

  if (
    currentMemoryFolder ===
      memoryRootTree
  ) {

    renderFolderLandingPage(

      currentMemoryFolder
        .folders

    );

    return;

  }


  /*
    Any folder containing only subfolders:
    also use the large polaroid landing layout.
  */

  if (
    hasSubfolders

    &&

    !hasDirectMedia
  ) {

    renderFolderLandingPage(

      currentMemoryFolder
        .folders

    );

    return;

  }


  /*
    Folder containing both subfolders and direct photos:
    show the smaller subfolder row above the photos.
  */

  if (
    hasSubfolders

    &&

    hasDirectMedia
  ) {

    memoriesPageSubtitle.textContent =
      "";

    renderMixedMemoryFolder(
      currentMemoryFolder
    );

    return;

  }


  /*
    Folder containing only photos or videos.
  */

  renderDigitalAlbum(
    currentMemoryFolder
  );

}

/* =========================================================
   GET MEDIA DIRECTLY INSIDE A FOLDER

   Unlike getAllMediaInFolder(), this does not include media
   from nested subfolders.
========================================================= */

function getDirectMediaInFolder(
  folder
) {

  return folder
    .files
    .map(

      file => ({

        ...file,

        mediaType:
          getMemoryMediaType(
            file
          )

      })

    )
    .filter(

      file =>
        Boolean(
          file.mediaType
        )

    );

}


/* =========================================================
   RENDER FOLDERS ABOVE DIRECT MEDIA
========================================================= */

function renderMixedMemoryFolder(
  folder
) {

  memoriesContent.innerHTML =
    "";

  const hasSubfolders =
    folder.folders.length > 0;

  currentAlbumItems =
    getDirectMediaInFolder(
      folder
    );

  const hasMedia =
    currentAlbumItems.length > 0;

  /*
    Subfolder row.
  */
  if (
    hasSubfolders
  ) {

    const folderSection =
      document.createElement(
        "section"
      );

    folderSection.className =
      "memory-subfolder-section";

    const folderRow =
      document.createElement(
        "div"
      );

    folderRow.className =
      "memory-subfolder-row";

    folder.folders.forEach(

      (
        childFolder,
        index
      ) => {

        folderRow.appendChild(

          createFolderPolaroid(
            childFolder,
            index
          )

        );

      }

    );

    folderSection.appendChild(
      folderRow
    );

    memoriesContent.appendChild(
      folderSection
    );

  }

  /*
    Media grid below the subfolders.
  */
  if (
    hasMedia
  ) {

    renderedAlbumCount =
      0;

    const mediaSection =
      document.createElement(
        "section"
      );

    mediaSection.className =
      "memory-media-section";

    if (
      hasSubfolders
    ) {

      const heading =
        document.createElement(
          "h2"
        );

      heading.className =
        "memory-media-heading";

      heading.textContent =
        "Photos";

      mediaSection.appendChild(
        heading
      );

    }

    const grid =
      document.createElement(
        "div"
      );

    grid.id =
      "memoryAlbumGrid";

    grid.className =
      "memory-album-grid";

    mediaSection.appendChild(
      grid
    );

    memoriesContent.appendChild(
      mediaSection
    );

    renderNextAlbumBatch();
    startAlbumObserver();

    return;

  }

  /*
    Only show an empty state when the folder contains neither
    media nor subfolders.
  */
  if (
    !hasSubfolders
  ) {

    memoriesContent.innerHTML = `

      <div
        class="
          memories-empty
        "
      >

        <h2>
          No memories yet
        </h2>

        <p>
          Photos and videos added to this folder
          will appear here automatically.
        </p>

      </div>

    `;

  }

}


/* =========================================================
   BREADCRUMBS
========================================================= */

function renderBreadcrumbs() {

  memoriesBreadcrumbs.innerHTML =
    "";


  const chain =
    [];


  let folder =

    currentMemoryFolder;


  while (
    folder
  ) {

    chain.unshift(
      folder
    );


    folder =
      folder.parent;

  }


  chain.forEach(

    (
      folderItem,
      index
    ) => {

      if (
        index >
          0
      ) {

        const divider =

          document.createElement(
            "span"
          );


        divider.className =
          "memories-breadcrumb-divider";


        divider.textContent =
          "/";


        memoriesBreadcrumbs
          .appendChild(
            divider
          );

      }


      const button =

        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =

        "memories-breadcrumb";


      if (
        folderItem ===
          currentMemoryFolder
      ) {

        button
          .classList
          .add(
            "memories-breadcrumb-current"
          );

      }


      button.textContent =

        folderItem ===
          memoryRootTree

          ? "Memories"

          : titleFromFolder(
              folderItem.name
            );


      if (
        folderItem !==
          currentMemoryFolder
      ) {

        button
          .addEventListener(

            "click",

            () => {

              navigateToFolder(
                folderItem
              );

            }

          );

      }


      memoriesBreadcrumbs
        .appendChild(
          button
        );

    }

  );

}


/* =========================================================
   POLAROID POSITION PRESETS

   Repeated as needed to create an imperfect pile.
========================================================= */

const POLAROID_PRESETS = [

  {
    rotation:
      -0.5,

    x:
      -18,

    y:
      18
  },

  {
    rotation:
      -13,

    x:
      8,

    y:
      -18
  },

  {
    rotation:
      6,

    x:
      -5,

    y:
      30
  },

  {
    rotation:
      10,

    x:
      18,

    y:
      -12
  },

  {
    rotation:
      -7,

    x:
      -14,

    y:
      35
  },

  {
    rotation:
      3,

    x:
      12,

    y:
      6
  },

  {
    rotation:
      -4,

    x:
      5,

    y:
      -24
  }

];


/* =========================================================
   RENDER FOLDER LANDING PAGE
========================================================= */

function renderFolderLandingPage(
  folders
) {

  memoriesContent.innerHTML =
    "";


  const stage =

    document.createElement(
      "div"
    );


  stage.className =
    "memory-folder-stage";


  folders
    .forEach(

      (
        folder,
        index
      ) => {

        stage
          .appendChild(

            createFolderPolaroid(

              folder,

              index

            )

          );

      }

    );


  memoriesContent
    .appendChild(
      stage
    );

}


/* =========================================================
   CREATE FOLDER POLAROID
========================================================= */

function createFolderPolaroid(
  folder,
  index
) {

  const button =

    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    "memory-folder-card";


  const preset =

    POLAROID_PRESETS[

      index

      %

      POLAROID_PRESETS.length

    ];


  button.style
    .setProperty(

      "--folder-rotation",

      `${preset.rotation}deg`

    );


  button.style
    .setProperty(

      "--folder-x",

      `${preset.x}px`

    );


  button.style
    .setProperty(

      "--folder-y",

      `${preset.y}px`

    );


  button.style
    .setProperty(

      "--folder-z",

      String(
        index + 1
      )

    );


  const coverImage =

    findFolderCoverImage(
      folder
    );


  const imageHtml =

    coverImage

      ? `

        <img

          class="
            memory-polaroid-image
          "

          src="${getDropboxFileUrl(
            coverImage.path
          )}"

          alt=""

          loading="lazy"

          decoding="async"

        >

      `

      : `

        <div
          class="
            memory-polaroid-image-placeholder
          "
        >

          ${titleFromFolder(
            folder.name
          )}

        </div>

      `;


  button.innerHTML = `

    <div
      class="
        memory-polaroid
      "
    >

      <div
        class="
          memory-polaroid-image-wrap
        "
      >

        ${imageHtml}

      </div>


      <h2
        class="
          memory-polaroid-title
        "
      >

        ${titleFromFolder(
          folder.name
        )}

      </h2>

    </div>

  `;


  button
    .addEventListener(

      "click",

      () => {

        navigateToFolder(
          folder
        );

      }

    );


  return button;

}


/* =========================================================
   RENDER DIGITAL ALBUM
========================================================= */

function renderDigitalAlbum(
  folder
) {

  memoriesContent.innerHTML =
    "";


  currentAlbumItems =

    getAllMediaInFolder(
      folder
    );


  renderedAlbumCount =
    0;


  if (
    currentAlbumItems.length ===
      0
  ) {

    memoriesContent.innerHTML = `

      <div
        class="
          memories-empty
        "
      >

        <h2>
          No memories yet
        </h2>

        <p>
          Photos and videos added to this folder
          will appear here automatically.
        </p>

      </div>

    `;


    return;

  }


  const grid =

    document.createElement(
      "div"
    );


  grid.id =
    "memoryAlbumGrid";


  grid.className =
    "memory-album-grid";


  memoriesContent
    .appendChild(
      grid
    );


  renderNextAlbumBatch();


  startAlbumObserver();

}


/* =========================================================
   RENDER NEXT ENDLESS-SCROLL BATCH
========================================================= */

function renderNextAlbumBatch() {

  const grid =

    document.getElementById(
      "memoryAlbumGrid"
    );


  if (
    !grid
  ) {

    return;

  }


  if (
    renderedAlbumCount >=
      currentAlbumItems.length
  ) {

    stopAlbumObserver();

    return;

  }


  const endIndex =

    Math.min(

      renderedAlbumCount

      +

      MEMORY_BATCH_SIZE,

      currentAlbumItems.length

    );


  for (

    let index =
      renderedAlbumCount;

    index <
      endIndex;

    index +=
      1

  ) {

    grid
      .appendChild(

        createAlbumItem(

          currentAlbumItems[
            index
          ],

          index

        )

      );

  }


  renderedAlbumCount =
    endIndex;

}


/* =========================================================
   CREATE ALBUM ITEM
========================================================= */

function createAlbumItem(
  item,
  index
) {

  const button =

    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    "memory-album-item";


  if (
    item.mediaType ===
      "video"
  ) {

    const video =

      document.createElement(
        "video"
      );


    video.className =
      "memory-album-video";


    video.src =

      getDropboxFileUrl(
        item.path
      );


    video.muted =
      true;


    video.preload =
      "metadata";


    video.playsInline =
      true;


    button
      .appendChild(
        video
      );


    const indicator =

      document.createElement(
        "span"
      );


    indicator.className =
      "memory-video-indicator";


    button
      .appendChild(
        indicator
      );

  }

  else {

    const image =

      document.createElement(
        "img"
      );


    image.className =
      "memory-album-image";


    image.src =

      getDropboxFileUrl(
        item.path
      );


    image.alt =

      titleFromFilename(
        item.name
      );


    image.loading =
      "lazy";


    image.decoding =
      "async";


    button
      .appendChild(
        image
      );

  }


  button
    .addEventListener(

      "click",

      () => {

        openMemoryLightbox(
          index
        );

      }

    );


  return button;

}


/* =========================================================
   ENDLESS SCROLL OBSERVER
========================================================= */

function startAlbumObserver() {

  stopAlbumObserver();


  albumObserver =

    new IntersectionObserver(

      entries => {

        entries
          .forEach(

            entry => {

              if (
                entry.isIntersecting
              ) {

                renderNextAlbumBatch();

              }

            }

          );

      },

      {

        rootMargin:
          "800px 0px"

      }

    );


  albumObserver
    .observe(
      memoriesLoadSentinel
    );

}


function stopAlbumObserver() {

  if (
    albumObserver
  ) {

    albumObserver
      .disconnect();


    albumObserver =
      null;

  }

}


/* =========================================================
   OPEN LIGHTBOX
========================================================= */

function openMemoryLightbox(
  index
) {

  lightboxIndex =
    index;


  renderMemoryLightbox();


  memoryLightbox
    .classList
    .add(
      "is-open"
    );


  memoryLightbox
    .setAttribute(
      "aria-hidden",
      "false"
    );


  document.body.style.overflow =
    "hidden";


  memoryLightboxClose
    .focus();

}


/* =========================================================
   RENDER LIGHTBOX MEDIA
========================================================= */

function renderMemoryLightbox() {

  const item =

    currentAlbumItems[
      lightboxIndex
    ];


  if (
    !item
  ) {

    return;

  }


  memoryLightboxMedia.innerHTML =
    "";


  if (
    item.mediaType ===
      "video"
  ) {

    const video =

      document.createElement(
        "video"
      );


    video.src =

      getDropboxFileUrl(
        item.path
      );


    video.controls =
      true;


    video.autoplay =
      true;


    video.playsInline =
      true;


    memoryLightboxMedia
      .appendChild(
        video
      );

  }

  else {

    const image =

      document.createElement(
        "img"
      );


    image.src =

      getDropboxFileUrl(
        item.path
      );


    image.alt =

      titleFromFilename(
        item.name
      );


    memoryLightboxMedia
      .appendChild(
        image
      );

  }


  memoryLightboxTitle.textContent =

    titleFromFilename(
      item.name
    );


  memoryLightboxCount.textContent =

    `${lightboxIndex + 1} of ${currentAlbumItems.length}`;


  const showArrows =

    currentAlbumItems.length >
      1;


  memoryLightboxPrev.hidden =

    !showArrows;


  memoryLightboxNext.hidden =

    !showArrows;

}


/* =========================================================
   LIGHTBOX PREVIOUS
========================================================= */

function showPreviousMemory() {

  if (
    currentAlbumItems.length ===
      0
  ) {

    return;

  }


  lightboxIndex =

    (

      lightboxIndex

      -

      1

      +

      currentAlbumItems.length

    )

    %

    currentAlbumItems.length;


  renderMemoryLightbox();

}


/* =========================================================
   LIGHTBOX NEXT
========================================================= */

function showNextMemory() {

  if (
    currentAlbumItems.length ===
      0
  ) {

    return;

  }


  lightboxIndex =

    (

      lightboxIndex

      +

      1

    )

    %

    currentAlbumItems.length;


  renderMemoryLightbox();

}


/* =========================================================
   CLOSE LIGHTBOX
========================================================= */

function closeMemoryLightbox() {

  memoryLightbox
    .classList
    .remove(
      "is-open"
    );


  memoryLightbox
    .setAttribute(
      "aria-hidden",
      "true"
    );


  memoryLightboxMedia.innerHTML =
    "";


  document.body.style.overflow =
    "";

}


/* =========================================================
   LIGHTBOX EVENTS
========================================================= */

memoryLightboxClose
  .addEventListener(

    "click",

    closeMemoryLightbox

  );


memoryLightboxBackdrop
  .addEventListener(

    "click",

    closeMemoryLightbox

  );


memoryLightboxPrev
  .addEventListener(

    "click",

    showPreviousMemory

  );


memoryLightboxNext
  .addEventListener(

    "click",

    showNextMemory

  );


/* =========================================================
   KEYBOARD CONTROLS
========================================================= */

document
  .addEventListener(

    "keydown",

    event => {

      const lightboxOpen =

        memoryLightbox
          .classList
          .contains(
            "is-open"
          );


      if (
        !lightboxOpen
      ) {

        return;

      }


      if (
        event.key ===
          "Escape"
      ) {

        closeMemoryLightbox();

      }


      if (
        event.key ===
          "ArrowLeft"
      ) {

        showPreviousMemory();

      }


      if (
        event.key ===
          "ArrowRight"
      ) {

        showNextMemory();

      }

    }

  );


/* =========================================================
   BROWSER BACK / FORWARD
========================================================= */

window
  .addEventListener(

    "popstate",

    () => {

      const requestedPath =

        getRequestedFolderPath();


      const folder =

        findFolderByRelativePath(
          requestedPath
        )

        ||

        memoryRootTree;


      currentMemoryFolder =
        folder;


      renderCurrentMemoryFolder();

    }

  );


/* =========================================================
   LOADING STATE
========================================================= */

function showMemoriesLoading() {

  memoriesContent.innerHTML = `

    <div
      class="
        memories-loading
      "
    >

      Loading memories…

    </div>

  `;

}


/* =========================================================
   ERROR STATE
========================================================= */

function showMemoriesError(
  message
) {

  memoriesContent.innerHTML = `

    <div
      class="
        memories-error
      "
    >

      <h2>
        Memories could not be loaded
      </h2>

      <p>
        ${String(
          message ?? ""
        )}
      </p>

    </div>

  `;

}


/* =========================================================
   INITIALISE MEMORIES
========================================================= */

async function initialiseMemories() {

  showMemoriesLoading();


  try {

    const entries =

      await fetchAllMemoryEntries();


    memoryRootTree =

      buildMemoryFolderTree(
        entries
      );


    const requestedPath =

      getRequestedFolderPath();


    const requestedFolder =

      findFolderByRelativePath(
        requestedPath
      );


    currentMemoryFolder =

      requestedFolder

      ||

      memoryRootTree;


    renderCurrentMemoryFolder();

  }

  catch (
    error
  ) {

    console.error(

      "Memories loading failed:",

      error

    );


    showMemoriesError(

      error.message

      ||

      "An unknown error occurred."

    );

  }

}


/* =========================================================
   START
========================================================= */

initialiseMemories();