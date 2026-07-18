/* ============================================
   ELEMENTS
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

  const travelModalGeneration =
  document.getElementById(
    "travel-modal-generation"
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
   STATE
============================================ */

let currentTravelIndex = 0;

let currentImageIndex = 0;


/* ============================================
   BUILD MAP PINS
============================================ */

function renderTravelPins() {
    

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
        pin.classList.add(
  `generation-${travel.generation}`
);


      pin.style.left =
        `${travel.x}%`;


      pin.style.top =
        `${travel.y}%`;


      pin.setAttribute(

        "aria-label",

        `${travel.title}, ${travel.year}`

      );


      pin.innerHTML = `

        <span
          class="travel-pin-dot"
        ></span>

        <span
          class="travel-pin-year"
        >
          ${travel.year}
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
   OPEN TRIP
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
    .classList
    .add(
      "open"
    );


  travelModal
    .setAttribute(
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
   RENDER TRIP
============================================ */

function renderTravelModal() {

  const travel =
    TRAVELS[
      currentTravelIndex
    ];


  travelModalTitle.textContent =
    travel.title || "";


  travelModalYear.textContent =
    travel.year || "";


  travelModalTravelers.textContent =
    travel.travelers || "";


  /* ========================================
     OPTIONAL BLURB
  ======================================== */

  const hasBlurb =

    typeof travel.blurb ===
      "string"

    &&

    travel.blurb.trim() !==
      "";


  if (
    hasBlurb
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


  renderTravelImage();

  renderTravelImageDots();

  renderTravelPdfLinks();

}


/* ============================================
   RENDER CURRENT IMAGE
============================================ */

function renderTravelImage() {

  const travel =
    TRAVELS[
      currentTravelIndex
    ];


  const images =
    travel.images || [];


  /*
    No images
  */

  if (
    images.length === 0
  ) {

    travelCarouselImage
      .removeAttribute(
        "src"
      );


    travelCarouselImage.alt =
      "";


    travelCarouselImage.style.display =
      "none";


    travelImagePrev.style.display =
      "none";


    travelImageNext.style.display =
      "none";


    travelImageCounter.textContent =
      "";


    return;

  }


  /*
    Safety check in case the current
    index is larger than the image list.
  */

  if (
    currentImageIndex >=
    images.length
  ) {

    currentImageIndex =
      0;

  }


  travelCarouselImage.style.display =
    "block";


  travelCarouselImage.src =
    images[
      currentImageIndex
    ];


  travelCarouselImage.alt =

    `${travel.title} travel photo ${currentImageIndex + 1}`;


  /*
    Counter
  */

  travelImageCounter.textContent =

    images.length > 1

      ? `${currentImageIndex + 1} / ${images.length}`

      : "";


  /*
    Only show arrows when
    there is more than one image.
  */

  const hasMultipleImages =

    images.length > 1;


  travelImagePrev.style.display =

    hasMultipleImages

      ? ""

      : "none";


  travelImageNext.style.display =

    hasMultipleImages

      ? ""

      : "none";

}


/* ============================================
   IMAGE DOTS
============================================ */

function renderTravelImageDots() {

  const travel =
    TRAVELS[
      currentTravelIndex
    ];


  const images =
    travel.images || [];


  travelImageDots.innerHTML =
    "";


  /*
    No dots needed for zero
    or one image.
  */

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

        }

      );


      travelImageDots
        .appendChild(
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
    ].images || [];


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

}


/* ============================================
   NEXT IMAGE
============================================ */

function showNextTravelImage() {

  const images =

    TRAVELS[
      currentTravelIndex
    ].images || [];


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

}


/* ============================================
   PDF LINKS
============================================ */

function renderTravelPdfLinks() {

  const travel =
    TRAVELS[
      currentTravelIndex
    ];


  const pdfs =
    travel.pdfs || [];


  travelPdfLinks.innerHTML =
    "";


  /*
    Hide entire Trip Documents
    section when there are no PDFs.
  */

  if (
    pdfs.length === 0
  ) {

    travelPdfLinks
      .parentElement
      .style
      .display =
      "none";


    return;

  }


  travelPdfLinks
    .parentElement
    .style
    .display =
    "";


  pdfs.forEach(

    (
      pdf,
      index
    ) => {


      const link =
        document.createElement(
          "a"
        );


      /*
        Supports plain strings:

        "assets/travel/trip/file.pdf"

        OR objects:

        {
          label: "Malaga",
          file: "assets/travel/trip/malaga.pdf"
        }
      */


      if (
        typeof pdf ===
        "string"
      ) {


        link.href =
          pdf;


        const fileName =

          pdf
            .split("/")
            .pop()
            .replace(
              /\.pdf$/i,
              ""
            );


        link.textContent =
          fileName;


      } else {


        link.href =
          pdf.file;


        link.textContent =

          pdf.label

          ||

          `Document ${index + 1}`;

      }


      link.target =
        "_blank";


      link.rel =
        "noopener";


      link.className =
        "travel-pdf-link";


      travelPdfLinks
        .appendChild(
          link
        );

    }

  );

}


/* ============================================
   CLOSE MODAL
============================================ */

function closeTravelModal() {

  travelModal
    .classList
    .remove(
      "open"
    );


  travelModal
    .setAttribute(
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
   MODAL EVENTS
============================================ */

travelImagePrev
  .addEventListener(

    "click",

    showPreviousTravelImage

  );


travelImageNext
  .addEventListener(

    "click",

    showNextTravelImage

  );


travelModalClose
  .addEventListener(

    "click",

    closeTravelModal

  );


travelModalBackdrop
  .addEventListener(

    "click",

    closeTravelModal

  );


/* ============================================
   KEYBOARD CONTROLS
============================================ */

document.addEventListener(

  "keydown",

  (
    event
  ) => {


    /*
      Do nothing unless
      the modal is open.
    */

    if (

      !travelModal
        .classList
        .contains(
          "open"
        )

    ) {

      return;

    }


    /*
      Escape closes trip.
    */

    if (
      event.key ===
      "Escape"
    ) {

      closeTravelModal();

      return;

    }


    /*
      Arrow keys control
      the image carousel.
    */

    if (
      event.key ===
      "ArrowLeft"
    ) {

      showPreviousTravelImage();

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

   Hold ALT / OPTION and click on map.

   Shows x/y percentage coordinates that
   can be copied directly into travel-data.js.
============================================ */

travelMap
  .parentElement
  .addEventListener(

    "click",

    (
      event
    ) => {


      /*
        Only activate while
        Alt / Option is held.
      */

      if (
        !event.altKey
      ) {

        return;

      }


      const mapRect =

        travelMap
          .getBoundingClientRect();


      /*
        Ensure click occurred
        inside actual map image.
      */

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


      /*
        Convert mouse coordinates
        to percentages of map size.
      */

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


      /*
        Display helper label.
      */

      coordinateHelper.hidden =
        false;


      coordinateHelper.textContent =

        `x: ${roundedX}, y: ${roundedY}`;


      coordinateHelper.style.left =
        `${x}%`;


      coordinateHelper.style.top =
        `${y}%`;


      /*
        Also log values in browser console.
      */

      console.log(

        `Travel pin coordinates: x: ${roundedX}, y: ${roundedY}`

      );


      /*
        Hide helper after 3.5 seconds.
      */

      window.setTimeout(

        () => {

          coordinateHelper.hidden =
            true;

        },

        3500

      );

    }

  );


/* ============================================
   INITIALISE
============================================ */

renderTravelPins();