/* ============================================
   CONFIGURATION
============================================ */

const PHOTO_API =
  "https://family-photo-api.emilyzohar.workers.dev";


const TRAVEL_ROOT =
  "/Travel";


const TRIP_METADATA_FILE =
  "trip.txt";


const TRIP_IMAGES_FOLDER =
  "images";


/* ============================================
   PAGE ELEMENTS
============================================ */

const travelMap =
  document.getElementById(
    "travel-map"
  );


const travelPins =
  document.getElementById(
    "travel-pins"
  );


const coordinateHelper =
  document.getElementById(
    "coordinate-helper"
  );


/* ============================================
   TRAVEL MODAL ELEMENTS
============================================ */

const travelModal =
  document.getElementById(
    "travel-modal"
  );


const travelModalBackdrop =
  document.getElementById(
    "travel-modal-backdrop"
  );


const travelModalClose =
  document.getElementById(
    "travel-modal-close"
  );


const travelModalTitle =
  document.getElementById(
    "travel-modal-title"
  );


const travelModalYear =
  document.getElementById(
    "travel-modal-year"
  );


const travelModalTravelers =
  document.getElementById(
    "travel-modal-travelers"
  );


const travelModalGeneration =
  document.getElementById(
    "travel-modal-generation"
  );


const travelModalBlurb =
  document.getElementById(
    "travel-modal-blurb"
  );


const travelCarouselImage =
  document.getElementById(
    "travel-carousel-image"
  );


const travelImagePrev =
  document.getElementById(
    "travel-image-prev"
  );


const travelImageNext =
  document.getElementById(
    "travel-image-next"
  );


const travelImageCounter =
  document.getElementById(
    "travel-image-counter"
  );


const travelImageDots =
  document.getElementById(
    "travel-image-dots"
  );


const travelPdfLinks =
  document.getElementById(
    "travel-pdf-links"
  );


/* ============================================
   IMAGE SECTION

   Best option:
   Give the complete carousel container:

   id="travel-image-section"

   This fallback uses the image's parent
   if that ID does not exist.
============================================ */

const travelImageSection =

  document.getElementById(
    "travel-image-section"
  )

  ||

  travelCarouselImage?.closest(
    ".travel-image-section"
  )

  ||

  travelCarouselImage?.parentElement

  ||

  null;


/* ============================================
   FULL-SCREEN LIGHTBOX ELEMENTS

   These should exist in travel.html.
============================================ */

const travelLightbox =
  document.getElementById(
    "travel-lightbox"
  );


const travelLightboxBackdrop =
  document.getElementById(
    "travel-lightbox-backdrop"
  );


const travelLightboxClose =
  document.getElementById(
    "travel-lightbox-close"
  );


const travelLightboxImage =
  document.getElementById(
    "travel-lightbox-image"
  );


const travelLightboxPrev =
  document.getElementById(
    "travel-lightbox-prev"
  );


const travelLightboxNext =
  document.getElementById(
    "travel-lightbox-next"
  );


const travelLightboxCounter =
  document.getElementById(
    "travel-lightbox-counter"
  );


/* ============================================
   STATE
============================================ */

let TRAVELS =
  [];


let currentTravelIndex =
  0;


let currentImageIndex =
  0;


/* ============================================
   LOAD ALL TRAVEL DATA
============================================ */

async function loadTravelData() {

  try {

    const rootEntries =
      await getDropboxFolder(
        TRAVEL_ROOT
      );


    /* ========================================
       EVERY FOLDER DIRECTLY UNDER /Travel
       IS CONSIDERED A POSSIBLE TRIP.
    ======================================== */

    const tripFolders =

      rootEntries.filter(

        entry =>

          entry.type ===
          "folder"

      );


    /* ========================================
       LOAD ALL TRIPS
    ======================================== */

    const results =

      await Promise.all(

        tripFolders.map(

          folder =>

            loadTripFromDropbox(
              folder
            )

        )

      );


    /* ========================================
       REMOVE INVALID / NON-TRIP FOLDERS
    ======================================== */

    TRAVELS =

      results.filter(
        Boolean
      );


    renderTravelPins();


  } catch (
    error
  ) {

    console.error(

      "Could not load Travel page:",

      error

    );


    if (
      travelPins
    ) {

      travelPins.innerHTML =
        "";

    }

  }

}


/* ============================================
   LOAD ONE TRIP FROM DROPBOX
============================================ */

async function loadTripFromDropbox(
  folder
) {

  const tripFolderPath =
    folder.path;


  const tripTextPath =

    `${tripFolderPath}/${TRIP_METADATA_FILE}`;


  /* ========================================
     READ trip.txt

     NO trip.txt = IGNORE THIS FOLDER
  ======================================== */

  let tripText;


  try {

    tripText =
      await getDropboxText(
        tripTextPath
      );

  } catch (
    error
  ) {

    console.warn(

      `Skipping ${folder.name}: no usable trip.txt`

    );


    return null;

  }


  const metadata =
    parseTripText(
      tripText
    );


  /* ========================================
     REQUIRE TITLE + COORDINATES
  ======================================== */

  if (

    !metadata.title

    ||

    !Number.isFinite(
      metadata.x
    )

    ||

    !Number.isFinite(
      metadata.y
    )

  ) {

    console.warn(

      `Skipping ${folder.name}: trip.txt is missing Title, X, or Y`

    );


    return null;

  }


  /* ========================================
     READ DIRECT CONTENTS OF TRIP FOLDER

     Example:

     trip.txt
     document.pdf
     video.mov
     images/
  ======================================== */

  let tripFolderEntries =
    [];


  try {

    tripFolderEntries =
      await getDropboxFolder(
        tripFolderPath
      );

  } catch (
    error
  ) {

    console.error(

      `Could not read ${tripFolderPath}:`,

      error

    );


    return null;

  }


  /* ========================================
     AUTOMATIC TRIP DOCUMENTS

     EVERY FILE DIRECTLY INSIDE THE TRIP
     FOLDER APPEARS AS A TRIP DOCUMENT,

     EXCEPT trip.txt.

     Files inside /images are not included
     because we are listing non-recursively.
  ======================================== */

  const automaticDocuments =

    tripFolderEntries

      .filter(

        entry =>

          entry.type ===
          "file"

      )

      .filter(

        entry =>

          entry.name
            .toLowerCase()

          !==

          TRIP_METADATA_FILE
            .toLowerCase()

      )

      .sort(
        naturalEntrySort
      )

      .map(

        entry => ({

          label:

            fileNameToLabel(
              entry.name
            ),

          file:

            makeDropboxFileUrl(
              entry.path
            )

        })

      );


  /* ========================================
     EXTERNAL LINKS FROM trip.txt

     Example:

     Link: Peterhof Fountains | https://...
  ======================================== */

  const externalLinks =

    metadata.links

      .filter(

        link =>

          isExternalUrl(
            link.file
          )

      )

      .map(

        link => ({

          label:
            link.label,

          file:
            link.file

        })

      );


  /* ========================================
     OPTIONAL MANUAL LOCAL LINKS

     Example:

     Link: Special Name | report.pdf

     Normal local files do NOT need to
     be listed in trip.txt.
  ======================================== */

  const manualLocalLinks =

    metadata.links

      .filter(

        link =>

          !isExternalUrl(
            link.file
          )

      )

      .map(

        link => {


          const path =

            link.file.startsWith(
              "/"
            )

              ? link.file

              : `${tripFolderPath}/${link.file}`;


          return {

            label:
              link.label,

            file:

              makeDropboxFileUrl(
                path
              )

          };

        }

      );


  /* ========================================
     COMBINE + REMOVE DUPLICATES
  ======================================== */

  const links =

    deduplicateLinks(

      [
        ...automaticDocuments,
        ...externalLinks,
        ...manualLocalLinks
      ]

    );


  /* ========================================
     CHECK WHETHER images FOLDER EXISTS

     THIS PREVENTS EXPECTED 404 ERRORS.
  ======================================== */

  const imagesFolderEntry =

    tripFolderEntries.find(

      entry =>

        entry.type ===
          "folder"

        &&

        entry.name
          .toLowerCase()

        ===

        TRIP_IMAGES_FOLDER
          .toLowerCase()

    );


  let imageEntries =
    [];


  /* ========================================
     ONLY REQUEST images IF IT EXISTS
  ======================================== */

  if (
    imagesFolderEntry
  ) {

    try {

      imageEntries =

        await getDropboxFolder(

          imagesFolderEntry.path,

          true

        );

    } catch (
      error
    ) {

      console.error(

        `Could not load images for ${folder.name}:`,

        error

      );


      imageEntries =
        [];

    }

  }


  /* ========================================
     BUILD IMAGE URL ARRAY
  ======================================== */

  const images =

    imageEntries

      .filter(

        entry =>

          entry.type ===
          "file"

      )

      .filter(

        entry =>

          isImageFile(
            entry.name
          )

      )

      .sort(
        naturalEntrySort
      )

      .map(

        entry =>

          makeDropboxFileUrl(
            entry.path
          )

      );


  /* ========================================
     FINISHED TRIP OBJECT
  ======================================== */

  return {

    id:
      folder.name,

    title:
      metadata.title,

    year:
      metadata.year,

    travelers:
      metadata.travelers,

    generation:
      metadata.generation,

    blurb:
      metadata.blurb,

    x:
      metadata.x,

    y:
      metadata.y,

    images:
      images,

    links:
      links

  };

}


/* ============================================
   DROPBOX: GET FOLDER
============================================ */

async function getDropboxFolder(

  path,

  recursive = false

) {

  const url =

    `${PHOTO_API}/folder?path=${
      encodeURIComponent(
        path
      )
    }&recursive=${
      recursive
        ? "true"
        : "false"
    }`;


  const response =
    await fetch(
      url
    );


  if (
    !response.ok
  ) {

    throw new Error(

      `Folder could not be loaded: ${path}`

    );

  }


  return response.json();

}


/* ============================================
   DROPBOX: GET TEXT FILE
============================================ */

async function getDropboxText(
  path
) {

  const response =

    await fetch(

      `${PHOTO_API}/text?path=${
        encodeURIComponent(
          path
        )
      }`

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


/* ============================================
   DROPBOX: CREATE FILE URL
============================================ */

function makeDropboxFileUrl(
  path
) {

  return (

    `${PHOTO_API}/file?path=${
      encodeURIComponent(
        path
      )
    }`

  );

}


/* ============================================
   PARSE trip.txt

   EXPECTED FORMAT:

   Title: Belize
   Year: 2019
   Travelers: Zohar Family
   Generation: family
   X: 24.5
   Y: 45.5
   Blurb: Optional text

   Link: Label | https://example.com
============================================ */

function parseTripText(
  text
) {

  const trip = {

    title:
      "",

    year:
      "",

    travelers:
      "",

    generation:
      "",

    blurb:
      "",

    x:
      NaN,

    y:
      NaN,

    links:
      []

  };


  const lines =

    text.split(
      /\r?\n/
    );


  for (
    const originalLine
    of lines
  ) {

    const line =
      originalLine.trim();


    if (
      !line
    ) {

      continue;

    }


    /* ========================================
       LINKS
    ======================================== */

    if (

      line
        .toLowerCase()
        .startsWith(
          "link:"
        )

    ) {

      const value =

        line
          .slice(5)
          .trim();


      const separator =

        value.indexOf(
          "|"
        );


      if (
        separator ===
        -1
      ) {

        continue;

      }


      const label =

        value
          .slice(
            0,
            separator
          )
          .trim();


      const file =

        value
          .slice(
            separator + 1
          )
          .trim();


      if (

        label

        &&

        file

      ) {

        trip.links.push({

          label:
            label,

          file:
            file

        });

      }


      continue;

    }


    /* ========================================
       NORMAL METADATA
    ======================================== */

    const colon =

      line.indexOf(
        ":"
      );


    if (
      colon ===
      -1
    ) {

      continue;

    }


    const key =

      line

        .slice(
          0,
          colon
        )

        .trim()

        .toLowerCase();


    const value =

      line

        .slice(
          colon + 1
        )

        .trim();


    switch (
      key
    ) {

      case "title":

        trip.title =
          value;

        break;


      case "year":

        trip.year =
          value;

        break;


      case "travelers":

        trip.travelers =
          value;

        break;


      case "generation":

        trip.generation =
          value;

        break;


      case "blurb":

        trip.blurb =
          value;

        break;


      case "x":

        trip.x =
          Number(
            value
          );

        break;


      case "y":

        trip.y =
          Number(
            value
          );

        break;

    }

  }


  return trip;

}


/* ============================================
   RENDER MAP PINS
============================================ */

function renderTravelPins() {

  if (
    !travelPins
  ) {

    return;

  }


  travelPins.innerHTML =
    "";


  TRAVELS.forEach(

    (
      travel,
      index
    ) => {


      const pin =

        document.createElement(
          "button"
        );


      pin.type =
        "button";


      pin.className =
        "travel-pin";


      if (
        travel.generation
      ) {

        pin.classList.add(

          `generation-${travel.generation}`

        );

      }


      pin.style.left =
        `${travel.x}%`;


      pin.style.top =
        `${travel.y}%`;


      pin.setAttribute(

        "aria-label",

        `${travel.title}, ${travel.year || ""}`

      );


      pin.innerHTML = `

        <span
          class="travel-pin-dot"
        ></span>

        <span
          class="travel-pin-year"
        >
          ${travel.year || ""}
        </span>

      `;


      pin.addEventListener(

        "click",

        () => {

          openTravelModal(
            index
          );

        }

      );


      travelPins.appendChild(
        pin
      );

    }

  );

}


/* ============================================
   OPEN TRAVEL MODAL
============================================ */

function openTravelModal(
  index
) {

  currentTravelIndex =
    index;


  currentImageIndex =
    0;


  renderTravelModal();


  travelModal
    ?.classList
    .add(
      "open"
    );


  travelModal
    ?.setAttribute(

      "aria-hidden",

      "false"

    );


  document.body
    .classList
    .add(

      "travel-modal-open"

    );

}


/* ============================================
   CLOSE TRAVEL MODAL
============================================ */

function closeTravelModal() {

  /* Close lightbox first if necessary */

  closeTravelLightbox();


  travelModal
    ?.classList
    .remove(
      "open"
    );


  travelModal
    ?.setAttribute(

      "aria-hidden",

      "true"

    );


  document.body
    .classList
    .remove(

      "travel-modal-open"

    );

}


/* ============================================
   RENDER TRAVEL MODAL
============================================ */

function renderTravelModal() {

  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  if (
    !travel
  ) {

    return;

  }


  if (
    travelModalTitle
  ) {

    travelModalTitle.textContent =
      travel.title || "";

  }


  if (
    travelModalYear
  ) {

    travelModalYear.textContent =
      travel.year || "";

  }


  if (
    travelModalTravelers
  ) {

    travelModalTravelers.textContent =
      travel.travelers || "";

  }


  if (
    travelModalGeneration
  ) {

    travelModalGeneration.textContent =
      travel.generation || "";

  }


  /* ========================================
     BLURB
  ======================================== */

  if (
    travelModalBlurb
  ) {

    if (

      travel.blurb

      &&

      travel.blurb.trim()

    ) {

      travelModalBlurb.textContent =
        travel.blurb;


      travelModalBlurb.hidden =
        false;

    } else {

      travelModalBlurb.textContent =
        "";


      travelModalBlurb.hidden =
        true;

    }

  }


  renderTravelImage();


  renderTravelImageDots();


  renderTravelLinks();

}


/* ============================================
   RENDER CURRENT IMAGE
============================================ */

function renderTravelImage() {

  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  if (
    !travel
  ) {

    return;

  }


  const images =
    travel.images || [];


  /* ========================================
     NO IMAGES

     HIDE THE ENTIRE IMAGE SECTION
  ======================================== */

  if (
    images.length ===
    0
  ) {

    if (
      travelCarouselImage
    ) {

      travelCarouselImage
        .removeAttribute(
          "src"
        );


      travelCarouselImage.alt =
        "";


      travelCarouselImage.style.display =
        "none";

    }


    if (
      travelImagePrev
    ) {

      travelImagePrev.style.display =
        "none";

    }


    if (
      travelImageNext
    ) {

      travelImageNext.style.display =
        "none";

    }


    if (
      travelImageCounter
    ) {

      travelImageCounter.textContent =
        "";

    }


    if (
      travelImageDots
    ) {

      travelImageDots.innerHTML =
        "";

    }


    if (
      travelImageSection
    ) {

      travelImageSection.style.display =
        "none";

    }


    return;

  }


  /* ========================================
     IMAGES EXIST
  ======================================== */

  if (
    travelImageSection
  ) {

    travelImageSection.style.display =
      "";

  }


  if (

    currentImageIndex >=
    images.length

  ) {

    currentImageIndex =
      0;

  }


  if (
    currentImageIndex < 0
  ) {

    currentImageIndex =
      images.length - 1;

  }


  if (
    travelCarouselImage
  ) {

    travelCarouselImage.style.display =
      "block";


    travelCarouselImage.src =

      images[
        currentImageIndex
      ];


    travelCarouselImage.alt =

      `${travel.title} travel photo ${currentImageIndex + 1}`;

  }


  /* ========================================
     IMAGE COUNTER
  ======================================== */

  if (
    travelImageCounter
  ) {

    travelImageCounter.textContent =

      images.length > 1

        ? `${currentImageIndex + 1} / ${images.length}`

        : "";

  }


  /* ========================================
     CAROUSEL ARROWS
  ======================================== */

  const hasMultipleImages =

    images.length >
    1;


  if (
    travelImagePrev
  ) {

    travelImagePrev.style.display =

      hasMultipleImages

        ? ""

        : "none";

  }


  if (
    travelImageNext
  ) {

    travelImageNext.style.display =

      hasMultipleImages

        ? ""

        : "none";

  }

}


/* ============================================
   RENDER IMAGE DOTS
============================================ */

function renderTravelImageDots() {

  if (
    !travelImageDots
  ) {

    return;

  }


  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  const images =

    travel?.images || [];


  travelImageDots.innerHTML =
    "";


  if (
    images.length <=
    1
  ) {

    return;

  }


  images.forEach(

    (
      image,
      index
    ) => {


      const dot =

        document.createElement(
          "button"
        );


      dot.type =
        "button";


      dot.className =

        index ===
        currentImageIndex

          ? "travel-image-dot active"

          : "travel-image-dot";


      dot.setAttribute(

        "aria-label",

        `View image ${index + 1}`

      );


      dot.addEventListener(

        "click",

        () => {

          currentImageIndex =
            index;


          renderTravelImage();


          renderTravelImageDots();


          if (
            isTravelLightboxOpen()
          ) {

            renderTravelLightboxImage();

          }

        }

      );


      travelImageDots.appendChild(
        dot
      );

    }

  );

}


/* ============================================
   PREVIOUS IMAGE
============================================ */

function showPreviousTravelImage() {

  const images =

    TRAVELS[
      currentTravelIndex
    ]?.images || [];


  if (
    images.length <=
    1
  ) {

    return;

  }


  currentImageIndex =

    (
      currentImageIndex
      -
      1
      +
      images.length
    )

    %

    images.length;


  renderTravelImage();


  renderTravelImageDots();


  if (
    isTravelLightboxOpen()
  ) {

    renderTravelLightboxImage();

  }

}


/* ============================================
   NEXT IMAGE
============================================ */

function showNextTravelImage() {

  const images =

    TRAVELS[
      currentTravelIndex
    ]?.images || [];


  if (
    images.length <=
    1
  ) {

    return;

  }


  currentImageIndex =

    (
      currentImageIndex
      +
      1
    )

    %

    images.length;


  renderTravelImage();


  renderTravelImageDots();


  if (
    isTravelLightboxOpen()
  ) {

    renderTravelLightboxImage();

  }

}


/* ============================================
   TRIP DOCUMENTS + LINKS
============================================ */

function renderTravelLinks() {

  if (
    !travelPdfLinks
  ) {

    return;

  }


  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  const links =
    travel?.links || [];


  travelPdfLinks.innerHTML =
    "";


  const documentsSection =

    travelPdfLinks.parentElement;


  if (
    links.length ===
    0
  ) {

    if (
      documentsSection
    ) {

      documentsSection.style.display =
        "none";

    }


    return;

  }


  if (
    documentsSection
  ) {

    documentsSection.style.display =
      "";

  }


  links.forEach(

    linkData => {


      const link =

        document.createElement(
          "a"
        );


      link.href =
        linkData.file;


      link.textContent =
        linkData.label;


      /*
        PDFs and other documents open
        in a new tab.

        The Cloudflare Worker serves
        PDFs with Content-Disposition:
        inline.
      */

      link.target =
        "_blank";


      link.rel =
        "noopener";


      link.className =
        "travel-pdf-link";


      travelPdfLinks.appendChild(
        link
      );

    }

  );

}


/* ============================================
   FULL-SCREEN IMAGE LIGHTBOX
============================================ */

function openTravelLightbox() {

  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  const images =
    travel?.images || [];


  if (

    images.length ===
    0

    ||

    !travelLightbox

  ) {

    return;

  }


  renderTravelLightboxImage();


  travelLightbox
    .classList
    .add(
      "open"
    );


  travelLightbox
    .setAttribute(

      "aria-hidden",

      "false"

    );


  document.body
    .classList
    .add(

      "travel-lightbox-open"

    );

}


/* ============================================
   CLOSE LIGHTBOX
============================================ */

function closeTravelLightbox() {

  if (
    !travelLightbox
  ) {

    return;

  }


  travelLightbox
    .classList
    .remove(
      "open"
    );


  travelLightbox
    .setAttribute(

      "aria-hidden",

      "true"

    );


  document.body
    .classList
    .remove(

      "travel-lightbox-open"

    );

}


/* ============================================
   CHECK LIGHTBOX STATE
============================================ */

function isTravelLightboxOpen() {

  return (

    travelLightbox

    &&

    travelLightbox
      .classList
      .contains(
        "open"
      )

  );

}


/* ============================================
   RENDER FULL-SCREEN IMAGE
============================================ */

function renderTravelLightboxImage() {

  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  const images =
    travel?.images || [];


  if (

    images.length ===
    0

    ||

    !travelLightboxImage

  ) {

    return;

  }


  travelLightboxImage.src =

    images[
      currentImageIndex
    ];


  travelLightboxImage.alt =

    `${travel.title} travel photo ${currentImageIndex + 1}`;


  if (
    travelLightboxCounter
  ) {

    travelLightboxCounter.textContent =

      images.length > 1

        ? `${currentImageIndex + 1} / ${images.length}`

        : "";

  }


  const hasMultipleImages =

    images.length >
    1;


  if (
    travelLightboxPrev
  ) {

    travelLightboxPrev.style.display =

      hasMultipleImages

        ? ""

        : "none";

  }


  if (
    travelLightboxNext
  ) {

    travelLightboxNext.style.display =

      hasMultipleImages

        ? ""

        : "none";

  }

}


/* ============================================
   LIGHTBOX PREVIOUS
============================================ */

function showPreviousLightboxImage() {

  showPreviousTravelImage();

}


/* ============================================
   LIGHTBOX NEXT
============================================ */

function showNextLightboxImage() {

  showNextTravelImage();

}


/* ============================================
   FILE NAME → DISPLAY LABEL
============================================ */

function fileNameToLabel(
  filename
) {

  return filename

    /*
      Remove file extension.
    */

    .replace(

      /\.[^/.]+$/,

      ""

    )

    /*
      Replace underscores with spaces.
    */

    .replace(

      /_/g,

      " "

    );

}


/* ============================================
   REMOVE DUPLICATE LINKS
============================================ */

function deduplicateLinks(
  links
) {

  const seen =
    new Set();


  return links.filter(

    link => {


      const key =

        String(
          link.file
        )
          .toLowerCase();


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


/* ============================================
   IMAGE FILE CHECK
============================================ */

function isImageFile(
  filename
) {

  return /\.(jpg|jpeg|png|webp|gif|avif)$/i

    .test(
      filename
    );

}


/* ============================================
   EXTERNAL URL CHECK
============================================ */

function isExternalUrl(
  value
) {

  return /^https?:\/\//i

    .test(
      value
    );

}


/* ============================================
   NATURAL FILE SORT

   image1
   image2
   image10

   instead of:

   image1
   image10
   image2
============================================ */

function naturalEntrySort(
  a,
  b
) {

  return a.name.localeCompare(

    b.name,

    undefined,

    {
      numeric:
        true,

      sensitivity:
        "base"
    }

  );

}


/* ============================================
   NORMAL CAROUSEL EVENTS
============================================ */

travelImagePrev
  ?.addEventListener(

    "click",

    showPreviousTravelImage

  );


travelImageNext
  ?.addEventListener(

    "click",

    showNextTravelImage

  );


/* ============================================
   CLICK MAIN IMAGE → OPEN FULL-SCREEN
============================================ */

travelCarouselImage
  ?.addEventListener(

    "click",

    openTravelLightbox

  );


/* ============================================
   TRAVEL MODAL EVENTS
============================================ */

travelModalClose
  ?.addEventListener(

    "click",

    closeTravelModal

  );


travelModalBackdrop
  ?.addEventListener(

    "click",

    closeTravelModal

  );


/* ============================================
   LIGHTBOX EVENTS
============================================ */

travelLightboxClose
  ?.addEventListener(

    "click",

    closeTravelLightbox

  );


travelLightboxBackdrop
  ?.addEventListener(

    "click",

    closeTravelLightbox

  );


travelLightboxPrev
  ?.addEventListener(

    "click",

    showPreviousLightboxImage

  );


travelLightboxNext
  ?.addEventListener(

    "click",

    showNextLightboxImage

  );


/* ============================================
   KEYBOARD CONTROLS
============================================ */

document.addEventListener(

  "keydown",

  event => {


    /* ========================================
       LIGHTBOX OPEN

       Escape closes only the preview.

       Arrow keys navigate images.
    ======================================== */

    if (
      isTravelLightboxOpen()
    ) {

      if (
        event.key ===
        "Escape"
      ) {

        closeTravelLightbox();

        return;

      }


      if (
        event.key ===
        "ArrowLeft"
      ) {

        showPreviousLightboxImage();

        return;

      }


      if (
        event.key ===
        "ArrowRight"
      ) {

        showNextLightboxImage();

        return;

      }


      return;

    }


    /* ========================================
       NORMAL TRAVEL MODAL
    ======================================== */

    if (

      !travelModal

      ||

      !travelModal
        .classList
        .contains(
          "open"
        )

    ) {

      return;

    }


    if (
      event.key ===
      "Escape"
    ) {

      closeTravelModal();

      return;

    }


    if (
      event.key ===
      "ArrowLeft"
    ) {

      showPreviousTravelImage();

      return;

    }


    if (
      event.key ===
      "ArrowRight"
    ) {

      showNextTravelImage();

    }

  }

);


/* ============================================
   COORDINATE HELPER

   HOLD ALT / OPTION AND CLICK THE MAP.

   Outputs:

   X: 24.5
   Y: 45.5

   for use inside trip.txt.
============================================ */

travelMap
  ?.parentElement
  ?.addEventListener(

    "click",

    event => {


      if (
        !event.altKey
      ) {

        return;

      }


      const mapRect =

        travelMap
          .getBoundingClientRect();


      if (

        event.clientX <
        mapRect.left

        ||

        event.clientX >
        mapRect.right

        ||

        event.clientY <
        mapRect.top

        ||

        event.clientY >
        mapRect.bottom

      ) {

        return;

      }


      const x =

        (
          (
            event.clientX
            -
            mapRect.left
          )

          /

          mapRect.width
        )

        *

        100;


      const y =

        (
          (
            event.clientY
            -
            mapRect.top
          )

          /

          mapRect.height
        )

        *

        100;


      const roundedX =
        x.toFixed(
          1
        );


      const roundedY =
        y.toFixed(
          1
        );


      if (
        coordinateHelper
      ) {

        coordinateHelper.hidden =
          false;


        coordinateHelper.textContent =

          `X: ${roundedX}, Y: ${roundedY}`;


        coordinateHelper.style.left =
          `${x}%`;


        coordinateHelper.style.top =
          `${y}%`;

      }


      console.log(

        `X: ${roundedX}\nY: ${roundedY}`

      );


      window.setTimeout(

        () => {

          if (
            coordinateHelper
          ) {

            coordinateHelper.hidden =
              true;

          }

        },

        3500

      );

    }

  );


/* ============================================
   INITIALISE
============================================ */

loadTravelData();