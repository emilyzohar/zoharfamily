const recipeGrid =
  document.getElementById("recipes-grid");

const recipeFilter =
  document.getElementById("recipe-filter");

const recipeSearch =
  document.getElementById("recipe-search");

const recipesEmpty =
  document.getElementById("recipes-empty");

  const recipeModal =
  document.getElementById(
    "recipe-modal"
  );

const recipeModalBackdrop =
  document.getElementById(
    "recipe-modal-backdrop"
  );

const recipeModalClose =
  document.getElementById(
    "recipe-modal-close"
  );

const recipeModalPrev =
  document.getElementById(
    "recipe-modal-prev"
  );

const recipeModalNext =
  document.getElementById(
    "recipe-modal-next"
  );

const recipeModalTitle =
  document.getElementById(
    "recipe-modal-title"
  );

const recipeModalCategory =
  document.getElementById(
    "recipe-modal-category"
  );

const recipeModalIngredients =
  document.getElementById(
    "recipe-modal-ingredients"
  );

const recipeModalPreparation =
  document.getElementById(
    "recipe-modal-preparation"
  );

const recipeModalSecrets =
  document.getElementById(
    "recipe-modal-secrets"
  );

const recipeModalSecretsSection =
  document.getElementById(
    "recipe-modal-secrets-section"
  );

const recipeModalImage =
  document.getElementById(
    "recipe-modal-image"
  );


let currentRecipeIndex =
  0;


let activeFilter = "all";
let searchTerm = "";
let hasSnappedToGrid = false;


/* ============================================
   HELPERS
============================================ */

function escapeHtml(value) {

  return String(value).replace(
    /[&<>"']/g,

    (char) => {

      const entities = {

        "&": "&amp;",

        "<": "&lt;",

        ">": "&gt;",

        '"': "&quot;",

        "'": "&#039;"

      };

      return entities[char];

    }

  );

}


function normalise(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();

}


/* ============================================
   BUILD CATEGORY FILTER
============================================ */

function buildCategoryFilter() {

  const categories = [

    ...new Set(

      RECIPES

        .map(
          recipe =>
            recipe.category
        )

        .filter(Boolean)

    )

  ];


  categories.sort(
    (a, b) =>
      a.localeCompare(b)
  );


  categories.forEach(

    category => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        normalise(category);


      option.textContent =
        category;


      recipeFilter.appendChild(
        option
      );

    }

  );

}


/* ============================================
   CREATE RECIPE CARD
============================================ */

function createRecipeCard(
  recipe,
  index
  
) {
    

  const card =
    document.createElement(
      "a"
    );


  card.className =
    "recipe-card";
    if (recipe.showInPile) {
  card.classList.add("show-in-pile");
}


  card.href =
    recipe.href || "#";


  card.dataset.name =
    normalise(
      recipe.name
    );


  card.dataset.category =
    normalise(
      recipe.category
    );


  /*
    The cards all occupy the same
    centre point in pile mode.

    These values only change
    their small offset and rotation.
  */

  const pilePresets = [

    {
      x: -120,
      y: 20,
      r: -7
    },

    {
      x: 65,
      y: -45,
      r: 6
    },

    {
      x: -50,
      y: 95,
      r: -3
    },

    {
      x: 120,
      y: 45,
      r: 7
    },

    {
      x: -90,
      y: -70,
      r: 4
    },

    {
      x: 25,
      y: 85,
      r: -6
    },

    {
      x: 95,
      y: -85,
      r: 3
    },

    {
      x: -145,
      y: -20,
      r: -5
    }

  ];


  const pile =
    pilePresets[
      index %
      pilePresets.length
    ];


  card.style.setProperty(
    "--pile-x",
    `${pile.x}px`
  );


  card.style.setProperty(
    "--pile-y",
    `${pile.y}px`
  );


  card.style.setProperty(
    "--pile-r",
    `${pile.r}deg`
  );


  card.style.setProperty(
    "--card-delay",
    `${index * 55}ms`
  );


  card.style.zIndex =
    String(index + 1);


  card.innerHTML = `

    <div class="recipe-card-paper">

      <span
  class="recipe-card-category category-${normalise(recipe.category).replace(/\s+/g, "-")}"
>
  ${escapeHtml(
    recipe.category
  )}
</span>

      <h2
        class="recipe-card-title"
      >
        ${escapeHtml(
          recipe.name
        )}
      </h2>

    </div>

  `;


  return card;

}


/* ============================================
   RENDER RECIPES
============================================ */

function renderRecipes() {

  recipeGrid.innerHTML = "";


  /* Build all recipe cards */

  let pileIndex = 0;

RECIPES.forEach((recipe, index) => {

  const card =
    createRecipeCard(
      recipe,
      index
    );

  if (recipe.showInPile) {

    pileIndex += 1;

    card.dataset.pilePosition =
      pileIndex;

  }

  recipeGrid.appendChild(card);

});


  /* Add separate Safta's Kitchen cover image */

  const pileCover =
    document.createElement(
      "img"
    );

  pileCover.className =
    "recipe-pile-cover";

  pileCover.src =
    "assets/recipes/saftas-kitchen.png";

  pileCover.alt =
    "Safta's Kitchen";

  recipeGrid.appendChild(
    pileCover
  );


  applyRecipeFilters();

}


/* ============================================
   SEARCH + FILTER
============================================ */

function applyRecipeFilters() {

  const cards = [

    ...recipeGrid
      .querySelectorAll(
        ".recipe-card"
      )

  ];


  let visibleCount =
    0;


  cards.forEach(

    card => {

      const name =
        card.dataset.name;


      const category =
        card.dataset.category;


      const matchesFilter =

        activeFilter ===
          "all"

        ||

        category ===
          activeFilter;


      const matchesSearch =

        !searchTerm

        ||

        name.includes(
          searchTerm
        )

        ||

        category.includes(
          searchTerm
        );


      const isVisible =

        matchesFilter

        &&

        matchesSearch;


      card.classList.toggle(

        "recipe-card-hidden",

        !isVisible

      );


      if (
        isVisible
      ) {

        visibleCount += 1;

      }

    }

  );


  recipesEmpty.hidden =
    visibleCount !== 0;


  /*
    Once pile has opened,
    filtering keeps cards
    in the grid.
  */

  if (
    hasSnappedToGrid
  ) {

    recipeGrid
      .classList
      .remove(
        "is-piled"
      );


    recipeGrid
      .classList
      .add(
        "is-grid"
      );

  }

}


/* ============================================
   FILTER EVENT
============================================ */

recipeFilter.addEventListener(

  "change",

  (event) => {

    activeFilter =
      normalise(
        event.target.value
      );


    applyRecipeFilters();

  }

);


/* ============================================
   SEARCH EVENT
============================================ */

recipeSearch.addEventListener(

  "input",

  (event) => {

    searchTerm =
      normalise(
        event.target.value
      );


    applyRecipeFilters();

  }

);


/* ============================================
   PILE -> GRID
   CLICK THE PILE TO OPEN
============================================ */

function openRecipeGrid() {

  if (
    hasSnappedToGrid
  ) {

    return;

  }


  hasSnappedToGrid =
    true;


  /*
    Get currently visible cards.
  */

  const cards = [

    ...recipeGrid.querySelectorAll(

      ".recipe-card:not(.recipe-card-hidden)"

    )

  ];


  /*
    Save where each card currently
    appears in the pile.
  */

  const firstPositions =

    cards.map(

      card =>

        card.getBoundingClientRect()

    );


  /*
    Change layout from pile
    to normal CSS grid.
  */

  recipeGrid
    .classList
    .remove(
      "is-piled"
    );


  recipeGrid
    .classList
    .add(
      "is-grid"
    );


  /*
    Get each card's new
    final grid position.
  */

  const lastPositions =

    cards.map(

      card =>

        card.getBoundingClientRect()

    );


  /*
    Temporarily move each card
    back to where it was in the pile.

    This is the FLIP animation method.
  */

  cards.forEach(

    (
      card,
      index
    ) => {

      const deltaX =

        firstPositions[index].left

        -

        lastPositions[index].left;


      const deltaY =

        firstPositions[index].top

        -

        lastPositions[index].top;


      card.style.transition =
        "none";


      card.style.transform =

        `translate(
          ${deltaX}px,
          ${deltaY}px
        )`;

    }

  );


  /*
    Force browser to register
    those temporary positions.
  */

  void recipeGrid.offsetHeight;


  /*
    Animate every card
    into the final grid.
  */

  cards.forEach(

    (
      card,
      index
    ) => {

      card.style.transition =

        `transform
        900ms
        cubic-bezier(.2,.8,.2,1)
        ${index * 55}ms`;


      card.style.transform =

        "translate(0, 0)";

    }

  );


  /*
    Remove temporary inline
    animation styles afterward.

    The CSS can then take over again.
  */

  const animationLength =

    900

    +

    cards.length * 55;


  window.setTimeout(

    () => {

      cards.forEach(

        card => {

          card.style.transition =
            "";

          card.style.transform =
            "";

          card.style.zIndex =
            "";

        }

      );

    },

    animationLength

  );

}


/* ============================================
   CLICK BEHAVIOUR
============================================ */

recipeGrid.addEventListener(
  "click",
  (event) => {

    /*
      Clicking Safta's Kitchen cover
      opens the recipe pile.
    */

    if (
      event.target.classList.contains(
        "recipe-pile-cover"
      )
    ) {

      if (
        !hasSnappedToGrid
      ) {

        event.preventDefault();

        openRecipeGrid();

      }

      return;

    }


    const card =
      event.target.closest(
        ".recipe-card"
      );


    if (
      !card
    ) {

      return;

    }


    /*
      First click on a recipe card:
      open pile into grid.
    */

    if (
      !hasSnappedToGrid
    ) {

      event.preventDefault();

      openRecipeGrid();

      return;

    }


    /*
      Once grid is open:
      clicking a card opens recipe popup.
    */

    event.preventDefault();


    const cardName =
      card.dataset.name;


    const recipeIndex =
      RECIPES.findIndex(
        recipe =>
          normalise(
            recipe.name
          ) === cardName
      );


    if (
      recipeIndex !== -1
    ) {

      openRecipeModal(
        recipeIndex
      );

    }

  }
);

/* ============================================
   OPEN RECIPE MODAL
============================================ */

function openRecipeModal(
  index
) {

  currentRecipeIndex =
    index;


  renderRecipeModal();


  recipeModal
    .classList
    .add(
      "open"
    );


  recipeModal
    .setAttribute(
      "aria-hidden",
      "false"
    );


  document.body
    .classList
    .add(
      "recipe-modal-open"
    );

}


/* ============================================
   RENDER CURRENT RECIPE
============================================ */

function renderRecipeModal() {

  const recipe =
    RECIPES[currentRecipeIndex];


  recipeModalTitle.textContent =
    recipe.name || "";


  recipeModalCategory.textContent =
    recipe.category || "";


  recipeModalIngredients.innerHTML =
    recipe.ingredients || "";


  recipeModalPreparation.innerHTML =
    recipe.preparation || "";


  /* ========================================
     SAFTA'S SECRETS
  ======================================== */

  const hasSecrets =
    recipe.secrets &&
    recipe.secrets.trim() !== "";


  if (hasSecrets) {

    recipeModalSecrets.innerHTML =
      recipe.secrets;

    recipeModalSecretsSection.style.display =
      "";

  } else {

    recipeModalSecrets.innerHTML =
      "";

    recipeModalSecretsSection.style.display =
      "none";

  }

}


/* ============================================
   PREVIOUS RECIPE
============================================ */

function showPreviousRecipe() {

  currentRecipeIndex =

    (
      currentRecipeIndex
      -
      1
      +
      RECIPES.length
    )

    %

    RECIPES.length;


  renderRecipeModal();

}


/* ============================================
   NEXT RECIPE
============================================ */

function showNextRecipe() {

  currentRecipeIndex =

    (
      currentRecipeIndex
      +
      1
    )

    %

    RECIPES.length;


  renderRecipeModal();

}


/* ============================================
   CLOSE RECIPE MODAL
============================================ */

function closeRecipeModal() {

  recipeModal
    .classList
    .remove(
      "open"
    );


  recipeModal
    .setAttribute(
      "aria-hidden",
      "true"
    );


  document.body
    .classList
    .remove(
      "recipe-modal-open"
    );

}


/* ============================================
   MODAL EVENTS
============================================ */

recipeModalPrev
  .addEventListener(
    "click",
    showPreviousRecipe
  );


recipeModalNext
  .addEventListener(
    "click",
    showNextRecipe
  );


recipeModalClose
  .addEventListener(
    "click",
    closeRecipeModal
  );


recipeModalBackdrop
  .addEventListener(
    "click",
    closeRecipeModal
  );


document.addEventListener(

  "keydown",

  (event) => {


    if (
      !recipeModal
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

      closeRecipeModal();

    }


    if (
      event.key ===
      "ArrowLeft"
    ) {

      showPreviousRecipe();

    }


    if (
      event.key ===
      "ArrowRight"
    ) {

      showNextRecipe();

    }


  }

);


/* ============================================
   INITIALISE
============================================ */

buildCategoryFilter();

renderRecipes();

