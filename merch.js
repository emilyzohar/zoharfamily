const merchGrid = document.getElementById("merch-grid");

const quickView = document.getElementById("quick-view");
const quickViewImage = document.getElementById("quick-view-image");
const quickViewDots = document.getElementById("quick-view-dots");
const quickViewName = document.getElementById("quick-view-name");
const quickViewDescription =
  document.getElementById("quick-view-description");

const quickViewCreated =
  document.getElementById("quick-view-created");

const quickViewCreator =
  document.getElementById("quick-view-creator");

const quickViewOwner =
  document.getElementById("quick-view-owner");

const quickViewClose =
  document.getElementById("quick-view-close");


/* =========================
   BUILD INVENTORY
========================= */

MERCH_ITEMS.forEach((item) => {

  const card = document.createElement("article");

  card.className = "merch-card";

  card.innerHTML = `
    <div class="merch-image-wrap">

      <img
        class="merch-image"
        src="${item.images[0]}"
        alt="${item.name}"
      />

    </div>

    <div class="merch-card-dots"></div>

    <h2>${item.name}</h2>
  `;


  const image =
    card.querySelector(".merch-image");

  const dotsContainer =
    card.querySelector(".merch-card-dots");


  /* Image dots */

  if (item.images.length > 1) {

    item.images.forEach((imageSrc, index) => {

      const dot =
        document.createElement("button");

      dot.className =
        index === 0
          ? "merch-dot active"
          : "merch-dot";

      dot.setAttribute(
        "aria-label",
        `View image ${index + 1}`
      );


      dot.addEventListener(
        "click",
        (event) => {

          event.stopPropagation();

          image.src = imageSrc;

          dotsContainer
            .querySelectorAll(".merch-dot")
            .forEach((d) =>
              d.classList.remove("active")
            );

          dot.classList.add("active");
        }
      );


      dotsContainer.appendChild(dot);

    });

  }


  /* Open quick view */

  card.addEventListener(
    "click",
    () => openQuickView(item)
  );


  merchGrid.appendChild(card);

});


/* =========================
   QUICK VIEW
========================= */

function openQuickView(item) {

  quickViewName.textContent =
    item.name;

  quickViewDescription.textContent =
    item.description || "";

  quickViewCreated.textContent =
    item.created || "";

  quickViewCreator.textContent =
    item.createdBy || "";

  quickViewOwner.textContent =
    item.owner || "";

  quickViewImage.src =
    item.images[0];

  quickViewImage.alt =
    item.name;


  /* Build quick-view image dots */

  quickViewDots.innerHTML = "";

  if (item.images.length > 1) {

    item.images.forEach(
      (imageSrc, index) => {

        const dot =
          document.createElement("button");

        dot.className =
          index === 0
            ? "merch-dot active"
            : "merch-dot";


        dot.addEventListener(
          "click",
          () => {

            quickViewImage.src =
              imageSrc;

            quickViewDots
              .querySelectorAll(".merch-dot")
              .forEach((d) =>
                d.classList.remove("active")
              );

            dot.classList.add("active");

          }
        );


        quickViewDots.appendChild(dot);

      }
    );

  }


  quickView.classList.add("open");

  quickView.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );
}


/* =========================
   CLOSE QUICK VIEW
========================= */

function closeQuickView() {

  quickView.classList.remove("open");

  quickView.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-open"
  );

}


quickViewClose.addEventListener(
  "click",
  closeQuickView
);


document
  .querySelector(".quick-view-backdrop")
  .addEventListener(
    "click",
    closeQuickView
  );


document.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Escape") {
      closeQuickView();
    }

  }
);