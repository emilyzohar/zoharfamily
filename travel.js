/* ============================================
   CONFIGURATION
============================================ */

const PHOTO_API =
  "https://family-photo-api.emilyzohar.workers.dev";

const TRAVEL_ROOT =
  "/Zohar Family/Travel";

const TRIP_METADATA_FILE =
  "trip.txt";

const TRIP_IMAGES_FOLDER =
  "images";

/*
  Number of trips whose first images can be
  prefetched simultaneously.
*/

const PREFETCH_CONCURRENCY =
  4;


/* ============================================
   PAGE ELEMENTS
============================================ */

const travelMap =
  document.getElementById("travel-map");

const travelPins =
  document.getElementById("travel-pins");

const coordinateHelper =
  document.getElementById("coordinate-helper");


/* ============================================
   TRAVEL MODAL ELEMENTS
============================================ */

const travelModal =
  document.getElementById("travel-modal");

const travelModalBackdrop =
  document.getElementById("travel-modal-backdrop");

const travelModalClose =
  document.getElementById("travel-modal-close");

const travelModalTitle =
  document.getElementById("travel-modal-title");

const travelModalYear =
  document.getElementById("travel-modal-year");

const travelModalTravelers =
  document.getElementById("travel-modal-travelers");

const travelModalGeneration =
  document.getElementById("travel-modal-generation");

const travelModalBlurb =
  document.getElementById("travel-modal-blurb");

const travelCarouselImage =
  document.getElementById("travel-carousel-image");

const travelImagePrev =
  document.getElementById("travel-image-prev");

const travelImageNext =
  document.getElementById("travel-image-next");

const travelImageCounter =
  document.getElementById("travel-image-counter");

const travelImageDots =
  document.getElementById("travel-image-dots");

const travelPdfLinks =
  document.getElementById("travel-pdf-links");


/* ============================================
   IMAGE SECTION
============================================ */

const travelImageSection =
  document.getElementById("travel-image-section") ||
  travelCarouselImage?.closest(".travel-image-section") ||
  travelCarouselImage?.parentElement ||
  null;


/* ============================================
   FULL-SCREEN LIGHTBOX ELEMENTS
============================================ */

const travelLightbox =
  document.getElementById("travel-lightbox");

const travelLightboxBackdrop =
  document.getElementById("travel-lightbox-backdrop");

const travelLightboxClose =
  document.getElementById("travel-lightbox-close");

const travelLightboxImage =
  document.getElementById("travel-lightbox-image");

const travelLightboxPrev =
  document.getElementById("travel-lightbox-prev");

const travelLightboxNext =
  document.getElementById("travel-lightbox-next");

const travelLightboxCounter =
  document.getElementById("travel-lightbox-counter");


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
   FILTER STATE

   first + next = Sabba & Safta
   family = Family

   Only these two grouped categories are
   selected and visible by default.

   Any future Generation value is:
   - automatically added to the menu
   - unchecked by default
   - hidden on initial load
   - styled like generation-next
============================================ */

const TRAVEL_GENERATION_GROUPS = {

  first:
    "Sabba & Safta",

  next:
    "Sabba & Safta",

  family:
    "Family"

};


const DEFAULT_SELECTED_TRAVEL_CATEGORIES =
  new Set([
    "Sabba & Safta",
    "Family"
  ]);


const selectedTravelCategories =
  new Set(
    DEFAULT_SELECTED_TRAVEL_CATEGORIES
  );


const availableTravelCategories =
  new Set();


/* ============================================
   DROPDOWN ELEMENT STATE
============================================ */

let travelControls =
  null;

let travelFilterButton =
  null;

let travelFilterMenu =
  null;

let travelTripsButton =
  null;

let travelTripsMenu =
  null;


/* ============================================
   LOAD ALL TRAVEL DATA

   1. Load /Travel folder listing.
   2. Load every trip.txt in parallel.
   3. Render each pin when its metadata arrives.
   4. Build generation + trip menus dynamically.
   5. Quietly preload first images afterward.
============================================ */

async function loadTravelData() {

  try {

    const rootEntries =
      await getDropboxFolder(
        TRAVEL_ROOT
      );


    const tripFolders =
      rootEntries.filter(
        entry =>
          entry.type === "folder"
      );


    TRAVELS =
      [];


    availableTravelCategories.clear();


    selectedTravelCategories.clear();


    DEFAULT_SELECTED_TRAVEL_CATEGORIES.forEach(

      category => {

        selectedTravelCategories.add(
          category
        );

      }

    );


    if (
      travelPins
    ) {

      travelPins.innerHTML =
        "";

    }


    createTravelControls();


    renderTravelFilterOptions();


    renderTravelTripOptions();


    /*
      Load all small trip.txt files in parallel.

      Each pin appears as soon as its own metadata
      request finishes.
    */

    const metadataPromises =

      tripFolders.map(

        async folder => {

          try {

            const travel =

              await loadTripMetadata(
                folder
              );


            if (
              !travel
            ) {

              return null;

            }


            const travelIndex =

              TRAVELS.push(
                travel
              ) - 1;


            registerTravelCategory(
              travel
            );


            renderTravelPin(

              travel,

              travelIndex

            );


            return travel;

          } catch (
            error
          ) {

            console.error(

              `Could not load trip metadata for ${folder.name}:`,

              error

            );


            return null;

          }

        }

      );


    /*
      Once metadata has finished loading,
      quietly preload trip content and first images.
    */

    Promise
      .allSettled(
        metadataPromises
      )
      .then(
        () => {

          renderTravelTripOptions();

          scheduleTravelContentPrefetch();

        }
      );


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
   LOAD ONLY trip.txt
============================================ */

async function loadTripMetadata(
  folder
) {

  const tripFolderPath =
    folder.path;


  const tripTextPath =
    `${tripFolderPath}/${TRIP_METADATA_FILE}`;


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


  return {

    id:
      folder.name,

    folderPath:
      tripFolderPath,

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

    metadataLinks:
      metadata.links,

    filterCategory:
      "",

    images:
      [],

    links:
      [],

    contentLoaded:
      false,

    contentPromise:
      null,

    firstImageReady:
      false,

    firstImagePromise:
      null,

    preloadedFirstImage:
      null

  };

}


/* ============================================
   LOAD TRIP CONTENT

   Shared promise prevents duplicate requests.
============================================ */

function loadTripContent(
  travel
) {

  if (
    travel.contentLoaded
  ) {

    return Promise.resolve(
      travel
    );

  }


  if (
    travel.contentPromise
  ) {

    return travel.contentPromise;

  }


  travel.contentPromise =

    performTripContentLoad(
      travel
    )

      .finally(

        () => {

          travel.contentPromise =
            null;

        }

      );


  return travel.contentPromise;

}


/* ============================================
   ACTUAL TRIP CONTENT LOADER
============================================ */

async function performTripContentLoad(
  travel
) {

  const tripFolderPath =
    travel.folderPath;


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


    return travel;

  }


  /* ========================================
     AUTOMATIC DOCUMENTS
  ======================================== */

  const automaticDocuments =

    tripFolderEntries

      .filter(
        entry =>
          entry.type === "file"
      )

      .filter(

        entry =>

          entry.name.toLowerCase()

          !==

          TRIP_METADATA_FILE.toLowerCase()

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
     EXTERNAL LINKS
  ======================================== */

  const externalLinks =

    (
      travel.metadataLinks
      ||
      []
    )

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
     MANUAL LOCAL LINKS
  ======================================== */

  const manualLocalLinks =

    (
      travel.metadataLinks
      ||
      []
    )

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


  travel.links =

    deduplicateLinks(

      [
        ...automaticDocuments,
        ...externalLinks,
        ...manualLocalLinks
      ]

    );


  /* ========================================
     FIND images FOLDER
  ======================================== */

  const imagesFolderEntry =

    tripFolderEntries.find(

      entry =>

        entry.type === "folder"

        &&

        entry.name.toLowerCase()

        ===

        TRIP_IMAGES_FOLDER.toLowerCase()

    );


  /* ========================================
     LOAD IMAGE LISTING
  ======================================== */

  if (
    imagesFolderEntry
  ) {

    try {

      const imageEntries =

        await getDropboxFolder(

          imagesFolderEntry.path,

          true

        );


      travel.images =

        imageEntries

          .filter(
            entry =>
              entry.type === "file"
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


    } catch (
      error
    ) {

      console.error(

        `Could not load images for ${travel.title}:`,

        error

      );


      travel.images =
        [];

    }

  }


  travel.contentLoaded =
    true;


  return travel;

}


/* ============================================
   PRELOAD + DECODE FIRST IMAGE

   Modal only opens once first image is ready.
============================================ */

function preloadFirstTravelImage(
  travel
) {

  if (
    travel.firstImageReady
  ) {

    return Promise.resolve();

  }


  if (
    travel.firstImagePromise
  ) {

    return travel.firstImagePromise;

  }


  travel.firstImagePromise =

    (async () => {


      await loadTripContent(
        travel
      );


      if (

        !travel.images

        ||

        travel.images.length === 0

      ) {

        travel.firstImageReady =
          true;


        return;

      }


      const image =
        new Image();


      travel.preloadedFirstImage =
        image;


      try {

        image.fetchPriority =
          "high";

      } catch (
        error
      ) {

      }


      image.src =
        travel.images[0];


      try {

        await image.decode();

      } catch (
        error
      ) {

        await new Promise(

          resolve => {


            if (
              image.complete
            ) {

              resolve();

              return;

            }


            image.onload =
              resolve;


            image.onerror =
              resolve;

          }

        );

      }


      travel.firstImageReady =
        true;


    })()

      .finally(

        () => {

          travel.firstImagePromise =
            null;

        }

      );


  return travel.firstImagePromise;

}


/* ============================================
   BACKGROUND FIRST-IMAGE PREFETCH
============================================ */

function scheduleTravelContentPrefetch() {

  setTimeout(

    () => {

      prefetchTravelContentWithLimit(

        TRAVELS,

        PREFETCH_CONCURRENCY

      );

    },

    50

  );

}


/* ============================================
   LIMITED-CONCURRENCY PREFETCH
============================================ */

async function prefetchTravelContentWithLimit(

  travels,

  concurrency

) {

  let nextIndex =
    0;


  async function worker() {

    while (
      nextIndex <
      travels.length
    ) {

      const index =
        nextIndex++;


      const travel =
        travels[
          index
        ];


      if (
        !travel
      ) {

        continue;

      }


      try {

        await preloadFirstTravelImage(
          travel
        );

      } catch (
        error
      ) {

        console.warn(

          `Could not preload first image for ${travel.title}:`,

          error

        );

      }

    }

  }


  const workerCount =

    Math.min(

      concurrency,

      travels.length

    );


  const workers =
    [];


  for (

    let i = 0;

    i < workerCount;

    i++

  ) {

    workers.push(
      worker()
    );

  }


  await Promise.allSettled(
    workers
  );

}


/* ============================================
   GENERATION HELPERS
============================================ */

function normalizeTravelGeneration(
  generation
) {

  return String(
    generation || ""
  )
    .trim()
    .toLowerCase();

}


/* ============================================
   GET FILTER CATEGORY

   first + next = Sabba & Safta
   family = Family
   new categories = own name
============================================ */

function getTravelCategory(
  generation
) {

  const normalized =

    normalizeTravelGeneration(
      generation
    );


  if (
    !normalized
  ) {

    return "Other";

  }


  if (
    TRAVEL_GENERATION_GROUPS[
      normalized
    ]
  ) {

    return TRAVEL_GENERATION_GROUPS[
      normalized
    ];

  }


  return normalized

    .replace(
      /[_-]+/g,
      " "
    )

    .replace(

      /\b\w/g,

      character =>
        character.toUpperCase()

    );

}


/* ============================================
   CREATE CONTROL ROW

   Contains:

   Generations ▼
   Trips ▼
============================================ */

function createTravelControls() {

  if (
    travelControls
  ) {

    return;

  }


  travelControls =

    document.createElement(
      "div"
    );


  travelControls.className =
    "travel-controls";


  travelControls.innerHTML = `

    <div
      class="travel-dropdown"
    >

      <button
        type="button"
        class="travel-control-button"
        id="travel-generation-filter-button"
        aria-expanded="false"
      >

        Filter

        <span
          class="travel-control-arrow"
        >
          ▾
        </span>

      </button>


      <div
        class="
          travel-dropdown-menu
          travel-generation-menu
        "
        id="travel-generation-filter-menu"
        hidden
      >
      </div>

    </div>


    <div
      class="travel-dropdown"
    >

      <button
        type="button"
        class="travel-control-button"
        id="travel-trip-selector-button"
        aria-expanded="false"
      >

        Trips

        <span
          class="travel-control-arrow"
        >
          ▾
        </span>

      </button>


      <div
        class="
          travel-dropdown-menu
          travel-trip-menu
        "
        id="travel-trip-selector-menu"
        hidden
      >
      </div>

    </div>

  `;


  const travelMain =

    document.querySelector(
      ".travel-main"
    );


  if (
    travelMain
  ) {

    travelMain.prepend(
      travelControls
    );

  } else {

    document.body.appendChild(
      travelControls
    );

  }


  travelFilterButton =

    document.getElementById(
      "travel-generation-filter-button"
    );


  travelFilterMenu =

    document.getElementById(
      "travel-generation-filter-menu"
    );


  travelTripsButton =

    document.getElementById(
      "travel-trip-selector-button"
    );


  travelTripsMenu =

    document.getElementById(
      "travel-trip-selector-menu"
    );


  /* Generation dropdown */

  travelFilterButton
    ?.addEventListener(

      "click",

      event => {


        event.stopPropagation();


        const willOpen =
          travelFilterMenu.hidden;


        closeTravelDropdowns();


        travelFilterMenu.hidden =
          !willOpen;


        travelFilterButton.setAttribute(

          "aria-expanded",

          willOpen
            ? "true"
            : "false"

        );

      }

    );


  /* Trip dropdown */

  travelTripsButton
    ?.addEventListener(

      "click",

      event => {


        event.stopPropagation();


        const willOpen =
          travelTripsMenu.hidden;


        closeTravelDropdowns();


        travelTripsMenu.hidden =
          !willOpen;


        travelTripsButton.setAttribute(

          "aria-expanded",

          willOpen
            ? "true"
            : "false"

        );

      }

    );


  /* Prevent menu clicks closing menu */

  travelFilterMenu
    ?.addEventListener(

      "click",

      event => {

        event.stopPropagation();

      }

    );


  travelTripsMenu
    ?.addEventListener(

      "click",

      event => {

        event.stopPropagation();

      }

    );


  document.addEventListener(

    "click",

    closeTravelDropdowns

  );

}


/* ============================================
   CLOSE DROPDOWNS
============================================ */

function closeTravelDropdowns() {

  if (
    travelFilterMenu
  ) {

    travelFilterMenu.hidden =
      true;

  }


  if (
    travelTripsMenu
  ) {

    travelTripsMenu.hidden =
      true;

  }


  travelFilterButton
    ?.setAttribute(

      "aria-expanded",

      "false"

    );


  travelTripsButton
    ?.setAttribute(

      "aria-expanded",

      "false"

    );

}


/* ============================================
   REGISTER CATEGORY
============================================ */

function registerTravelCategory(
  travel
) {

  const category =

    getTravelCategory(
      travel.generation
    );


  travel.filterCategory =
    category;


  const alreadyExists =

    availableTravelCategories.has(
      category
    );


  availableTravelCategories.add(
    category
  );


  if (
    !alreadyExists
  ) {

    renderTravelFilterOptions();

  }


  renderTravelTripOptions();

}


/* ============================================
   GENERATION MULTISELECT
============================================ */

function renderTravelFilterOptions() {

  if (
    !travelFilterMenu
  ) {

    return;

  }


  travelFilterMenu.innerHTML =
    "";


  const categories =

    Array
      .from(
        availableTravelCategories
      )

      .sort(

        (
          a,
          b
        ) => {


          const priority = {

            "Sabba & Safta":
              1,

            "Family":
              2

          };


          const aPriority =

            priority[a]
            ||
            100;


          const bPriority =

            priority[b]
            ||
            100;


          if (
            aPriority !==
            bPriority
          ) {

            return (
              aPriority
              -
              bPriority
            );

          }


          return a.localeCompare(
            b
          );

        }

      );


  categories.forEach(

    category => {


      const label =

        document.createElement(
          "label"
        );


      label.className =
        "travel-generation-option";


      const checkbox =

        document.createElement(
          "input"
        );


      checkbox.type =
        "checkbox";


      checkbox.value =
        category;


      checkbox.checked =

        selectedTravelCategories.has(
          category
        );


      checkbox.addEventListener(

        "change",

        () => {


          if (
            checkbox.checked
          ) {

            selectedTravelCategories.add(
              category
            );

          } else {

            selectedTravelCategories.delete(
              category
            );

          }


          updateTravelPinVisibility();

        }

      );


      const text =

        document.createElement(
          "span"
        );


      text.textContent =
        category;


      label.appendChild(
        checkbox
      );


      label.appendChild(
        text
      );


      travelFilterMenu.appendChild(
        label
      );

    }

  );

}


/* ============================================
   TRIP SORT PRIORITY

   first
   family
   next
   everything else
============================================ */

function getTravelTripSortPriority(
  travel
) {

  const generation =

    normalizeTravelGeneration(
      travel.generation
    );


  switch (
    generation
  ) {

    case "first":

      return 1;


    case "family":

      return 2;


    case "next":

      return 3;


    default:

      return 4;

  }

}


/* ============================================
   TRIP TITLE DROPDOWN
============================================ */

function renderTravelTripOptions() {

  if (
    !travelTripsMenu
  ) {

    return;

  }


  travelTripsMenu.innerHTML =
    "";


  const sortedTravels =

    TRAVELS

      .map(

        (
          travel,
          index
        ) => ({

          travel,
          index

        })

      )

      .sort(

        (
          a,
          b
        ) => {


          const priorityDifference =

            getTravelTripSortPriority(
              a.travel
            )

            -

            getTravelTripSortPriority(
              b.travel
            );


          if (
            priorityDifference !==
            0
          ) {

            return priorityDifference;

          }


          const yearA =

            Number(
              a.travel.year
            )

            ||
            0;


          const yearB =

            Number(
              b.travel.year
            )

            ||
            0;


          if (
            yearA !==
            yearB
          ) {

            return yearA - yearB;

          }


          return String(
            a.travel.title
          )
            .localeCompare(

              String(
                b.travel.title
              )

            );

        }

      );


  sortedTravels.forEach(

    item => {


      const travel =
        item.travel;


      const index =
        item.index;


      const generation =

        normalizeTravelGeneration(
          travel.generation
        );


      const option =

        document.createElement(
          "button"
        );


      option.type =
        "button";


      option.className =
        "travel-trip-option";


      /*
        Menu stripe colors:

        first = red
        family = white
        next = blue
        new categories = blue
      */

      if (
        generation === "first"
      ) {

        option.classList.add(
          "travel-trip-option-first"
        );

      } else if (
        generation === "family"
      ) {

        option.classList.add(
          "travel-trip-option-family"
        );

      } else {

        option.classList.add(
          "travel-trip-option-next"
        );

      }


      option.innerHTML = `

  <span
    class="travel-trip-option-info"
  >

    <span
      class="travel-trip-option-title"
    >
      ${escapeHtml(
        travel.title || ""
      )}
    </span>

    ${
      travel.travelers

        ? `

          <span
            class="travel-trip-option-travelers"
          >
            ${escapeHtml(
              travel.travelers
            )}
          </span>

        `

        : ""
    }

  </span>


  <span
    class="travel-trip-option-year"
  >
    ${escapeHtml(
      travel.year || ""
    )}
  </span>

`;


      option.addEventListener(

        "click",

        async () => {


          option.classList.add(
            "loading"
          );


          try {

            /*
              Wait until first image is fully
              downloaded and decoded.
            */

            await preloadFirstTravelImage(
              travel
            );


            closeTravelDropdowns();


            openTravelModal(
              index
            );


          } catch (
            error
          ) {

            console.error(

              `Could not open ${travel.title}:`,

              error

            );


          } finally {

            option.classList.remove(
              "loading"
            );

          }

        }

      );


      travelTripsMenu.appendChild(
        option
      );

    }

  );

}


/* ============================================
   UPDATE PIN VISIBILITY
============================================ */

function updateTravelPinVisibility() {

  if (
    !travelPins
  ) {

    return;

  }


  const pins =

    travelPins.querySelectorAll(
      ".travel-pin"
    );


  pins.forEach(

    pin => {


      const category =

        pin.dataset
          .travelCategory;


      pin.style.display =

        selectedTravelCategories.has(
          category
        )

          ? ""

          : "none";

    }

  );

}


/* ============================================
   RENDER ALL MAP PINS
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

      renderTravelPin(
        travel,
        index
      );

    }

  );

}


/* ============================================
   RENDER ONE MAP PIN
============================================ */

function renderTravelPin(

  travel,

  index

) {

  if (
    !travelPins
  ) {

    return;

  }


  const pin =

    document.createElement(
      "button"
    );


  pin.type =
    "button";


  pin.className =
    "travel-pin";


  const generation =

    normalizeTravelGeneration(
      travel.generation
    );


  /*
    Keep original first / next / family
    generation classes.
  */

  if (
    generation
  ) {

    pin.classList.add(

      `generation-${generation}`

    );

  }


  /*
    Any new generation also receives
    generation-new, which is styled exactly
    like generation-next in CSS.
  */

  if (

    generation !== "first"

    &&

    generation !== "next"

    &&

    generation !== "family"

  ) {

    pin.classList.add(
      "generation-new"
    );

  }


  const category =

    travel.filterCategory

    ||

    getTravelCategory(
      travel.generation
    );


  pin.dataset.travelCategory =
    category;


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
      ${escapeHtml(
        travel.year || ""
      )}
    </span>

  `;


  /*
    Only selected categories are visible.

    Sabba & Safta and Family are selected
    by default.

    New generations are hidden by default.
  */

  pin.style.display =

    selectedTravelCategories.has(
      category
    )

      ? ""

      : "none";


  /*
    Immediate UI feedback.

    Pin pulses while waiting for the first
    image to finish downloading and decoding.
  */

  pin.addEventListener(

    "click",

    async () => {


      if (
        pin.classList.contains(
          "loading"
        )
      ) {

        return;

      }


      pin.classList.add(
        "loading"
      );


      pin.setAttribute(
        "aria-busy",
        "true"
      );


      pin.disabled =
        true;


      try {

        await preloadFirstTravelImage(
          travel
        );


        openTravelModal(
          index
        );


      } catch (
        error
      ) {

        console.error(

          `Could not open ${travel.title}:`,

          error

        );


      } finally {

        pin.classList.remove(
          "loading"
        );


        pin.removeAttribute(
          "aria-busy"
        );


        pin.disabled =
          false;

      }

    }

  );


  travelPins.appendChild(
    pin
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


  const travel =

    TRAVELS[
      index
    ];


  if (
    !travel
  ) {

    return;

  }


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


  if (
    images.length === 0
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


  const currentUrl =

    images[
      currentImageIndex
    ];


  if (
    travelCarouselImage
  ) {

    travelCarouselImage.style.display =
      "block";


    try {

      travelCarouselImage.fetchPriority =
        "high";

    } catch (
      error
    ) {

    }


    travelCarouselImage.src =
      currentUrl;


    travelCarouselImage.alt =

      `${travel.title} travel photo ${currentImageIndex + 1}`;

  }


  if (
    travelImageCounter
  ) {

    travelImageCounter.textContent =

      images.length > 1

        ? `${currentImageIndex + 1} / ${images.length}`

        : "";

  }


  const hasMultipleImages =

    images.length > 1;


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


  preloadAdjacentTravelImages(
    travel
  );

}


/* ============================================
   PRELOAD ADJACENT IMAGES
============================================ */

function preloadAdjacentTravelImages(
  travel
) {

  const images =
    travel.images || [];


  if (
    images.length <= 1
  ) {

    return;

  }


  const nextIndex =

    (
      currentImageIndex
      +
      1
    )

    %

    images.length;


  const previousIndex =

    (
      currentImageIndex
      -
      1
      +
      images.length
    )

    %

    images.length;


  const urls =

    new Set(

      [
        images[
          nextIndex
        ],

        images[
          previousIndex
        ]
      ]

    );


  urls.forEach(

    url => {


      if (
        !url
      ) {

        return;

      }


      const image =
        new Image();


      try {

        image.fetchPriority =
          "low";

      } catch (
        error
      ) {

      }


      image.src =
        url;

    }

  );

}


/* ============================================
   IMAGE DOTS
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
    images.length <= 1
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

        index === currentImageIndex

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
    images.length <= 1
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
    images.length <= 1
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
    links.length === 0
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
   FULL-SCREEN LIGHTBOX
============================================ */

function openTravelLightbox() {

  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  const images =
    travel?.images || [];


  if (

    images.length === 0

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
   CHECK LIGHTBOX
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
   RENDER LIGHTBOX IMAGE
============================================ */

function renderTravelLightboxImage() {

  const travel =

    TRAVELS[
      currentTravelIndex
    ];


  const images =
    travel?.images || [];


  if (

    images.length === 0

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

    images.length > 1;


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
   LIGHTBOX NAVIGATION
============================================ */

function showPreviousLightboxImage() {

  showPreviousTravelImage();

}


function showNextLightboxImage() {

  showNextTravelImage();

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
   DROPBOX FILE URL
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
    const originalLine of lines
  ) {

    const line =

      originalLine.trim();


    if (
      !line
    ) {

      continue;

    }


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
        separator === -1
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


    const colon =

      line.indexOf(
        ":"
      );


    if (
      colon === -1
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
   HELPERS
============================================ */

function escapeHtml(
  value
) {

  return String(
    value
  ).replace(

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


function fileNameToLabel(
  filename
) {

  return filename

    .replace(
      /\.[^/.]+$/,
      ""
    )

    .replace(
      /_/g,
      " "
    );

}


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


function isImageFile(
  filename
) {

  return /\.(jpg|jpeg|png|webp|gif|avif)$/i
    .test(
      filename
    );

}


function isExternalUrl(
  value
) {

  return /^https?:\/\//i
    .test(
      value
    );

}


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
   CAROUSEL EVENTS
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


travelCarouselImage
  ?.addEventListener(

    "click",

    openTravelLightbox

  );


/* ============================================
   MODAL EVENTS
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


    if (
      isTravelLightboxOpen()
    ) {

      if (
        event.key === "Escape"
      ) {

        closeTravelLightbox();

        return;

      }


      if (
        event.key === "ArrowLeft"
      ) {

        showPreviousLightboxImage();

        return;

      }


      if (
        event.key === "ArrowRight"
      ) {

        showNextLightboxImage();

        return;

      }


      return;

    }


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
      event.key === "Escape"
    ) {

      closeTravelModal();

      return;

    }


    if (
      event.key === "ArrowLeft"
    ) {

      showPreviousTravelImage();

      return;

    }


    if (
      event.key === "ArrowRight"
    ) {

      showNextTravelImage();

    }

  }

);


/* ============================================
   COORDINATE HELPER

   Hold Alt / Option and click map.
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

        event.clientX < mapRect.left

        ||

        event.clientX > mapRect.right

        ||

        event.clientY < mapRect.top

        ||

        event.clientY > mapRect.bottom

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
        x.toFixed(1);


      const roundedY =
        y.toFixed(1);


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