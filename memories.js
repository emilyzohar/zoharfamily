/* =========================================================
   DROPBOX MEMORIES SETTINGS
========================================================= */

const DROPBOX_API_BASE =
  "https://family-photo-api.emilyzohar.workers.dev";


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

const memoriesPageContext =
  getPersonalPageContext(
    "Memories"
  );

/*
  All actual memory folders and media live in one shared Dropbox location.

  Person-specific Memories pages do NOT duplicate those files. Instead they
  read a small manifest at:

  /Zohar Family/Works/{Person}/Memories/albums.txt

  The manifest defines virtual personalized folders using:

  New Folder Name ->
  image-or-folder-reference
  another-image-reference

  The real media stays in /Zohar Family/Memories. Blank lines and # comments
  are ignored.
*/

const SHARED_MEMORIES_ROOT =
  "/Zohar Family/Memories";

const PERSON_MEMORIES_ROOT =
  memoriesPageContext.person
    ? `/Zohar Family/Works/${memoriesPageContext.person}/${memoriesPageContext.section}`
    : "";

const PERSON_MEMORIES_MANIFEST =
  PERSON_MEMORIES_ROOT
    ? `${PERSON_MEMORIES_ROOT}/albums.txt`
    : "";

/*
  The rendered tree always uses paths from the shared Memories library so
  existing media URLs, breadcrumbs and folder navigation continue to work.
*/
const DROPBOX_MEMORIES_ROOT =
  SHARED_MEMORIES_ROOT;

if (memoriesPageContext.person) {
  document.title =
    `${memoriesPageContext.person}'s Memories | Zohar Family`;
}


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


async function getDropboxPreviewUrl(
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
    throw new Error(
      await response.text()
        .catch(
          () =>
            `Could not preview ${path}`
        )
    );
  }

  const data =
    await response.json();

  if (
    !data?.url
  ) {
    throw new Error(
      "Dropbox did not return a preview link."
    );
  }

  const previewUrl =
    new URL(
      data.url
    );

  previewUrl.searchParams.delete(
    "raw"
  );

  previewUrl.searchParams.set(
    "dl",
    "0"
  );

  return previewUrl.toString();
}


async function openMemoryDocumentPreview(
  path
) {
  const previewWindow =
    window.open(
      "",
      "_blank"
    );

  if (
    !previewWindow
  ) {
    alert(
      "Please allow pop-ups for this website to preview the document."
    );

    return;
  }

  previewWindow.opener =
    null;

  previewWindow.document.title =
    "Opening preview…";

  previewWindow.document.body.innerHTML = `
    <p style="font-family:Georgia,serif;padding:32px;color:#681116">
      Opening preview…
    </p>
  `;

  try {
    previewWindow.location.replace(
      await getDropboxPreviewUrl(
        path
      )
    );

  } catch (
    error
  ) {
    previewWindow.document.title =
      "Preview unavailable";

    previewWindow.document.body.innerHTML = `
      <div style="font-family:Georgia,serif;padding:32px;color:#681116">
        <h1>Preview unavailable</h1>
        <p>${String(error?.message || "The document could not be previewed.")}</p>
      </div>
    `;
  }
}


/* =========================================================
   DROPBOX TEXT FILE
========================================================= */

async function getDropboxText(
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

    throw new Error(
      `Text file could not be loaded: ${path}`
    );

  }

  return response.text();

}


/* =========================================================
   PERSON MEMORIES MANIFEST

   albums.txt creates VIRTUAL folders for a person while all real media
   remains stored once in /Zohar Family/Memories.

   Recommended format:

   Family Holidays ->
   IMG_1234.jpg
   Italy 1984/IMG_5678.jpg
   Cottage

   Old Family Photos ->
   1970s/photo1.jpg
   1970s/photo2.jpg

   You may also put references on the same line:

   Family Holidays -> IMG_1234.jpg, IMG_5678.jpg

   Rules:
   - text before -> is the NEW folder name shown on the personal page
   - following lines belong to that folder until the next -> heading
   - a reference may be a shared folder name/path OR a media filename/path
   - folder references contribute all supported photos/videos beneath them
   - blank lines and # comments are ignored
   - matching is case-insensitive
========================================================= */

function cleanVirtualMemoryFolderName(
  value
) {

  return String(
    value ?? ""
  )
    .trim()
    .replace(
      /[\\/]+/g,
      " - "
    )
    .replace(
      /\s+/g,
      " "
    );

}


function splitManifestReferences(
  value
) {

  return String(
    value ?? ""
  )
    .split(
      ","
    )
    .map(
      reference =>
        trimSlashes(
          reference.trim()
        )
    )
    .filter(
      Boolean
    );

}


function parsePersonMemoriesManifest(
  text
) {

  const groups = [];

  const manifestLines =
    String(
      text ?? ""
    )
      .split(
        /\r?\n/
      )
      .map(
        rawLine =>
          rawLine.trim()
      )
      .filter(
        line =>
          Boolean(
            line
          )
          &&
          !line.startsWith(
            "#"
          )
      );


  function ensureGroup(
    name
  ) {

    const cleanName =
      cleanVirtualMemoryFolderName(
        name
      );

    if (
      !cleanName
    ) {
      return null;
    }

    const existing =
      groups.find(
        group =>
          group.name.toLocaleLowerCase() ===
            cleanName.toLocaleLowerCase()
      );

    if (
      existing
    ) {
      return existing;
    }

    const group = {
      name:
        cleanName,
      references:
        []
    };

    groups.push(
      group
    );

    return group;

  }


  /*
    Simple albums.txt format:

    Italy 1984
    Cottage
    Photographs

    When the file contains no -> headings at all, each line is treated as
    one existing album/reference and keeps that album's original name.
  */
  const hasArrowHeadings =
    manifestLines.some(
      line =>
        line.includes(
          "->"
        )
    );


  if (
    !hasArrowHeadings
  ) {

    manifestLines.forEach(
      line => {

        splitManifestReferences(
          line
        ).forEach(
          reference => {

            const originalName =
              getFilename(
                trimSlashes(
                  reference
                )
              )
              ||
              reference;

            const group =
              ensureGroup(
                originalName
              );

            if (
              group
            ) {
              group.references.push(
                reference
              );
            }

          }
        );

      }
    );

  }
  else {

    let currentGroup = null;

    manifestLines.forEach(
      line => {

        const arrowIndex =
          line.indexOf(
            "->"
          );

        if (
          arrowIndex !==
            -1
        ) {

          const folderName =
            line.slice(
              0,
              arrowIndex
            );

          currentGroup =
            ensureGroup(
              folderName
            );

          if (
            !currentGroup
          ) {
            return;
          }

          const sameLineReferences =
            splitManifestReferences(
              line.slice(
                arrowIndex + 2
              )
            );

          currentGroup.references.push(
            ...sameLineReferences
          );

          return;

        }

        /*
          Lines following a -> heading are references belonging to that
          renamed album. If a plain line appears before the first heading,
          keep its own original album name instead of calling it
          "Selected Memories".
        */
        if (
          currentGroup
        ) {

          currentGroup.references.push(
            ...splitManifestReferences(
              line
            )
          );

          return;

        }

        splitManifestReferences(
          line
        ).forEach(
          reference => {

            const originalName =
              getFilename(
                trimSlashes(
                  reference
                )
              )
              ||
              reference;

            const group =
              ensureGroup(
                originalName
              );

            if (
              group
            ) {
              group.references.push(
                reference
              );
            }

          }
        );

      }
    );

  }


  groups.forEach(
    group => {

      const seen =
        new Set();

      group.references =
        group.references.filter(
          reference => {

            const key =
              reference.toLocaleLowerCase();

            if (
              seen.has(
                key
              )
            ) {
              return false;
            }

            seen.add(
              key
            );

            return true;

          }
        );

    }
  );


  return groups.filter(
    group =>
      group.references.length >
        0
  );

}

function getMemoryRelativePath(
  path
) {

  const normalizedRoot =
    normalizePathKey(
      SHARED_MEMORIES_ROOT
    );

  const normalizedPath =
    normalisePath(
      path
    );

  const normalizedPathKey =
    normalizePathKey(
      normalizedPath
    );

  if (
    normalizedPathKey ===
      normalizedRoot
  ) {
    return "";
  }

  if (
    normalizedPathKey.startsWith(
      `${normalizedRoot}/`
    )
  ) {

    return trimSlashes(
      normalizedPath.slice(
        SHARED_MEMORIES_ROOT.length
      )
    );

  }

  return trimSlashes(
    normalizedPath
  );

}


function isSupportedMemoryMediaEntry(
  entry
) {

  if (
    String(
      entry?.type ?? ""
    ).toLowerCase() !==
      "file"
  ) {
    return false;
  }

  const extension =
    getExtension(
      getEntryPath(
        entry
      )
    );

  return (
    MEMORY_IMAGE_EXTENSIONS.has(
      extension
    )
    ||
    MEMORY_VIDEO_EXTENSIONS.has(
      extension
    )
  );

}


/* =========================================================
   DOCUMENT LINKS INSIDE MEMORY ALBUMS

   Any .txt or .pdf file inside a Memories folder is shown as a
   link at the top of that album. A .txt may contain multiple
   `Title | URL` lines. A legacy .txt containing one bare URL is
   also supported. PDFs open the Dropbox-served file directly.
========================================================= */

function isMemoryLinkTextEntry(
  entry
) {

  if (
    String(
      entry?.type ?? ""
    ).toLowerCase() !==
      "file"
  ) {
    return false;
  }

  const name =
    String(
      entry.name
      ||
      getFilename(
        getEntryPath(
          entry
        )
      )
      ||
      ""
    )
      .trim()
      .toLowerCase();

  return (
    getExtension(
      name
    ) === "txt"
    &&
    name !== "albums.txt"
  );

}




function isMemoryLinkPdfEntry(
  entry
) {

  if (
    String(
      entry?.type ?? ""
    ).toLowerCase() !==
      "file"
  ) {
    return false;
  }

  return (
    getExtension(
      entry.name
      ||
      getEntryPath(
        entry
      )
    ) === "pdf"
  );

}


function isMemoryAlbumLinkEntry(
  entry
) {

  return (
    isMemoryLinkTextEntry(
      entry
    )
    ||
    isMemoryLinkPdfEntry(
      entry
    )
  );

}


function getMemoryUrlFromText(
  text
) {

  const cleanText =
    String(
      text ?? ""
    ).trim();

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
      parsedUrl.protocol !== "http:"
      &&
      parsedUrl.protocol !== "https:"
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


/*
  One Memories .txt file can define multiple links:

  Family Tree | https://example.com/tree
  Old Home Movie | https://example.com/video

  Blank lines and # comments are ignored. For backwards
  compatibility, a file containing only one bare URL still
  becomes one link whose title comes from the .txt filename.
*/
function parseMemoryTextLinks(
  text,
  fallbackTitle
) {

  const cleanText =
    String(
      text ?? ""
    ).trim();

  if (
    !cleanText
  ) {
    return [];
  }

  const legacyUrl =
    getMemoryUrlFromText(
      cleanText
    );

  if (
    legacyUrl
  ) {
    return [{
      title:
        fallbackTitle,

      url:
        legacyUrl
    }];
  }

  const parsedLinks =
    [];

  cleanText
    .split(
      /\r?\n/
    )
    .map(
      line =>
        line.trim()
    )
    .filter(
      line =>
        line
        &&
        !line.startsWith(
          "#"
        )
    )
    .forEach(
      line => {

        const separatorIndex =
          line.indexOf(
            "|"
          );

        if (
          separatorIndex < 0
        ) {
          return;
        }

        const title =
          line
            .slice(
              0,
              separatorIndex
            )
            .trim();

        const rawUrl =
          line
            .slice(
              separatorIndex + 1
            )
            .trim();

        const url =
          getMemoryUrlFromText(
            rawUrl
          );

        if (
          !title
          ||
          !url
        ) {
          return;
        }

        parsedLinks.push({
          title,
          url
        });

      }
    );

  return parsedLinks;

}


async function identifyMemoryFolderLinks(
  rootFolder
) {

  const pending =
    [];

  function collect(
    folder
  ) {

    folder.links =
      [];

    folder.files
      .filter(
        file =>
          isMemoryAlbumLinkEntry(
            file
          )
      )
      .forEach(
        file => {

          pending.push(
            (async () => {

              if (
                isMemoryLinkTextEntry(
                  file
                )
              ) {

                try {

                  const text =
                    await getDropboxText(
                      file.path
                    );

                  const parsedLinks =
                    parseMemoryTextLinks(
                      text,
                      titleFromFilename(
                        file.name
                      )
                    );

                  if (
                    parsedLinks.length > 0
                  ) {

                    parsedLinks.forEach(
                      parsedLink => {

                        folder.links.push({
                          title:
                            parsedLink.title,

                          url:
                            parsedLink.url,

                          path:
                            file.path,

                          type:
                            "text"
                        });

                      }
                    );

                    return;

                  }

                } catch (
                  error
                ) {

                  console.warn(
                    `Could not inspect Memories text file: ${file.path}`,
                    error
                  );

                }

              }

              /*
                PDFs always link directly to the file. A text file that
                contains no valid Title | URL lines also falls back to the
                original behavior of linking to the .txt file itself.
              */
              folder.links.push({
                title:
                  titleFromFilename(
                    file.name
                  ),

                url:
                  getDropboxFileUrl(
                    file.path
                  ),

                path:
                  file.path,

                type:
                  isMemoryLinkPdfEntry(
                    file
                  )
                    ? "pdf"
                    : "text"
              });

            })()
          );

        }
      );

    folder.folders.forEach(
      collect
    );

  }

  collect(
    rootFolder
  );

  await Promise.all(
    pending
  );

  function sortLinks(
    folder
  ) {

    folder.links.sort(
      (
        linkA,
        linkB
      ) =>
        compareNaturally(
          linkA.title,
          linkB.title
        )
    );

    folder.folders.forEach(
      sortLinks
    );

  }

  sortLinks(
    rootFolder
  );

}


function createPersonMemoryEntryIndex(
  entries
) {

  return entries.map(
    entry => {

      const path =
        getEntryPath(
          entry
        );

      return {
        entry,
        path,
        pathKey:
          normalizePathKey(
            path
          ),
        relativePath:
          getMemoryRelativePath(
            path
          ),
        relativePathKey:
          getMemoryRelativePath(
            path
          ).toLocaleLowerCase(),
        name:
          String(
            entry.name
            ||
            getFilename(
              path
            )
            ||
            ""
          ),
        nameKey:
          String(
            entry.name
            ||
            getFilename(
              path
            )
            ||
            ""
          ).toLocaleLowerCase(),
        type:
          String(
            entry.type ?? ""
          ).toLowerCase()
      };

    }
  );

}


function resolvePersonMemoryReference(
  reference,
  indexedEntries
) {

  const cleanReference =
    trimSlashes(
      reference
    );

  const referenceKey =
    cleanReference.toLocaleLowerCase();

  const looksLikePath =
    cleanReference.includes(
      "/"
    );

  const selected = [];

  const selectedKeys =
    new Set();


  function addMedia(
    item
  ) {

    if (
      !item
      ||
      !(
        isSupportedMemoryMediaEntry(
          item.entry
        )
        ||
        isMemoryLinkTextEntry(
          item.entry
        )
      )
      ||
      selectedKeys.has(
        item.pathKey
      )
    ) {
      return;
    }

    selectedKeys.add(
      item.pathKey
    );

    selected.push(
      item.entry
    );

  }


  function addFolderMedia(
    folderItem
  ) {

    const folderKey =
      folderItem.pathKey;

    indexedEntries.forEach(
      item => {

        if (
          item.type ===
            "file"
          &&
          item.pathKey.startsWith(
            `${folderKey}/`
          )
        ) {
          addMedia(
            item
          );
        }

      }
    );

  }


  /* Exact shared relative path first. */
  const exactMatches =
    indexedEntries.filter(
      item =>
        item.relativePathKey ===
          referenceKey
    );

  if (
    exactMatches.length
  ) {

    exactMatches.forEach(
      item => {

        if (
          item.type ===
            "folder"
        ) {
          addFolderMedia(
            item
          );
        }
        else {
          addMedia(
            item
          );
        }

      }
    );

    return selected;

  }


  if (
    looksLikePath
  ) {

    console.warn(
      `Memory reference listed in ${PERSON_MEMORIES_MANIFEST} was not found in ${SHARED_MEMORIES_ROOT}: ${reference}`
    );

    return selected;

  }


  /* Bare folder name. */
  const folderMatches =
    indexedEntries.filter(
      item =>
        item.type ===
          "folder"
        &&
        item.nameKey ===
          referenceKey
    );

  if (
    folderMatches.length
  ) {

    if (
      folderMatches.length >
        1
    ) {
      console.warn(
        `Multiple Memories folders are named "${reference}". All matches were included. Use a relative path in ${PERSON_MEMORIES_MANIFEST} for precision.`
      );
    }

    folderMatches.forEach(
      addFolderMedia
    );

    return selected;

  }


  /* Bare media filename. */
  const mediaMatches =
    indexedEntries.filter(
      item =>
        item.type ===
          "file"
        &&
        item.nameKey ===
          referenceKey
        &&
        (
          isSupportedMemoryMediaEntry(
            item.entry
          )
          ||
          isMemoryLinkTextEntry(
            item.entry
          )
        )
    );

  if (
    mediaMatches.length
  ) {

    if (
      mediaMatches.length >
        1
    ) {
      console.warn(
        `Multiple Memories files are named "${reference}". All matches were included. Use a relative path in ${PERSON_MEMORIES_MANIFEST} for precision.`
      );
    }

    mediaMatches.forEach(
      addMedia
    );

    return selected;

  }


  console.warn(
    `Memory reference listed in ${PERSON_MEMORIES_MANIFEST} was not found in ${SHARED_MEMORIES_ROOT}: ${reference}`
  );

  return selected;

}


function buildPersonMemoryFolderTree(
  groups,
  allEntries
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

  const indexedEntries =
    createPersonMemoryEntryIndex(
      allEntries
    );

  const seenLooseMediaPaths =
    new Set();


  groups.forEach(
    group => {

      const normalizedGroupName =
        String(
          group.name || ""
        )
          .trim()
          .toLowerCase();

      const singleReference =
        group.references.length === 1
          ? trimSlashes(group.references[0])
          : "";

      const singleReferenceExtension =
        getExtension(
          singleReference
        );

      const isLegacySinglePhotoGroup =
        Boolean(singleReference)
        &&
        normalizedGroupName ===
          getFilename(singleReference).toLowerCase()
        &&
        (
          MEMORY_IMAGE_EXTENSIONS.has(singleReferenceExtension)
          ||
          MEMORY_VIDEO_EXTENSIONS.has(singleReferenceExtension)
        );

      const isLooseGroup =
        normalizedGroupName ===
          "@loose"
        ||
        isLegacySinglePhotoGroup;

      const folder =
        isLooseGroup
          ? null
          : {
              name:
                group.name,
              path:
                `${DROPBOX_MEMORIES_ROOT}/${group.name}`,
              files:
                [],
              folders:
                [],
              parent:
                root
            };

      const seenMediaPaths =
        new Set();


      group.references.forEach(
        reference => {

          const matchedMedia =
            resolvePersonMemoryReference(
              reference,
              indexedEntries
            );

          matchedMedia.forEach(
            entry => {

              const sourcePath =
                getEntryPath(
                  entry
                );

              const sourceKey =
                normalizePathKey(
                  sourcePath
                );

              if (
                seenMediaPaths.has(
                  sourceKey
                )
              ) {
                return;
              }

              seenMediaPaths.add(
                sourceKey
              );

              const mediaFile = {
                type:
                  "file",
                name:
                  entry.name
                  ||
                  getFilename(
                    sourcePath
                  ),
                path:
                  sourcePath,
                size:
                  entry.size
                  ??
                  null
              };

              if (
                isLooseGroup
              ) {
                if (
                  seenLooseMediaPaths.has(
                    sourceKey
                  )
                ) {
                  return;
                }

                seenLooseMediaPaths.add(
                  sourceKey
                );

                root.files.push(
                  mediaFile
                );

                return;
              }

              folder.files.push(
                mediaFile
              );

            }
          );

        }
      );

      if (
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

        if (
          folder.files.length
        ) {
          root.folders.push(
            folder
          );
        }
      }

    }
  );


  root.files.sort(
    (
      fileA,
      fileB
    ) =>
      compareNaturally(
        fileA.name,
        fileB.name
      )
  );


  root.folders.sort(
    (
      folderA,
      folderB
    ) =>
      compareNaturally(
        folderA.name,
        folderB.name
      )
  );


  return root;

}

async function fetchPersonMemoryEntries() {

  if (
    !memoriesPageContext.person
    ||
    !PERSON_MEMORIES_ROOT
  ) {
    return [];
  }

  const response =
    await fetch(
      buildDropboxApiUrl(
        "/folder",
        {
          path:
            PERSON_MEMORIES_ROOT,

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

    /*
      A person can still have a Memories page driven entirely
      by albums.txt/shared references. A missing local folder
      therefore behaves like an empty local folder.
    */
    if (
      response.status ===
        409
      ||
      response.status ===
        404
    ) {
      return [];
    }

    const errorText =
      await response.text();

    throw new Error(
      `Could not load personal memories. HTTP ${response.status}. ${errorText}`
    );
  }


  const entries =
    await response.json();


  return Array.isArray(
    entries
  )
    ? entries
    : [];

}


function getPersonalMemoryRelativePath(
  path
) {

  const normalizedRoot =
    normalizePathKey(
      PERSON_MEMORIES_ROOT
    );

  const normalizedPath =
    normalisePath(
      path
    );

  const normalizedPathKey =
    normalizePathKey(
      normalizedPath
    );

  if (
    normalizedPathKey ===
      normalizedRoot
  ) {
    return "";
  }

  if (
    normalizedPathKey.startsWith(
      `${normalizedRoot}/`
    )
  ) {

    return trimSlashes(
      normalizedPath.slice(
        PERSON_MEMORIES_ROOT.length
      )
    );

  }

  return trimSlashes(
    normalizedPath
  );

}


function addPersonalMemoryEntriesToTree(
  root,
  personalEntries
) {

  /*
    Local folders inside /Works/{Person}/Memories are real albums on the
    personal Memories page. Their hierarchy is preserved instead of flattening
    every local photo/video into the Memories root.

    Example:

    Memories/
      albums.txt
      Photographs/
        photo1.jpg
        photo2.jpg

    renders "Photographs" as a folder, with the two images inside it.
  */

  const existingMediaPaths =
    new Set();


  function indexExistingMedia(
    folder
  ) {

    folder.files.forEach(
      file => {
        existingMediaPaths.add(
          normalizePathKey(
            file.path
          )
        );
      }
    );

    folder.folders.forEach(
      indexExistingMedia
    );

  }


  indexExistingMedia(
    root
  );


  function ensurePersonalFolder(
    relativeFolderPath
  ) {

    const cleanRelativePath =
      trimSlashes(
        relativeFolderPath
      );

    if (
      !cleanRelativePath
    ) {
      return root;
    }

    const segments =
      cleanRelativePath
        .split(
          "/"
        )
        .filter(
          Boolean
        );

    let parent =
      root;

    const builtSegments =
      [];


    segments.forEach(
      segment => {

        builtSegments.push(
          segment
        );

        let folder =
          parent.folders.find(
            child =>
              child.name.toLocaleLowerCase() ===
                segment.toLocaleLowerCase()
          );

        if (
          !folder
        ) {

          folder = {
            name:
              segment,

            /*
              Folder paths remain virtual beneath the normal Memories root so
              existing URL state, folder navigation and breadcrumbs continue
              to work. Media files themselves retain their real Dropbox paths.
            */
            path:
              `${DROPBOX_MEMORIES_ROOT}/${builtSegments.join("/")}`,

            files:
              [],

            folders:
              [],

            parent
          };

          parent.folders.push(
            folder
          );

        }

        parent =
          folder;

      }
    );


    return parent;

  }


  /* Create local folder nodes first, from shallowest to deepest. */
  personalEntries
    .filter(
      entry =>
        String(
          entry?.type ?? ""
        ).toLowerCase() ===
          "folder"
    )
    .sort(
      (
        entryA,
        entryB
      ) =>
        getPathDepth(
          getPersonalMemoryRelativePath(
            getEntryPath(
              entryA
            )
          )
        )
        -
        getPathDepth(
          getPersonalMemoryRelativePath(
            getEntryPath(
              entryB
            )
          )
        )
    )
    .forEach(
      entry => {

        ensurePersonalFolder(
          getPersonalMemoryRelativePath(
            getEntryPath(
              entry
            )
          )
        );

      }
    );


  /* Add each local image/video or linked .txt/.pdf to its actual local subfolder. */
  personalEntries
    .filter(
      entry =>
        isSupportedMemoryMediaEntry(
          entry
        )
        ||
        isMemoryAlbumLinkEntry(
          entry
        )
    )
    .forEach(
      entry => {

        const sourcePath =
          getEntryPath(
            entry
          );

        const sourceKey =
          normalizePathKey(
            sourcePath
          );

        if (
          !sourcePath
          ||
          existingMediaPaths.has(
            sourceKey
          )
        ) {
          return;
        }

        const relativeFilePath =
          getPersonalMemoryRelativePath(
            sourcePath
          );

        const relativeParentPath =
          getParentPath(
            relativeFilePath
          );

        const parentFolder =
          ensurePersonalFolder(
            relativeParentPath
          );

        existingMediaPaths.add(
          sourceKey
        );

        parentFolder.files.push({
          type:
            "file",

          name:
            entry.name
            ||
            getFilename(
              sourcePath
            ),

          /* Real Dropbox path is required for the image/video URL. */
          path:
            sourcePath,

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

async function getPersonMemoryTree(
  sharedEntries,
  personalEntries = []
) {

  let groups =
    [];


  /*
    albums.txt remains optional. When present it continues to
    create the existing virtual albums that point into the shared
    /Zohar Family/Memories library.
  */
  try {

    const manifestText =
      await getDropboxText(
        PERSON_MEMORIES_MANIFEST
      );


    groups =
      parsePersonMemoriesManifest(
        manifestText
      );

  } catch (
    error
  ) {

    console.info(
      `No usable personal Memories manifest at ${PERSON_MEMORIES_MANIFEST}.`
    );

  }


  const root =
    buildPersonMemoryFolderTree(
      groups,
      sharedEntries
    );


  return addPersonalMemoryEntriesToTree(
    root,
    personalEntries
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


  const nextUrl =
    new URL(
      window.location.href
    );


  if (
    relativePath
  ) {

    nextUrl.searchParams.set(
      "folder",
      relativePath
    );

  }

  else {

    nextUrl.searchParams.delete(
      "folder"
    );

  }


  const url =
    `${nextUrl.pathname}${nextUrl.search}`;


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

    /*
      A personal Memories page may now contain both the existing
      albums.txt-linked virtual albums and media files physically
      stored inside /Works/{Person}/Memories.

      When local media exists, show it on the same page beneath
      the linked albums. With no local media, preserve the original
      large-polaroid album landing page.
    */
    if (
      memoriesPageContext.person
      &&
      hasDirectMedia
    ) {

      memoriesPageSubtitle.textContent =
        "";

      if (
        hasSubfolders
      ) {

        renderMixedMemoryFolder(
          currentMemoryFolder
        );

      } else {

        renderDigitalAlbum(
          currentMemoryFolder
        );

      }

      return;
    }


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

  const hasLinks =
    renderMemoryFolderLinks(
      folder
    );

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
    &&
    !hasLinks
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
   ALBUM LINKS
========================================================= */

function renderMemoryFolderLinks(
  folder
) {

  const links =
    folder?.links
    ||
    [];

  if (
    links.length === 0
  ) {
    return false;
  }

  const section =
    document.createElement(
      "section"
    );

  section.className =
    "memory-album-links-wrap";

  const heading =
    document.createElement(
      "h2"
    );

  heading.textContent =
    "Videos";

  section.appendChild(
    heading
  );

  const linksWrap =
    document.createElement(
      "div"
    );

  linksWrap.className =
    "memory-album-links";

  links.forEach(
    linkData => {

      const link =
        document.createElement(
          "a"
        );

      link.className =
        "memory-album-link";

      link.href =
        linkData.url;

      link.textContent =
        linkData.title;

      link.target =
        "_blank";

      link.rel =
        "noopener";

      if (
        linkData.type ===
          "pdf"
        &&
        linkData.path
      ) {
        link.addEventListener(
          "click",
          event => {
            event.preventDefault();

            openMemoryDocumentPreview(
              linkData.path
            );
          }
        );
      }

      linksWrap.appendChild(
        link
      );

    }
  );

  section.appendChild(
    linksWrap
  );

  memoriesContent.appendChild(
    section
  );

  return true;

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

  renderMemoryFolderLinks(
    currentMemoryFolder
  );


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

  const hasLinks =
    renderMemoryFolderLinks(
      folder
    );


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

    if (
      !hasLinks
    ) {

      memoriesContent.insertAdjacentHTML(
        "beforeend",
        `

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

        `
      );

    }

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

    const [
      allEntries,
      personalEntries
    ] =

      await Promise.all([

        fetchAllMemoryEntries(),

        memoriesPageContext.person
          ? fetchPersonMemoryEntries()
          : Promise.resolve([])

      ]);


    memoryRootTree =

      memoriesPageContext.person

        ? await getPersonMemoryTree(
            allEntries,
            personalEntries
          )

        : buildMemoryFolderTree(
            allEntries
          );


    await identifyMemoryFolderLinks(
      memoryRootTree
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