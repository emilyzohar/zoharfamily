/* =========================================================
   DROPBOX RECIPE SETTINGS
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

const recipePageContext =
  getPersonalPageContext(
    "Recipes"
  );

const DROPBOX_RECIPES_FOLDER =
  recipePageContext.person
    ? `/Zohar Family/Works/${recipePageContext.person}/${recipePageContext.section}`
    : "/Zohar Family/Recipes";

if (recipePageContext.person) {
  document.title =
    `${recipePageContext.person}'s Recipes | Zohar Family`;
}



/* =========================================================
   MOBILE / PERSONAL PAGE LAYOUT
   Skip the decorative pile on mobile and in person peek pages.
========================================================= */

function shouldSkipRecipePile() {
  return (
    Boolean(recipePageContext.person)
    ||
    window.matchMedia("(max-width: 850px)").matches
  );
}

/* =========================================================
   RECIPE DATA
========================================================= */

let RECIPES = [];

let currentRecipeIndex = 0;

let activeFilter =
  "all";

let searchTerm =
  "";

let hasSnappedToGrid =
  false;


/* =========================================================
   PAGE ELEMENTS
========================================================= */

const recipeGrid =
  document.getElementById(
    "recipes-grid"
  );

const recipeFilterButton =
  document.getElementById(
    "recipe-filter-button"
  );

const recipeFilterLabel =
  document.getElementById(
    "recipe-filter-label"
  );

const recipeFilterMenu =
  document.getElementById(
    "recipe-filter-menu"
  );

const recipeSearch =
  document.getElementById(
    "recipe-search"
  );

const recipesEmpty =
  document.getElementById(
    "recipes-empty"
  );


/* =========================================================
   MODAL ELEMENTS
========================================================= */

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

const recipeModalImageWrap =
  document.getElementById(
    "recipe-modal-image-wrap"
  );


/* =========================================================
   GENERAL HELPERS
========================================================= */

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


function normalise(
  value
) {

  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();

}


function createRecipeId(
  value
) {

  return String(
    value ?? ""
  )

    .trim()

    .toLowerCase()

    .normalize(
      "NFD"
    )

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /[^a-z0-9]+/g,
      "-"
    )

    .replace(
      /^-+|-+$/g,
      ""
    );

}


function getFilenameWithoutExtension(
  path
) {

  return String(
    path ?? ""
  )

    .split(
      "/"
    )

    .pop()

    .replace(
      /\.[^.]+$/,
      ""
    );

}


function createCategoryClass(
  category
) {

  return normalise(
    category
  )

    .replace(
      /[^a-z0-9]+/g,
      "-"
    )

    .replace(
      /^-+|-+$/g,
      ""
    );

}


/* =========================================================
   DROPBOX API URL
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


/* =========================================================
   DROPBOX FILE URL
========================================================= */

function getDropboxFileUrl(
  path
) {

  if (
    !path
  ) {

    return "";

  }


  return buildDropboxApiUrl(

    "/file",

    {
      path
    }

  );

}


/* =========================================================
   FETCH DROPBOX FOLDER
========================================================= */

async function fetchDropboxFolder(
  path
) {

  const url =
  buildDropboxApiUrl(
    "/folder",
    {
      path,
      recursive: "true"
    }
  );


  const response =

    await fetch(

      url,

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

      `Could not list the Dropbox recipe folder. HTTP ${response.status}. ${errorText}`

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

      "The Dropbox folder endpoint did not return a file list."

    );

  }


  return entries;

}


/* =========================================================
   FETCH DROPBOX TEXT FILE
========================================================= */

async function fetchDropboxText(
  path
) {

  const url =

    buildDropboxApiUrl(

      "/text",

      {
        path
      }

    );


  const response =

    await fetch(

      url,

      {

        method:
          "GET",


        headers: {

          Accept:
            "text/plain"

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

      `Could not load ${path}. HTTP ${response.status}. ${errorText}`

    );

  }


  return response
    .text();

}


/* =========================================================
   TEXT FILE METADATA
========================================================= */

function extractMetadataValue(
  text,
  fieldName
) {

  const escapedField =

    fieldName
      .replace(

        /[.*+?^${}()|[\]\\]/g,

        "\\$&"

      );


  const expression =

    new RegExp(

      `^\\s*${escapedField}\\s*:\\s*(.*?)\\s*$`,

      "im"

    );


  const match =

    text.match(
      expression
    );


  return match

    ? match[1]
        .trim()

    : "";

}


/* =========================================================
   RECIPE TEXT SECTIONS
========================================================= */

function extractRecipeSection(
  text,
  sectionName
) {

  const escapedSection =

    sectionName
      .replace(

        /[.*+?^${}()|[\]\\]/g,

        "\\$&"

      );


  const expression =

    new RegExp(

      `\\[${escapedSection}\\]([\\s\\S]*?)\\[\\/${escapedSection}\\]`,

      "i"

    );


  const match =

    text.match(
      expression
    );


  if (
    !match
  ) {

    return "";

  }


  return plainTextToRecipeHtml(

    match[1]
      .trim()

  );

}


/* =========================================================
   SIMPLE RECIPE TEXT FORMATTING
========================================================= */

function plainTextToRecipeHtml(
  text
) {

  const cleanText =

    String(
      text ?? ""
    )

      .replace(
        /\r\n/g,
        "\n"
      )

      .replace(
        /\r/g,
        "\n"
      )

      .trim();


  if (
    !cleanText
  ) {

    return "";

  }


  const blocks =

    cleanText
      .split(
        /\n\s*\n/
      );


  return blocks

    .map(

      block =>

        formatRecipeBlock(
          block
        )

    )

    .join(
      ""
    );

}


/* =========================================================
   FORMAT ONE TEXT BLOCK
========================================================= */

function formatRecipeBlock(
  block
) {

  const lines =

    String(
      block
    )

      .split(
        "\n"
      )

      .map(

        line =>

          line
            .trim()

      )

      .filter(
        Boolean
      );


  if (
    lines.length ===
      0
  ) {

    return "";

  }


  const allBullets =

    lines
      .every(

        line =>

          /^[-*]\s+/
            .test(
              line
            )

      );


  const allNumbers =

    lines
      .every(

        line =>

          /^\d+[.)]\s+/
            .test(
              line
            )

      );


  if (
    allBullets
  ) {

    const items =

      lines

        .map(

          line => {

            const text =

              line
                .replace(
                  /^[-*]\s+/,
                  ""
                );


            return `

              <li>
                ${formatInlineRecipeText(
                  text
                )}
              </li>

            `;

          }

        )

        .join(
          ""
        );


    return `

      <ul>
        ${items}
      </ul>

    `;

  }


  if (
    allNumbers
  ) {

    const items =

      lines

        .map(

          line => {

            const text =

              line
                .replace(
                  /^\d+[.)]\s+/,
                  ""
                );


            return `

              <li>
                ${formatInlineRecipeText(
                  text
                )}
              </li>

            `;

          }

        )

        .join(
          ""
        );


    return `

      <ol>
        ${items}
      </ol>

    `;

  }


  const paragraph =

    lines

      .map(

        line =>

          formatInlineRecipeText(
            line
          )

      )

      .join(
        "<br>"
      );


  return `

    <p>
      ${paragraph}
    </p>

  `;

}


/* =========================================================
   INLINE TEXT FORMATTING

   **text** becomes bold.
========================================================= */

function formatInlineRecipeText(
  value
) {

  let safeText =

    escapeHtml(
      value
    );


  safeText =

    safeText
      .replace(

        /\*\*(.+?)\*\*/g,

        "<strong>$1</strong>"

      );


  return safeText;

}


/* =========================================================
   PARSE ONE RECIPE TEXT FILE
========================================================= */

function parseRecipeText(
  text,
  sourcePath = ""
) {

  const cleanText =

    String(
      text ?? ""
    )

      .replace(
        /\r\n/g,
        "\n"
      )

      .replace(
        /\r/g,
        "\n"
      )

      .trim();


  const filenameId =

    createRecipeId(

      getFilenameWithoutExtension(
        sourcePath
      )

    );


  const name =

    extractMetadataValue(
      cleanText,
      "name"
    );


  const suppliedId =

    extractMetadataValue(
      cleanText,
      "id"
    );


  const category =

    extractMetadataValue(
      cleanText,
      "category"
    );


  const showInPileValue =

    extractMetadataValue(
      cleanText,
      "showInPile"
    );


  const orderValue =

    extractMetadataValue(
      cleanText,
      "order"
    );


  /* =====================================================
     MULTIPLE IMAGE PATHS

     Example:

     images: /Recipes/images/a.jpeg, /Recipes/images/b.jpeg
  ===================================================== */

  const imagesValue =
  extractMetadataValue(
    cleanText,
    "images"
  );


const recipeFolderPath =
  String(
    sourcePath || ""
  )
    .replace(
      /\/[^/]+$/,
      ""
    );


const imagePaths =
  imagesValue
    .split(",")
    .map(
      path => {
        let cleanPath =
          path.trim();

        /*
          Repair an accidental repeated field label:

          images: images: filename.jpeg
        */

        cleanPath =
          cleanPath.replace(
            /^images\s*:\s*/i,
            ""
          );

        if (
          !cleanPath
        ) {
          return "";
        }

        /*
          Convert old absolute paths:

          /Recipes/images/file.jpeg

          to:

          /Zohar Family/Recipes/images/file.jpeg
        */

        if (
          /^\/Recipes(?:\/|$)/i.test(
            cleanPath
          )
        ) {
          return cleanPath.replace(
            /^\/Recipes/i,
            DROPBOX_RECIPES_FOLDER
          );
        }

        /*
          Keep current absolute Dropbox paths.
        */

        if (
          cleanPath.startsWith("/")
        ) {
          return cleanPath;
        }

        /*
          Resolve relative paths from the folder
          containing the recipe text file.
        */

        return `${recipeFolderPath}/${cleanPath}`
          .replace(
            /\/+/g,
            "/"
          );
      }
    )
    .filter(
      Boolean
    );


  const numericOrder =

    Number(
      orderValue
    );


  const recipe = {

    id:

      createRecipeId(

        suppliedId

        ||

        filenameId

        ||

        name

      ),


    name:

      name,


    category:

      category,


    showInPile:

      [

        "true",

        "yes",

        "1"

      ]

        .includes(

          normalise(
            showInPileValue
          )

        ),


    order:

      orderValue !== ""

      &&

      Number.isFinite(
        numericOrder
      )

        ? numericOrder

        : null,


    imagePaths:

      imagePaths,


    ingredients:

      extractRecipeSection(
        cleanText,
        "ingredients"
      ),


    preparation:

      extractRecipeSection(
        cleanText,
        "preparation"
      ),


    secrets:

      extractRecipeSection(
        cleanText,
        "secrets"
      ),


    sourcePath:

      sourcePath

  };


  return recipe;

}


/* =========================================================
   VALIDATE ONE RECIPE
========================================================= */

function validateRecipe(
  recipe,
  filename
) {

  const errors =
    [];


  if (
    !recipe.id
  ) {

    errors.push(
      "missing id"
    );

  }


  if (
    !recipe.name
  ) {

    errors.push(
      "missing name"
    );

  }


  if (
    !recipe.category
  ) {

    errors.push(
      "missing category"
    );

  }


  if (
    !recipe.ingredients
  ) {

    errors.push(
      "missing [ingredients] section"
    );

  }


  if (
    !recipe.preparation
  ) {

    errors.push(
      "missing [preparation] section"
    );

  }


  if (
    errors.length >
      0
  ) {

    throw new Error(

      `${filename}: ${errors.join(", ")}.`

    );

  }


  return recipe;

}


/* =========================================================
   VALIDATE UNIQUE IDS
========================================================= */

function validateUniqueRecipeIds(
  recipes
) {

  const usedIds =

    new Map();


  recipes
    .forEach(

      recipe => {

        if (

          usedIds.has(
            recipe.id
          )

        ) {

          const firstPath =

            usedIds.get(
              recipe.id
            );


          throw new Error(

            `Duplicate recipe ID "${recipe.id}" in ${firstPath} and ${recipe.sourcePath}.`

          );

        }


        usedIds.set(

          recipe.id,

          recipe.sourcePath

        );

      }

    );

}


/* =========================================================
   RECIPE SORTING
========================================================= */

function getStableRecipeShuffleValue(
  recipe
) {

  /*
    Use the recipe's own identifying information to create
    a stable pseudo-random value. This keeps the pile looking
    casually shuffled, but gives every recipe the same place
    every time the page loads.
  */

  const key =

    [
      recipe.id,
      recipe.name,
      recipe.sourcePath
    ]
      .filter(Boolean)
      .join("|");


  let hash =
    2166136261;


  for (
    let index = 0;
    index < key.length;
    index += 1
  ) {

    hash ^=
      key.charCodeAt(
        index
      );


    hash =
      Math.imul(
        hash,
        16777619
      );

  }


  return hash >>> 0;

}


function shuffleRecipes(
  recipes
) {

  /*
    This replaces the old Math.random() shuffle.

    The display still looks shuffled, but the order is now
    deterministic, so the pile is identical on every visit.
  */

  return [...recipes]
    .sort(
      (
        recipeA,
        recipeB
      ) => {

        const hashDifference =

          getStableRecipeShuffleValue(
            recipeA
          )

          -

          getStableRecipeShuffleValue(
            recipeB
          );


        if (
          hashDifference !== 0
        ) {

          return hashDifference;

        }


        return String(
          recipeA.id
          ||
          recipeA.name
          ||
          ""
        )
          .localeCompare(
            String(
              recipeB.id
              ||
              recipeB.name
              ||
              ""
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

    );

}


/* =========================================================
   LOADING MESSAGE
========================================================= */

function showRecipeLoadingMessage() {

  recipeGrid.innerHTML = `

    <div class="recipes-load-message">

      <p>
        Loading recipes…
      </p>

    </div>

  `;


  recipesEmpty.hidden =
    true;

}


/* =========================================================
   LOADING ERROR
========================================================= */

function showRecipeLoadingError(
  message
) {

  recipeGrid.innerHTML = `

    <div class="recipes-load-error">

      <h2>
        Recipes could not be loaded
      </h2>

      <p>
        ${escapeHtml(
          message
        )}
      </p>

    </div>

  `;


  recipesEmpty.hidden =
    true;

}


/* =========================================================
   LOAD ALL RECIPES FROM DROPBOX
========================================================= */

async function loadRecipesFromDropbox() {

  recipeGrid
    .setAttribute(
      "aria-busy",
      "true"
    );


  recipeFilterButton.disabled =
  true;


  recipeSearch.disabled =
    true;


  showRecipeLoadingMessage();


  try {

    const entries =

      await fetchDropboxFolder(

        DROPBOX_RECIPES_FOLDER

      );


    const recipeFiles =

      entries

        .filter(

          entry => {

            const isFile =

              entry.type ===
                "file";


            const isTextFile =

              String(
                entry.name ?? ""
              )

                .toLowerCase()

                .endsWith(
                  ".txt"
                );


            return (

              isFile

              &&

              isTextFile

            );

          }

        )

        .sort(

          (
            fileA,
            fileB
          ) =>

            String(
              fileA.name
            )

              .localeCompare(

                String(
                  fileB.name
                )

              )

        );


    if (
      recipeFiles.length ===
        0
    ) {

      throw new Error(

        `No .txt recipe files were found in ${DROPBOX_RECIPES_FOLDER}.`

      );

    }


    const fileResults =

      await Promise.allSettled(

        recipeFiles.map(

          async file => {

            const text =

              await fetchDropboxText(

                file.path

              );


            const recipe =

              parseRecipeText(

                text,

                file.path

              );


            return validateRecipe(

              recipe,

              file.name

            );

          }

        )

      );


    const loadedRecipes =
      [];


    const failedFiles =
      [];


    fileResults
      .forEach(

        (
          result,
          index
        ) => {

          const file =

            recipeFiles[
              index
            ];


          if (

            result.status ===
              "fulfilled"

          ) {

            loadedRecipes.push(

              result.value

            );


            return;

          }


          failedFiles.push(

            file.name

          );


          console.error(

            `Recipe file failed: ${file.name}`,

            result.reason

          );

        }

      );


    if (
      loadedRecipes.length ===
        0
    ) {

      throw new Error(

        "Recipe files were found, but none could be read successfully. Check the browser console for details."

      );

    }


    validateUniqueRecipeIds(

      loadedRecipes

    );


    RECIPES =
  shuffleRecipes(
    loadedRecipes
  );


    resetRecipeInterface();

    buildCategoryFilter();

    renderRecipes();


    if (
      failedFiles.length >
        0
    ) {

      console.warn(

        `These recipe files were skipped: ${failedFiles.join(", ")}`

      );

    }

  }

  catch (
    error
  ) {

    console.error(

      "Recipe loading failed:",

      error

    );


    showRecipeLoadingError(

      error.message

      ||

      "An unknown error occurred."

    );

  }

  finally {

    recipeGrid
      .removeAttribute(
        "aria-busy"
      );


    recipeFilterButton.disabled =
  false;


    recipeSearch.disabled =
      false;

  }

}


/* =========================================================
   RESET PAGE STATE
========================================================= */

function resetRecipeInterface() {

  activeFilter =
    "all";


  searchTerm =
    "";


  hasSnappedToGrid =
    shouldSkipRecipePile();


  currentRecipeIndex =
    0;


  recipeSearch.value =
    "";


  recipeFilterLabel.textContent =
  "Filter";

recipeFilterMenu.innerHTML =
  "";

closeRecipeFilter();


  recipeGrid
    .classList
    .toggle(
      "is-grid",
      hasSnappedToGrid
    );


  recipeGrid
    .classList
    .toggle(
      "is-piled",
      !hasSnappedToGrid
    );

}


/* =========================================================
   BUILD CATEGORY FILTER
========================================================= */

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
    (categoryA, categoryB) =>
      categoryA.localeCompare(
        categoryB
      )
  );

  recipeFilterMenu.innerHTML =
    "";

  const allButton =
    createFilterOption(
      "all",
      "All recipes"
    );

  recipeFilterMenu.appendChild(
    allButton
  );

  categories.forEach(
    category => {
      const option =
        createFilterOption(
          normalise(
            category
          ),
          category
        );

      recipeFilterMenu.appendChild(
        option
      );
    }
  );
}

function createFilterOption(
  value,
  label
) {
  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    "recipes-filter-option";

  button.dataset.value =
    value;

  button.textContent =
    label;

  button.setAttribute(
    "role",
    "menuitem"
  );

  button.addEventListener(
    "click",
    () => {
      activeFilter =
        value;

      recipeFilterLabel.textContent =
        value === "all"
          ? "Filter"
          : label;

      closeRecipeFilter();

      applyRecipeFilters();
    }
  );

  return button;
}
function openRecipeFilter() {
  recipeFilterMenu.hidden =
    false;

  recipeFilterButton.setAttribute(
    "aria-expanded",
    "true"
  );
}


function closeRecipeFilter() {
  recipeFilterMenu.hidden =
    true;

  recipeFilterButton.setAttribute(
    "aria-expanded",
    "false"
  );
}


function toggleRecipeFilter() {
  const isOpen =
    recipeFilterButton.getAttribute(
      "aria-expanded"
    ) === "true";

  if (
    isOpen
  ) {
    closeRecipeFilter();
  } else {
    openRecipeFilter();
  }
}

recipeFilterButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    toggleRecipeFilter();
  }
);


recipeFilterMenu.addEventListener(
  "click",
  event => {
    event.stopPropagation();
  }
);


document.addEventListener(
  "click",
  closeRecipeFilter
);


document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape"
    ) {
      closeRecipeFilter();
    }
  }
);

/* =========================================================
   CREATE RECIPE CARD
========================================================= */

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


  if (
    recipe.showInPile
  ) {

    card.classList.add(
      "show-in-pile"
    );

  }


  card.href =
    "#";


  card.dataset.recipeId =
    recipe.id;


  card.dataset.name =

    normalise(
      recipe.name
    );


  card.dataset.category =

    normalise(
      recipe.category
    );


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

      index

      %

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

    String(
      index + 1
    );


  const categoryClass =

    createCategoryClass(
      recipe.category
    );


  card.innerHTML = `

    <div class="recipe-card-paper">

      <span
        class="recipe-card-category category-${categoryClass}"
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


/* =========================================================
   RENDER RECIPE CARDS
========================================================= */

function renderRecipes() {

  recipeGrid.innerHTML =
    "";


  let pileIndex =
    0;


  RECIPES
    .forEach(

      (
        recipe,
        index
      ) => {

        const card =

          createRecipeCard(

            recipe,

            index

          );


        if (
          recipe.showInPile
        ) {

          pileIndex +=
            1;


          card.dataset.pilePosition =

            String(
              pileIndex
            );

        }


        recipeGrid
          .appendChild(
            card
          );

      }

    );


  if (
    !shouldSkipRecipePile()
  ) {
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


    /*
      Keep the cover above every recipe card in pile mode.
      Some cards receive their own inline z-index, so this must
      also be inline rather than relying only on the CSS value.
    */

    pileCover.style.zIndex =
      "3";


    recipeGrid
      .appendChild(
        pileCover
      );
  }


  applyRecipeFilters();

}


/* =========================================================
   APPLY SEARCH AND CATEGORY FILTER
========================================================= */

function applyRecipeFilters() {

  const cards = [

    ...recipeGrid
      .querySelectorAll(
        ".recipe-card"
      )

  ];


  let visibleCount =
    0;


  cards
    .forEach(

      card => {

        const name =

          card.dataset.name

          ||

          "";


        const category =

          card.dataset.category

          ||

          "";


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

          visibleCount +=
            1;

        }

      }

    );


  recipesEmpty.hidden =

    visibleCount !==
      0;


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




/* =========================================================
   SEARCH EVENT
========================================================= */

recipeSearch
  .addEventListener(

    "input",

    event => {

      searchTerm =

        normalise(

          event.target.value

        );


      applyRecipeFilters();

    }

  );


/* =========================================================
   PILE TO GRID ANIMATION
========================================================= */

function openRecipeGrid() {

  if (
    hasSnappedToGrid
  ) {

    return;

  }


  hasSnappedToGrid =
    true;


  const cards = [

    ...recipeGrid
      .querySelectorAll(

        ".recipe-card:not(.recipe-card-hidden)"

      )

  ];


  const firstPositions =

    cards.map(

      card =>

        card
          .getBoundingClientRect()

    );


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


  const lastPositions =

    cards.map(

      card =>

        card
          .getBoundingClientRect()

    );


  cards
    .forEach(

      (
        card,
        index
      ) => {

        const deltaX =

          firstPositions[
            index
          ].left

          -

          lastPositions[
            index
          ].left;


        const deltaY =

          firstPositions[
            index
          ].top

          -

          lastPositions[
            index
          ].top;


        card.style.transition =
          "none";


        card.style.transform =

          `translate(${deltaX}px, ${deltaY}px)`;

      }

    );


  void recipeGrid
    .offsetHeight;


  cards
    .forEach(

      (
        card,
        index
      ) => {

        card.style.transition =

          `transform 900ms cubic-bezier(.2,.8,.2,1) ${index * 55}ms`;


        card.style.transform =

          "translate(0, 0)";

      }

    );


  const animationLength =

    900

    +

    cards.length * 55;


  window.setTimeout(

    () => {

      cards
        .forEach(

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


/* =========================================================
   GRID CLICK BEHAVIOUR
========================================================= */

recipeGrid
  .addEventListener(

    "click",

    event => {

      const pileCover =

        event.target.closest(

          ".recipe-pile-cover"

        );


      if (
        pileCover
      ) {

        event
          .preventDefault();


        if (
          !hasSnappedToGrid
        ) {

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


      event
        .preventDefault();


      if (
        !hasSnappedToGrid
        &&
        !shouldSkipRecipePile()
      ) {

        openRecipeGrid();

        return;

      }


      const recipeId =

        card.dataset.recipeId;


      const recipeIndex =

        RECIPES
          .findIndex(

            recipe =>

              recipe.id ===
                recipeId

          );


      if (
        recipeIndex !==
          -1
      ) {

        openRecipeModal(

          recipeIndex

        );

      }

    }

  );


/* =========================================================
   OPEN RECIPE MODAL
========================================================= */

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


  recipeModalClose
    .focus();

}


/* =========================================================
   RENDER CURRENT RECIPE
========================================================= */

function renderRecipeModal() {

  const recipe =

    RECIPES[
      currentRecipeIndex
    ];


  if (
    !recipe
  ) {

    return;

  }


  recipeModalTitle.textContent =

    recipe.name

    ||

    "";


  recipeModalCategory.textContent =

    recipe.category

    ||

    "";


  recipeModalIngredients.innerHTML =

    recipe.ingredients

    ||

    "";


  recipeModalPreparation.innerHTML =

    recipe.preparation

    ||

    "";


  /* =====================================================
     SAFTA'S SECRETS
  ===================================================== */

  const hasSecrets =

    Boolean(

      recipe.secrets

      &&

      recipe.secrets
        .trim()

    );


  if (
    hasSecrets
  ) {

    recipeModalSecrets.innerHTML =

      recipe.secrets;


    recipeModalSecretsSection.hidden =

      false;


    recipeModalSecretsSection.style.display =

      "";

  }

  else {

    recipeModalSecrets.innerHTML =

      "";


    recipeModalSecretsSection.hidden =

      true;


    recipeModalSecretsSection.style.display =

      "none";

  }


  /* =====================================================
     RECIPE IMAGES
  ===================================================== */

  recipeModalImageWrap.innerHTML =

    "";


  const hasImages =

    Array.isArray(

      recipe.imagePaths

    )

    &&

    recipe.imagePaths.length >
      0;


  if (
    hasImages
  ) {

    recipe.imagePaths
      .forEach(

        (
          imagePath,
          index
        ) => {


          const imageItem =

            document.createElement(

              "div"

            );


          imageItem.className =

            "recipe-modal-image-item";


          const image =

            document.createElement(

              "img"

            );


          image.className =

            "recipe-modal-image";

            const imageFilename =
  String(imagePath)
    .split("/")
    .pop()
    .toLowerCase();

if (
  imageFilename === "cheesecake.png"
  ||
  imageFilename === "cheescake.png"
) {
  imageItem.classList.add(
    "recipe-modal-image-item--transparent"
  );

  image.classList.add(
    "recipe-modal-image--transparent"
  );
}


          image.src =

            getDropboxFileUrl(

              imagePath

            );


          image.alt =

            `Original recipe image ${index + 1} for ${recipe.name}`;


          image.loading =

            "lazy";
image.addEventListener(
  "error",
  () => {
    const attemptedUrl =
      getDropboxFileUrl(
        imagePath
      );

    console.error(
      "Recipe image failed to load:",
      {
        recipe:
          recipe.name,

        imagePath:
          imagePath,

        attemptedUrl:
          attemptedUrl
      }
    );

    imageItem.remove();

    if (
      recipeModalImageWrap.children.length === 0
    ) {
      recipeModalImageWrap.hidden =
        true;
    }
  }
);


          imageItem
            .appendChild(

              image

            );


          recipeModalImageWrap
            .appendChild(

              imageItem

            );

        }

      );


    recipeModalImageWrap.hidden =

      false;

  }

  else {

    recipeModalImageWrap.hidden =

      true;

  }

}


/* =========================================================
   PREVIOUS RECIPE
========================================================= */

function showPreviousRecipe() {

  if (
    RECIPES.length ===
      0
  ) {

    return;

  }


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


/* =========================================================
   NEXT RECIPE
========================================================= */

function showNextRecipe() {

  if (
    RECIPES.length ===
      0
  ) {

    return;

  }


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


/* =========================================================
   CLOSE RECIPE MODAL
========================================================= */

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


/* =========================================================
   MODAL BUTTON EVENTS
========================================================= */

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


/* =========================================================
   KEYBOARD MODAL CONTROLS
========================================================= */

document
  .addEventListener(

    "keydown",

    event => {

      const modalIsOpen =

        recipeModal
          .classList
          .contains(
            "open"
          );


      if (
        !modalIsOpen
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


/* =========================================================
   INITIALISE
========================================================= */

loadRecipesFromDropbox();