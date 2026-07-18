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


const travelModalPrev =
  document.getElementById(
    "travel-modal-prev"
  );


const travelModalNext =
  document.getElementById(
    "travel-modal-next"
  );


const travelModalTitle =
  document.getElementById(
    "travel-modal-title"
  );


const travelModalYear =
  document.getElementById(
    "travel-modal-year"
  );


const travelModalCounter =
  document.getElementById(
    "travel-modal-counter"
  );


const travelModalDots =
  document.getElementById(
    "travel-modal-dots"
  );


const travelPdf =
  document.getElementById(
    "travel-pdf"
  );



/* ============================================
   STATE
============================================ */


let currentTravelIndex =
  0;


let currentPdfIndex =
  0;



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
        >
        </span>

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
   OPEN TRAVEL
============================================ */


function openTravelModal(
  travelIndex
) {


  currentTravelIndex =
    travelIndex;


  currentPdfIndex =
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
   RENDER MODAL
============================================ */


function renderTravelModal() {


  const travel =
    TRAVELS[
      currentTravelIndex
    ];


  const pdfs =
    travel.pdfs || [];


  travelModalTitle.textContent =
    travel.title;


  travelModalYear.textContent =
    travel.year;



  /* No PDF */

  if (
    pdfs.length === 0
  ) {


    travelPdf.removeAttribute(
      "src"
    );


    travelModalCounter.textContent =
      "No documents";


    travelModalPrev.style.display =
      "none";


    travelModalNext.style.display =
      "none";


    travelModalDots.innerHTML =
      "";


    return;

  }



  /* Display current PDF */

  travelPdf.src =
    pdfs[
      currentPdfIndex
    ];



  /* Counter */

  if (
    pdfs.length > 1
  ) {


    travelModalCounter.textContent =

      `${currentPdfIndex + 1} / ${pdfs.length}`;


  } else {


    travelModalCounter.textContent =
      "";


  }



  /* Show arrows only for multiple PDFs */

  const hasMultiplePdfs =

    pdfs.length > 1;


  travelModalPrev.style.display =

    hasMultiplePdfs

      ? ""

      : "none";


  travelModalNext.style.display =

    hasMultiplePdfs

      ? ""

      : "none";



  renderPdfDots();

}



/* ============================================
   PDF DOTS
============================================ */


function renderPdfDots() {


  const travel =
    TRAVELS[
      currentTravelIndex
    ];


  const pdfs =
    travel.pdfs || [];


  travelModalDots.innerHTML =
    "";


  if (
    pdfs.length <= 1
  ) {

    return;

  }


  pdfs.forEach(

    (
      pdf,
      index
    ) => {


      const dot =
        document.createElement(
          "button"
        );


      dot.type =
        "button";


      dot.className =

        index === currentPdfIndex

          ? "travel-modal-dot active"

          : "travel-modal-dot";


      dot.setAttribute(

        "aria-label",

        `View document ${index + 1}`

      );


      dot.addEventListener(

        "click",

        () => {


          currentPdfIndex =
            index;


          renderTravelModal();


        }

      );


      travelModalDots
        .appendChild(
          dot
        );


    }

  );

}



/* ============================================
   PREVIOUS PDF
============================================ */


function showPreviousPdf() {


  const pdfs =

    TRAVELS[
      currentTravelIndex
    ].pdfs;


  if (
    pdfs.length <= 1
  ) {

    return;

  }


  currentPdfIndex =

    (
      currentPdfIndex
      -
      1
      +
      pdfs.length
    )

    %

    pdfs.length;


  renderTravelModal();

}



/* ============================================
   NEXT PDF
============================================ */


function showNextPdf() {


  const pdfs =

    TRAVELS[
      currentTravelIndex
    ].pdfs;


  if (
    pdfs.length <= 1
  ) {

    return;

  }


  currentPdfIndex =

    (
      currentPdfIndex
      +
      1
    )

    %

    pdfs.length;


  renderTravelModal();

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


  /*
    Clear PDF so it does not
    continue using resources
    after modal closes.
  */

  travelPdf.removeAttribute(
    "src"
  );

}



/* ============================================
   MODAL EVENTS
============================================ */


travelModalPrev
  .addEventListener(

    "click",

    showPreviousPdf

  );


travelModalNext
  .addEventListener(

    "click",

    showNextPdf

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
   KEYBOARD
============================================ */


document.addEventListener(

  "keydown",

  (
    event
  ) => {


    if (

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

    }


    if (
      event.key ===
      "ArrowLeft"
    ) {

      showPreviousPdf();

    }


    if (
      event.key ===
      "ArrowRight"
    ) {

      showNextPdf();

    }


  }

);



/* ============================================
   COORDINATE HELPER

   ALT / OPTION + CLICK on map.

   Shows x/y percentages that can be
   copied directly into travel-data.js.
============================================ */


travelMap
  .parentElement
  .addEventListener(

    "click",

    (
      event
    ) => {


      /*
        Only activate when holding
        Alt / Option.
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
        Make sure click occurred
        within actual map image.
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



      coordinateHelper.hidden =
        false;


      coordinateHelper.textContent =

        `x: ${roundedX}, y: ${roundedY}`;



      coordinateHelper.style.left =

        `${x}%`;


      coordinateHelper.style.top =

        `${y}%`;



      console.log(

        `Travel pin coordinates: x: ${roundedX}, y: ${roundedY}`

      );



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