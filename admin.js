const DROPBOX_API_BASE = "https://family-photo-api.emilyzohar.workers.dev";
const SESSION_TOKEN_KEY = "zohar-family-admin-token";

const RESERVED_PERSON_FOLDERS = new Set(["recipes", "merch", "travel", "memories"]);
const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "ogg"]);

const els = {
  authScreen: document.getElementById("authScreen"),
  editorScreen: document.getElementById("editorScreen"),
  adminToken: document.getElementById("adminToken"),
  connectButton: document.getElementById("connectButton"),
  loginStatus: document.getElementById("loginStatus"),
  lockButton: document.getElementById("lockButton"),
  restartButton: document.getElementById("restartButton"),
  stepMode: document.getElementById("stepMode"),
  stepContent: document.getElementById("stepContent"),
  stepPerson: document.getElementById("stepPerson"),
  stepPersonalContent: document.getElementById("stepPersonalContent"),
  stepLocation: document.getElementById("stepLocation"),
  stepItem: document.getElementById("stepItem"),
  stepEditor: document.getElementById("stepEditor"),
  modeTabs: document.getElementById("modeTabs"),
  contentTabs: document.getElementById("contentTabs"),
  personChooser: document.getElementById("personChooser"),
  personalContentTabs: document.getElementById("personalContentTabs"),
  locationArea: document.getElementById("locationArea"),
  itemArea: document.getElementById("itemArea"),
  formArea: document.getElementById("formArea"),
  destinationPreview: document.getElementById("destinationPreview"),
  publishButton: document.getElementById("publishButton"),
  previewButton: document.getElementById("previewButton"),
  publishStatus: document.getElementById("publishStatus"),
  progressWrap: document.getElementById("progressWrap"),
  progressFill: document.getElementById("progressFill"),
  locationStepNumber: document.getElementById("locationStepNumber"),
  locationStepLabel: document.getElementById("locationStepLabel"),
  itemStepNumber: document.getElementById("itemStepNumber"),
  itemStepLabel: document.getElementById("itemStepLabel"),
  editorStepNumber: document.getElementById("editorStepNumber"),
  editorStepLabel: document.getElementById("editorStepLabel"),
  previewModal: document.getElementById("previewModal"),
  previewBackdrop: document.getElementById("previewBackdrop"),
  previewClose: document.getElementById("previewClose"),
  previewContent: document.getElementById("previewContent")
};

const state = {
  mode: null,
  contentType: null,
  person: null,
  personalType: null,
  rootPath: null,
  entries: [],
  currentFolder: null,
  destinationFolder: null,
  selectedItem: null,
  selectedData: null,
  currentEditorKind: null,
  mapCleanup: null
};

els.adminToken.value = sessionStorage.getItem(SESSION_TOKEN_KEY) || "";

/* ------------------------------ helpers ------------------------------ */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function normalizePath(value) {
  return String(value ?? "").replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function joinDropboxPath(...parts) {
  const clean = parts.map(part => String(part ?? "").replace(/^\/+|\/+$/g, "")).filter(Boolean);
  return "/" + clean.join("/");
}

function parentPath(path) {
  const clean = normalizePath(path);
  const index = clean.lastIndexOf("/");
  return index > 0 ? clean.slice(0, index) : "/";
}

function filename(path) {
  return normalizePath(path).split("/").pop() || "";
}

function workFileDisplayName(path) {
  const rawName = filename(path);
  const lowerName = rawName.toLowerCase();

  if (lowerName === "blurbs.txt") return "Blurbs";
  if (lowerName === "movies.txt") return "Video links";

  return rawName;
}

function extension(path) {
  const match = filename(path).match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function withoutExtension(name) {
  return String(name ?? "").replace(/\.[^.]+$/, "");
}

function safeSegment(value, fallback = "Untitled") {
  const clean = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim();
  return clean || fallback;
}

function safeRelativePath(value) {
  return String(value ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => safeSegment(part))
    .join("/");
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function pathKey(value) { return normalizePath(value).toLowerCase(); }

function entryPath(entry) { return normalizePath(entry?.displayPath || entry?.path || ""); }

function isDirectChild(entry, folder) { return pathKey(parentPath(entryPath(entry))) === pathKey(folder); }

function relativePath(root, path) {
  const cleanRoot = normalizePath(root);
  const cleanPath = normalizePath(path);
  if (pathKey(cleanPath) === pathKey(cleanRoot)) return "";
  if (pathKey(cleanPath).startsWith(pathKey(cleanRoot) + "/")) return cleanPath.slice(cleanRoot.length + 1);
  return cleanPath;
}

function setHidden(element, hidden) { element.hidden = Boolean(hidden); }

function activateButtons(container, selector, value, dataKey) {
  container.querySelectorAll(selector).forEach(button => {
    button.classList.toggle("is-active", button.dataset[dataKey] === value);
  });
}

function setLoginStatus(message = "", kind = "") {
  els.loginStatus.textContent = message;
  els.loginStatus.className = `status-line small ${kind}`.trim();
}

function setPublishStatus(message = "", kind = "") {
  els.publishStatus.textContent = message;
  els.publishStatus.className = `status-line small ${kind}`.trim();
}

function setProgress(percent = 0) {
  els.progressWrap.hidden = percent <= 0 || percent >= 100;
  els.progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function authHeaders(extra = {}) {
  return { ...extra, Authorization: `Bearer ${els.adminToken.value.trim()}` };
}

async function adminFetch(path, options = {}) {
  const response = await fetch(`${DROPBOX_API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {})
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(details || `HTTP ${response.status}`);
  }
  return response;
}

function buildPublicUrl(endpoint, path, extra = {}) {
  const url = new URL(`${DROPBOX_API_BASE}${endpoint}`);
  url.searchParams.set("path", path);
  Object.entries(extra).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}


async function getDropboxPreviewUrl(path) {
  const url = new URL(`${DROPBOX_API_BASE}/shared-link`);
  url.searchParams.set("path", path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text().catch(() => `Could not create preview for ${path}`));
  }
  const data = await response.json();
  if (!data?.url) throw new Error("Dropbox did not return a preview link.");
  const preview = new URL(data.url);
  preview.searchParams.delete("raw");
  preview.searchParams.set("dl", "0");
  return preview.toString();
}

async function viewExistingWork(path) {
  if (!path) return;

  const ext = extension(path);
  const isPdf = ext === "pdf";
  const directPreview = IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);

  // Open immediately so the browser does not block the window after async work.
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    alert("Please allow pop-ups for this website to preview files.");
    return;
  }
  previewWindow.opener = null;
  previewWindow.document.title = "Opening preview…";
  previewWindow.document.body.innerHTML = '<p style="font-family:Georgia,serif;padding:32px;color:#681116">Opening preview…</p>';

  try {
    if (ext === "txt") {
      const text = await fetchText(path).catch(() => "");
      const trimmed = String(text).trim();
      if (/^https?:\/\/\S+$/i.test(trimmed)) {
        previewWindow.location.replace(trimmed);
        return;
      }
      previewWindow.location.replace(buildPublicUrl("/file", path));
      return;
    }

    if (directPreview) {
      previewWindow.location.replace(buildPublicUrl("/file", path));
      return;
    }

    if (isPdf) {
      const pdfPreview = await getDropboxPreviewUrl(path);
      previewWindow.location.replace(pdfPreview);
      return;
    }

    const dropboxPreview = await getDropboxPreviewUrl(path);
    previewWindow.location.replace(dropboxPreview);
  } catch (error) {
    previewWindow.document.title = "Preview unavailable";
    previewWindow.document.body.innerHTML = `<div style="font-family:Georgia,serif;padding:32px;color:#681116"><h1>Preview unavailable</h1><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function fetchFolder(path, recursive = true, allowMissing = false) {
  const url = new URL(`${DROPBOX_API_BASE}/folder`);
  url.searchParams.set("path", path);
  url.searchParams.set("recursive", recursive ? "true" : "false");
  const response = await fetch(url);
  if (!response.ok) {
    if (allowMissing && (response.status === 404 || response.status === 409)) return [];
    throw new Error(await response.text().catch(() => `Could not list ${path}`));
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchText(path, allowMissing = false) {
  const url = new URL(`${DROPBOX_API_BASE}/text`);
  url.searchParams.set("path", path);
  const response = await fetch(url);
  if (!response.ok) {
    if (allowMissing && (response.status === 404 || response.status === 409)) return "";
    throw new Error(await response.text().catch(() => `Could not load ${path}`));
  }
  return response.text();
}

async function ensureFolder(path) {
  const parts = normalizePath(path).split("/").filter(Boolean);
  if (parts[0] !== "Zohar Family") throw new Error("Destination must stay inside /Zohar Family.");
  for (let index = 2; index <= parts.length; index += 1) {
    const current = `/${parts.slice(0, index).join("/")}`;
    await adminFetch("/admin/mkdir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: current })
    });
  }
}

async function uploadBody(path, body, contentType = "application/octet-stream", overwrite = false) {
  const url = new URL(`${DROPBOX_API_BASE}/admin/upload`);
  url.searchParams.set("path", path);
  url.searchParams.set("overwrite", overwrite ? "true" : "false");
  const response = await fetch(url, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": contentType }),
    body
  });
  if (!response.ok) throw new Error(await response.text().catch(() => `Could not upload ${path}`));
  return response.json();
}

async function uploadText(path, text, overwrite = false) {
  return uploadBody(path, new Blob([text], { type: "text/plain;charset=utf-8" }), "text/plain;charset=utf-8", overwrite);
}

async function uploadFiles(folderPath, files) {
  const uploaded = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    setPublishStatus(`Adding ${file.name} (${index + 1} of ${files.length})…`, "working");
    const result = await uploadBody(joinDropboxPath(folderPath, safeSegment(file.name, `file-${index + 1}`)), file, file.type || "application/octet-stream", false);
    uploaded.push(result.entry?.displayPath || result.entry?.path || joinDropboxPath(folderPath, file.name));
  }
  return uploaded;
}

async function deletePath(path) {
  await adminFetch("/admin/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });
}

async function movePath(fromPath, toPath) {
  const response = await adminFetch("/admin/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPath, toPath })
  });
  return response.json();
}

/* ------------------------------ parsers ------------------------------ */
function metadataValue(text, key) {
  const match = String(text ?? "").match(new RegExp(`^${key.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*:\\s*(.*)$`, "im"));
  return match ? match[1].trim() : "";
}

function sectionValue(text, name) {
  const match = String(text ?? "").match(new RegExp(`\\[${name}\\]([\\s\\S]*?)\\[\\/${name}\\]`, "i"));
  return match ? match[1].trim() : "";
}

function resolveRelativeFilePath(sourcePath, rawPath) {
  const clean = String(rawPath ?? "").trim().replace(/^images\s*:\s*/i, "");
  if (!clean) return "";
  if (clean.startsWith("/")) {
    if (/^\/Recipes(?:\/|$)/i.test(clean)) return clean.replace(/^\/Recipes/i, "/Zohar Family/Recipes");
    return normalizePath(clean);
  }
  return joinDropboxPath(parentPath(sourcePath), clean);
}

function parseRecipe(text, sourcePath) {
  const images = metadataValue(text, "images").split(",").map(value => resolveRelativeFilePath(sourcePath, value)).filter(Boolean);
  return {
    sourcePath,
    name: metadataValue(text, "name") || withoutExtension(filename(sourcePath)),
    category: metadataValue(text, "category"),
    showInPile: ["true", "yes", "1"].includes(metadataValue(text, "showInPile").toLowerCase()),
    order: metadataValue(text, "order"),
    images,
    ingredients: sectionValue(text, "ingredients"),
    preparation: sectionValue(text, "preparation"),
    secrets: sectionValue(text, "secrets")
  };
}

function parseKeyValueText(text) {
  const out = {};
  let current = null;
  String(text ?? "").replace(/\r\n?/g, "\n").split("\n").forEach(line => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]*):\s*(.*)$/);
    if (match) {
      current = match[1].trim().toLowerCase().replace(/\s+/g, "");
      out[current] = match[2].trim();
    } else if (current && line.trim()) {
      out[current] = `${out[current]} ${line.trim()}`.trim();
    }
  });
  return out;
}

function parseTrip(text) {
  const result = { title: "", year: "", travelers: "", filterName: "", blurb: "", x: "", y: "", links: [] };
  String(text ?? "").split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    if (/^link\s*:/i.test(line)) {
      const value = line.replace(/^link\s*:/i, "").trim();
      const index = value.indexOf("|");
      if (index > -1) result.links.push({ label: value.slice(0, index).trim(), url: value.slice(index + 1).trim() });
      return;
    }
    const index = line.indexOf(":");
    if (index < 0) return;
    const key = line.slice(0, index).trim().toLowerCase().replace(/\s+/g, "");
    const value = line.slice(index + 1).trim();
    if (key === "title") result.title = value;
    else if (key === "year") result.year = value;
    else if (key === "travelers") result.travelers = value;
    else if (["filter", "filtername", "generation"].includes(key)) result.filterName = value;
    else if (key === "blurb") result.blurb = value;
    else if (key === "x") result.x = value;
    else if (key === "y") result.y = value;
  });
  return result;
}

function parseManifestLines(text) {
  return String(text ?? "").split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
}

function parseLinkText(text) {
  const links = [];
  String(text ?? "").split(/\r?\n/).forEach(line => {
    const clean = line.trim();
    if (!clean) return;
    const index = clean.indexOf("|");
    if (index > 0 && /^https?:\/\//i.test(clean.slice(index + 1).trim())) {
      links.push({ label: clean.slice(0, index).trim(), url: clean.slice(index + 1).trim() });
    } else if (/^https?:\/\//i.test(clean)) {
      links.push({ label: "Website", url: clean });
    }
  });
  return links;
}

function getMetadataValue(text, key) {
  const escapedKey =
    String(key).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const match =
    String(text || "").match(
      new RegExp(
        `^\\s*${escapedKey}\\s*:\\s*(.*?)\\s*$`,
        "im"
      )
    );

  return match?.[1]?.trim() || "";
}
/* ------------------------------ auth and flow ------------------------------ */
async function connect() {
  const token = els.adminToken.value.trim();
  if (!token) { setLoginStatus("Enter the admin password.", "error"); return; }
  els.connectButton.disabled = true;
  setLoginStatus("Checking password…", "working");
  try {
    await adminFetch("/admin/ping");
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    setHidden(els.authScreen, true);
    setHidden(els.editorScreen, false);
    setLoginStatus();
    restartFlow();
  } catch (error) {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setLoginStatus(`Could not sign in: ${error.message}`, "error");
  } finally {
    els.connectButton.disabled = false;
  }
}

function lock() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  els.adminToken.value = "";
  setHidden(els.editorScreen, true);
  setHidden(els.authScreen, false);
  restartFlow();
  els.adminToken.focus();
}

function resetStateAfter(level) {
  if (level <= 1) {
    state.contentType = null;
    state.person = null;
    state.personalType = null;
    state.rootPath = null;
    state.entries = [];
    state.currentFolder = null;
    state.destinationFolder = null;
    state.selectedItem = null;
    state.selectedData = null;
    state.currentEditorKind = null;
  }
  if (level <= 2) {
    state.person = null;
    state.personalType = null;
    state.rootPath = null;
    state.entries = [];
    state.currentFolder = null;
    state.destinationFolder = null;
    state.selectedItem = null;
    state.selectedData = null;
    state.currentEditorKind = null;
  }
  if (level <= 3) {
    state.personalType = null;
    state.rootPath = null;
    state.entries = [];
    state.currentFolder = null;
    state.destinationFolder = null;
    state.selectedItem = null;
    state.selectedData = null;
    state.currentEditorKind = null;
  }
  state.mapCleanup?.();
  state.mapCleanup = null;
}

function hideDownstream(from) {
  const order = [els.stepContent, els.stepPerson, els.stepPersonalContent, els.stepLocation, els.stepItem, els.stepEditor];
  const start = Math.max(0, from);
  order.slice(start).forEach(section => {
    if (section) section.hidden = true;
  });
  if (from <= 2) els.personChooser.innerHTML = "";
  if (from <= 3) {
    activateButtons(els.personalContentTabs, "[data-personal-type]", "", "personalType");
  }
  if (from <= 4) els.locationArea.innerHTML = "";
  if (from <= 5) els.itemArea.innerHTML = "";
  els.formArea.innerHTML = "";
  setPublishStatus();
}

function restartFlow() {
  state.mode = null;
  resetStateAfter(1);
  activateButtons(els.modeTabs, "[data-mode]", "", "mode");
  activateButtons(els.contentTabs, "[data-content-type]", "", "contentType");
  hideDownstream(0);
  els.stepMode.hidden = false;
}

async function chooseMode(mode) {
  state.mode = mode;
  resetStateAfter(1);
  activateButtons(els.modeTabs, "[data-mode]", mode, "mode");
  hideDownstream(1);
  els.stepContent.hidden = false;
}

async function chooseContentType(type) {
  state.contentType = type;
  resetStateAfter(2);
  state.contentType = type;
  activateButtons(els.contentTabs, "[data-content-type]", type, "contentType");
  hideDownstream(1);

  if (type === "work") {
    els.stepPerson.hidden = false;
    await renderPersonChooser();
    return;
  }

  await beginSectionWorkflow();
}
async function loadRecipeEditOptions() {
  const entries =
    await getDropboxFolder(
      "/Zohar Family/Recipes"
    );

  const recipeFiles =
    entries.filter(
      entry =>
        entry.type === "file" &&
        entry.name.toLowerCase().endsWith(".txt")
    );

  const recipes =
    await Promise.all(
      recipeFiles.map(
        async file => {
          const text =
            await getDropboxText(
              file.path
            );

          const name =
            getMetadataValue(
              text,
              "name"
            );

          const category =
            getMetadataValue(
              text,
              "category"
            );

          return {
            path: file.path,
            name:
              name ||
              file.name.replace(/\.txt$/i, ""),
            category
          };
        }
      )
    );

  return recipes;
}

async function loadTravelEditOptions() {
  const entries =
    await getDropboxFolder(
      "/Zohar Family/Travel"
    );

  const folders =
    entries.filter(
      entry =>
        entry.type === "folder"
    );

  const trips =
    await Promise.all(
      folders.map(
        async folder => {
          try {
            const text =
              await getDropboxText(
                `${folder.path}/trip.txt`
              );

            return {
              path: folder.path,

              title:
                getMetadataValue(
                  text,
                  "Title"
                )
                ||
                folder.name,

              year:
                getMetadataValue(
                  text,
                  "Year"
                )
            };

          } catch {
            return null;
          }
        }
      )
    );

  return trips.filter(Boolean);
}
async function renderPersonChooser() {
  els.personChooser.innerHTML = `<div class="notice small">Loading people…</div>`;
  let entries = [];
  try {
    entries = await fetchFolder("/Zohar Family/Works", false, true);
  } catch (error) {
    els.personChooser.innerHTML = `<div class="notice bad small">${escapeHtml(error.message)}</div>`;
    return;
  }

  const people = entries
    .filter(entry => String(entry.type).toLowerCase() === "folder")
    .map(entry => entry.name)
    .sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));

  const allowNew = state.mode === "add";
  els.personChooser.innerHTML = `
    <div class="folder-browser-toolbar">
      <label class="field">
        <span>Find a person</span>
        <input id="personSearch" type="search" placeholder="Search names">
      </label>
      ${allowNew ? `<label class="field"><span>Or create a content page for someone else</span><div class="row row-left compact-row"><input id="newPersonName" placeholder="Name"><button id="createPersonChoice" class="btn btn-primary" type="button">Continue</button></div></label>` : ""}
    </div>
    <div id="personList" class="person-list"></div>
  `;

  const list = document.getElementById("personList");
  const search = document.getElementById("personSearch");
  const paint = () => {
    const term = search.value.trim().toLowerCase();
    const visible = people.filter(name => name.toLowerCase().includes(term));
    list.innerHTML = visible.length
      ? visible.map(name => `<button class="tab-btn person-button" type="button" data-person-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")
      : `<div class="browser-empty">No matching people.</div>`;
    list.querySelectorAll("[data-person-name]").forEach(button => {
      button.addEventListener("click", () => choosePerson(button.dataset.personName));
    });
  };
  search.addEventListener("input", paint);
  paint();

  document.getElementById("createPersonChoice")?.addEventListener("click", () => {
    const name = document.getElementById("newPersonName").value.trim();
    if (!name) return;
    choosePerson(safeSegment(name));
  });
}

async function choosePerson(person) {
  state.person = person;
  state.personalType = null;
  state.rootPath = null;
  state.entries = [];
  state.currentFolder = null;
  state.destinationFolder = null;
  state.selectedItem = null;
  state.selectedData = null;
  state.currentEditorKind = null;

  els.stepPerson.querySelectorAll("[data-person-name]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.personName === person);
  });

  els.stepPersonalContent.hidden = false;
  els.stepLocation.hidden = true;
  els.stepItem.hidden = true;
  els.stepEditor.hidden = true;
  activateButtons(els.personalContentTabs, "[data-personal-type]", "", "personalType");
  els.stepPersonalContent.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function choosePersonalType(type) {
  state.personalType = type;
  state.rootPath = null;
  state.entries = [];
  state.currentFolder = null;
  state.destinationFolder = null;
  state.selectedItem = null;
  state.selectedData = null;
  state.currentEditorKind = null;

  activateButtons(els.personalContentTabs, "[data-personal-type]", type, "personalType");
  els.stepLocation.hidden = true;
  els.stepItem.hidden = true;
  els.stepEditor.hidden = true;
  els.locationArea.innerHTML = "";
  els.itemArea.innerHTML = "";
  els.formArea.innerHTML = "";

  await beginSectionWorkflow();
}

function currentWorkflow() {
  if (state.contentType === "recipe") {
    return { kind: "recipe", root: "/Zohar Family/Recipes", hierarchy: false, personal: false };
  }
  if (state.contentType === "travel") {
    return { kind: "travel", root: "/Zohar Family/Travel", hierarchy: false, personal: false };
  }
  if (state.contentType === "memory") {
    return { kind: "memory", root: "/Zohar Family/Memories", hierarchy: true, personal: false };
  }
  if (state.contentType === "merch") {
    return { kind: "merch", root: "/Zohar Family/Merch", hierarchy: false, personal: false };
  }

  if (state.contentType === "work" && state.person && state.personalType) {
    const personRoot = joinDropboxPath("Zohar Family", "Works", state.person);

    if (state.personalType === "work") {
      return {
        kind: "work",
        root: personRoot,
        hierarchy: true,
        personal: true
      };
    }

    if (state.personalType === "recipe") {
      return {
        kind: "recipe",
        root: joinDropboxPath(personRoot, "Recipes"),
        hierarchy: false,
        personal: true
      };
    }

    if (state.personalType === "travel") {
      return {
        kind: "personalTravel",
        root: joinDropboxPath(personRoot, "Travel"),
        hierarchy: false,
        personal: true
      };
    }

    if (state.personalType === "memory") {
      return {
        kind: "personalMemory",
        root: joinDropboxPath(personRoot, "Memories"),
        hierarchy: false,
        personal: true
      };
    }

    if (state.personalType === "merch") {
      return {
        kind: "merch",
        root: joinDropboxPath(personRoot, "Merch"),
        hierarchy: false,
        personal: true
      };
    }
  }

  return null;
}

async function beginSectionWorkflow() {
  const workflow = currentWorkflow();
  if (!workflow) return;

  state.rootPath = workflow.root;
  state.currentEditorKind = workflow.kind;

  // Ordinary personal sections can be created immediately. Travel and
  // Memories are reference selectors, so their folders are created only
  // when the selection is saved.
  if (
    workflow.personal &&
    state.mode === "add" &&
    !["personalTravel", "personalMemory"].includes(workflow.kind)
  ) {
    await ensureFolder(workflow.root);
  }

  if (workflow.kind === "personalTravel") {
    await showPersonalTravelEditor(workflow);
    return;
  }

  if (workflow.kind === "personalMemory") {
    await showPersonalMemoryEditor(workflow);
    return;
  }

  // Recipes are intentionally flat from the administrator's perspective.
  // New recipes go directly into /Zohar Family/Recipes and editing shows one
  // flattened list of recipe records, even if legacy recipe files are nested.
  if (workflow.kind === "recipe") {
    if (state.mode === "add") {
      state.destinationFolder = workflow.root;
      await showEditor("recipe", null, workflow);
    } else {
      await showRecipeItemStep(workflow);
    }
    return;
  }

  if (workflow.hierarchy) {
    await showFolderStep(workflow);
    return;
  }

  if (state.mode === "add") {
    state.destinationFolder = workflow.root;
    await showEditor(workflow.kind, null, workflow);
  } else {
    await showDirectItemStep(workflow);
  }
}


async function showPersonalTravelEditor(workflow) {
  els.stepEditor.hidden = false;
  els.editorStepNumber.textContent = "5";
  els.editorStepLabel.textContent = "Select trips";
  els.formArea.innerHTML = `<div class="notice small">Loading trips…</div>`;
  setPublishStatus();

  try {
    const sharedEntries = await fetchFolder("/Zohar Family/Travel", false, true);
    const tripFolders = sharedEntries
      .filter(entry => String(entry.type).toLowerCase() === "folder");

    const currentManifest = await fetchText(
      joinDropboxPath(workflow.root, "trips.txt"),
      true
    ).catch(() => "");

    const currentNames = parseManifestLines(currentManifest);
    const currentKeys = new Set(currentNames.map(name => name.toLowerCase()));

    const trips = (
      await Promise.all(
        tripFolders.map(async folder => {
          const root = entryPath(folder);
          try {
            const data = parseTrip(
              await fetchText(joinDropboxPath(root, "trip.txt"))
            );
            return {
              folderName: folder.name,
              title: data.title || folder.name,
              year: data.year || "",
              selected: currentKeys.has(String(folder.name).toLowerCase())
            };
          } catch {
            return {
              folderName: folder.name,
              title: folder.name,
              year: "",
              selected: currentKeys.has(String(folder.name).toLowerCase())
            };
          }
        })
      )
    ).sort((a, b) =>
      String(a.title).localeCompare(String(b.title), undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );

    state.selectedData = {
      root: workflow.root,
      currentTripNames: currentNames,
      trips
    };

    const existing = trips.filter(trip => trip.selected);
    const available = trips.filter(trip => !trip.selected);

    els.formArea.innerHTML = `
      <form class="editor-form personal-selector personal-travel-selector" data-kind="personalTravel">
        <div class="form-heading"><h2>${escapeHtml(state.person)}'s Travel</h2></div>

        ${existing.length ? `
          <div class="field">
            <span>Currently shown</span>
            <div class="choice-grid">
              ${existing.map(trip => `
                <label class="choice-item">
                  <input
                    type="checkbox"
                    data-remove-personal-trip="${escapeHtml(trip.folderName)}"
                  >
                  <span>
                    ${escapeHtml(trip.title)}
                    ${trip.year ? ` — ${escapeHtml(trip.year)}` : ""}
                    <small class="warn">Remove</small>
                  </span>
                </label>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <div class="field">
          <span>Add trips</span>
          <label class="field">
            <input id="personalTripSearch" type="search" placeholder="Search trips">
          </label>
          <div id="personalTripChoices" class="choice-grid">
            ${available.length ? available.map(trip => `
              <label
                class="choice-item"
                data-personal-trip-search="${escapeHtml(`${trip.title} ${trip.year}`.toLowerCase())}"
              >
                <input
                  type="checkbox"
                  data-add-personal-trip="${escapeHtml(trip.folderName)}"
                >
                <span>
                  ${escapeHtml(trip.title)}
                  ${trip.year ? ` — ${escapeHtml(trip.year)}` : ""}
                </span>
              </label>
            `).join("") : `<div class="browser-empty">All shared trips are already on this page.</div>`}
          </div>
        </div>
      </form>
    `;

    const search = document.getElementById("personalTripSearch");
    search?.addEventListener("input", () => {
      const term = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-personal-trip-search]").forEach(row => {
        row.hidden = Boolean(term) && !row.dataset.personalTripSearch.includes(term);
      });
    });

    updateDestinationPreview();
    els.stepEditor.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (error) {
    els.formArea.innerHTML = `<div class="notice bad small">${escapeHtml(error.message)}</div>`;
  }
}


function cleanMemoryReference(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function memoryReferenceName(reference) {
  const clean = cleanMemoryReference(reference);
  return clean.split("/").filter(Boolean).pop() || clean;
}

function splitMemoryReferences(value) {
  return String(value || "")
    .split(",")
    .map(cleanMemoryReference)
    .filter(Boolean);
}

function parsePersonalMemoryGroups(text) {
  const lines = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));

  if (!lines.length) return [];

  const hasHeadings = lines.some(line => line.includes("->"));

  if (!hasHeadings) {
    return lines.flatMap(line =>
      splitMemoryReferences(line).map(reference => ({
        name: memoryReferenceName(reference),
        references: [reference]
      }))
    );
  }

  const groups = [];
  let currentGroup = null;

  function addGroup(name) {
    const cleanName = String(name || "").trim().replace(/[\\/]+/g, " - ");
    if (!cleanName) return null;

    let group = groups.find(
      item => item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (!group) {
      group = { name: cleanName, references: [] };
      groups.push(group);
    }

    return group;
  }

  lines.forEach(line => {
    const arrowIndex = line.indexOf("->");

    if (arrowIndex !== -1) {
      currentGroup = addGroup(line.slice(0, arrowIndex));
      if (!currentGroup) return;

      const sameLine = splitMemoryReferences(line.slice(arrowIndex + 2));
      currentGroup.references.push(...sameLine);
      return;
    }

    const references = splitMemoryReferences(line);

    if (currentGroup) {
      currentGroup.references.push(...references);
      return;
    }

    references.forEach(reference => {
      const group = addGroup(memoryReferenceName(reference));
      group?.references.push(reference);
    });
  });

  groups.forEach(group => {
    const seen = new Set();
    group.references = group.references.filter(reference => {
      const key = reference.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  return groups.filter(group => group.references.length);
}

function serializePersonalMemoryGroups(groups) {
  const cleanGroups = groups
    .map(group => ({
      name: String(group.name || "").trim(),
      references: Array.from(
        new Set(
          (group.references || [])
            .map(cleanMemoryReference)
            .filter(Boolean)
        )
      )
    }))
    .filter(group => group.name && group.references.length);

  if (!cleanGroups.length) return "";

  return cleanGroups
    .map(group => `${group.name} ->\n${group.references.join("\n")}`)
    .join("\n\n") + "\n";
}

function sharedMemoryRelativePath(path) {
  const root = "/Zohar Family/Memories";
  const cleanPath = normalizePath(path);
  if (pathKey(cleanPath) === pathKey(root)) return "";
  if (pathKey(cleanPath).startsWith(pathKey(root) + "/")) {
    return cleanPath.slice(root.length + 1);
  }
  return cleanPath.replace(/^\/+/, "");
}

function supportedPersonalMemoryEntry(entry) {
  if (String(entry?.type || "").toLowerCase() !== "file") return false;
  const ext = extension(entryPath(entry));
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

function buildSharedMemoryTree(entries) {
  const rootPath = "/Zohar Family/Memories";
  const root = {
    name: "Memories",
    path: rootPath,
    folders: [],
    files: []
  };

  const folders = new Map([[pathKey(rootPath), root]]);

  entries
    .filter(entry => String(entry.type).toLowerCase() === "folder")
    .sort((a, b) => entryPath(a).split("/").length - entryPath(b).split("/").length)
    .forEach(entry => {
      const path = entryPath(entry);
      const node = {
        name: entry.name || filename(path),
        path,
        folders: [],
        files: []
      };

      folders.set(pathKey(path), node);

      const parent =
        folders.get(pathKey(parentPath(path))) ||
        root;

      parent.folders.push(node);
    });

  entries
    .filter(supportedPersonalMemoryEntry)
    .forEach(entry => {
      const path = entryPath(entry);
      const parent =
        folders.get(pathKey(parentPath(path))) ||
        root;

      parent.files.push({
        name: entry.name || filename(path),
        path
      });
    });

  function sortNode(node) {
    node.folders.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
    node.files.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
    node.folders.forEach(sortNode);
  }

  sortNode(root);
  return root;
}

function renderMemoryTreeNode(node, selectedKeys, depth = 0) {
  const folderReference = sharedMemoryRelativePath(node.path);
  const folderAlreadySelected =
    folderReference &&
    selectedKeys.has(folderReference.toLowerCase());

  const fileTiles = node.files.map(file => {
    const reference = sharedMemoryRelativePath(file.path);
    const alreadySelected = selectedKeys.has(reference.toLowerCase());
    const src = buildPublicUrl("/file", file.path);
    const ext = extension(file.path);
    const parentReference = sharedMemoryRelativePath(parentPath(file.path));
    const previewReference = parentReference || reference;
    const mediaMarkup = VIDEO_EXTENSIONS.has(ext)
      ? `<video muted playsinline preload="metadata" src="${escapeHtml(src)}"></video>`
      : `<img src="${escapeHtml(src)}" alt="${escapeHtml(file.name)}" loading="lazy">`;

    return `
      <div
        class="memory-tree-file memory-photo-tile ${alreadySelected ? "is-already-selected" : ""}"
        data-memory-search="${escapeHtml(`${file.name} ${reference}`.toLowerCase())}"
      >
        <label class="memory-photo-select" title="Select ${escapeHtml(file.name)}">
          <input
            type="checkbox"
            data-add-personal-memory="${escapeHtml(reference)}"
            data-memory-kind="file"
            ${alreadySelected ? "disabled" : ""}
          >
          <span class="memory-photo-thumb">${mediaMarkup}</span>
        </label>
        <button
          class="memory-photo-open"
          type="button"
          data-memory-preview="${escapeHtml(previewReference)}"
          data-memory-preview-start="${escapeHtml(reference)}"
          aria-label="Open ${escapeHtml(file.name)} larger"
        >↗</button>
      </div>
    `;
  }).join("");

  const folderHtml = node.folders.map(folder =>
    renderMemoryTreeNode(folder, selectedKeys, depth + 1)
  ).join("");

  const childHtml = `
    ${fileTiles ? `<div class="memory-photo-grid">${fileTiles}</div>` : ""}
    ${folderHtml}
  `;

  if (!folderReference) return childHtml;

  return `
    <details
      class="memory-tree-branch"
      data-memory-search="${escapeHtml(`${node.name} ${folderReference}`.toLowerCase())}"
      ${depth === 1 ? "open" : ""}
    >
      <summary>${escapeHtml(node.name)}</summary>

      <div class="memory-tree-folder-actions ${folderAlreadySelected ? "is-already-selected" : ""}">
        <label class="memory-tree-folder-choice">
          <input
            type="checkbox"
            data-add-personal-memory="${escapeHtml(folderReference)}"
            data-memory-kind="folder"
            ${folderAlreadySelected ? "disabled" : ""}
          >
          <span>Select this whole album</span>
        </label>
        <button
          class="memory-preview-button"
          type="button"
          data-memory-preview="${escapeHtml(folderReference)}"
        >Preview album</button>
      </div>

      <div class="memory-tree-children">
        ${childHtml || `<div class="browser-empty">No selectable media.</div>`}
      </div>
    </details>
  `;
}

function openPersonalMemoryPreview(reference, startReference = "") {
  const cleanReference = cleanMemoryReference(reference);
  if (!cleanReference) return;

  const sharedRoot = "/Zohar Family/Memories";
  const fullPath = joinDropboxPath(sharedRoot, cleanReference);
  const entries = state.selectedData?.sharedEntries || [];

  const exactFile = entries.find(entry =>
    String(entry.type).toLowerCase() === "file" &&
    pathKey(entryPath(entry)) === pathKey(fullPath) &&
    supportedPersonalMemoryEntry(entry)
  );

  let media = [];

  if (exactFile) {
    media = [exactFile];
  } else {
    const prefix = pathKey(fullPath) + "/";
    media = entries.filter(entry =>
      supportedPersonalMemoryEntry(entry) &&
      pathKey(entryPath(entry)).startsWith(prefix)
    );
  }

  media.sort((a, b) =>
    String(entryPath(a)).localeCompare(String(entryPath(b)), undefined, {
      numeric: true,
      sensitivity: "base"
    })
  );

  if (!media.length) {
    els.previewContent.innerHTML = `
      <div class="preview-layout memory-preview-layout">
        <h2 class="preview-title">${escapeHtml(memoryReferenceName(cleanReference) || "Memory")}</h2>
        <div class="browser-empty">No previewable photos or videos in this selection.</div>
      </div>
    `;
    els.previewModal.classList.add("is-open");
    els.previewModal.setAttribute("aria-hidden", "false");
    return;
  }

  const cleanStart = cleanMemoryReference(startReference);
  let activeIndex = Math.max(
    0,
    media.findIndex(entry =>
      pathKey(sharedMemoryRelativePath(entryPath(entry))) === pathKey(cleanStart)
    )
  );

  const title = memoryReferenceName(cleanReference) || "Memory";

  els.previewContent.innerHTML = `
    <div class="preview-layout memory-preview-layout">
      <h2 class="preview-title">${escapeHtml(title)}</h2>
      <div class="memory-preview-path">${escapeHtml(cleanReference)}</div>
      <div class="personal-memory-carousel">
        <button id="personalMemoryPreviewPrev" class="personal-memory-carousel-arrow" type="button" aria-label="Previous photo">‹</button>
        <div id="personalMemoryPreviewStage" class="personal-memory-carousel-stage"></div>
        <button id="personalMemoryPreviewNext" class="personal-memory-carousel-arrow" type="button" aria-label="Next photo">›</button>
      </div>
      <div id="personalMemoryPreviewCounter" class="personal-memory-carousel-counter"></div>
    </div>
  `;

  const stage = document.getElementById("personalMemoryPreviewStage");
  const counter = document.getElementById("personalMemoryPreviewCounter");
  const previous = document.getElementById("personalMemoryPreviewPrev");
  const next = document.getElementById("personalMemoryPreviewNext");

  const paint = () => {
    const entry = media[activeIndex];
    const path = entryPath(entry);
    const src = buildPublicUrl("/file", path);
    const ext = extension(path);
    const label = filename(path);

    stage.innerHTML = VIDEO_EXTENSIONS.has(ext)
      ? `<video controls autoplay preload="metadata" src="${escapeHtml(src)}"></video>`
      : `<img src="${escapeHtml(src)}" alt="${escapeHtml(label)}">`;

    counter.textContent = `${activeIndex + 1} of ${media.length} · ${label}`;
    previous.hidden = media.length <= 1;
    next.hidden = media.length <= 1;
  };

  previous.addEventListener("click", () => {
    activeIndex = (activeIndex - 1 + media.length) % media.length;
    paint();
  });

  next.addEventListener("click", () => {
    activeIndex = (activeIndex + 1) % media.length;
    paint();
  });

  paint();
  els.previewModal.classList.add("is-open");
  els.previewModal.setAttribute("aria-hidden", "false");
}

async function showPersonalMemoryEditor(workflow) {
  els.stepEditor.hidden = false;
  els.editorStepNumber.textContent = "5";
  els.editorStepLabel.textContent = "Select memories";
  els.formArea.innerHTML = `<div class="notice small">Loading memories…</div>`;
  setPublishStatus();

  try {
    const sharedEntries = await fetchFolder(
      "/Zohar Family/Memories",
      true,
      true
    );

    const manifestPath = joinDropboxPath(workflow.root, "albums.txt");
    const currentText = await fetchText(manifestPath, true).catch(() => "");
    const groups = parsePersonalMemoryGroups(currentText);

    const currentReferences = groups.flatMap(group =>
      group.references.map(reference => ({
        groupName: group.name,
        reference
      }))
    );

    const currentKeys = new Set(
      currentReferences.map(item => item.reference.toLowerCase())
    );

    const currentAlbumNames = Array.from(
      new Set(
        groups
          .map(group => String(group.name || "").trim())
          .filter(name => name && name.toLowerCase() !== "@loose")
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    const tree = buildSharedMemoryTree(sharedEntries);

    state.selectedData = {
      root: workflow.root,
      manifestPath,
      currentText,
      groups,
      sharedEntries
    };

    els.formArea.innerHTML = `
      <form class="editor-form personal-selector personal-memory-selector" data-kind="personalMemory">
        <div class="form-heading">
          <h2>${escapeHtml(state.person)}'s Memories</h2>
        </div>

        ${currentReferences.length ? `
          <details class="personal-memory-existing-details">
            <summary>
              <span>Currently shown — reorganize existing photos</span>
              <span class="personal-memory-existing-count">${currentReferences.length}</span>
            </summary>
            <div class="personal-memory-existing-body">
              <div class="small subtle">Change the album/folder name for any existing item. Leave it blank to show the item as a loose image.</div>
              <datalist id="personalMemoryExistingAlbums">
                ${currentAlbumNames.map(name => `<option value="${escapeHtml(name)}"></option>`).join("")}
              </datalist>
              <div class="current-memory-organizer">
                ${currentReferences.map(item => `
                  <div class="current-memory-row">
                    <div class="current-memory-main">
                      <strong>${escapeHtml(memoryReferenceName(item.reference))}</strong>
                      <small>${escapeHtml(item.reference)}</small>
                    </div>
                    <label class="field current-memory-folder-field">
                      <span>Album / folder</span>
                      <input
                        type="text"
                        list="personalMemoryExistingAlbums"
                        data-existing-memory-group-reference="${escapeHtml(item.reference)}"
                        value="${escapeHtml(item.groupName === "@loose" ? "" : item.groupName)}"
                        placeholder="Loose image"
                      >
                    </label>
                    <button
                      class="memory-preview-button"
                      type="button"
                      data-memory-preview="${escapeHtml(item.reference)}"
                    >Preview</button>
                    <label class="check-row remove-check current-memory-remove">
                      <input
                        type="checkbox"
                        data-remove-personal-memory="${escapeHtml(item.reference)}"
                      >
                      <span>Remove</span>
                    </label>
                  </div>
                `).join("")}
              </div>
            </div>
          </details>
        ` : ""}

        <div class="field">
          <span>Add memories</span>
          <input
            id="personalMemorySearch"
            type="search"
            placeholder="Search folders or photos"
          >
        </div>

        <div id="personalMemoryTree" class="memory-selector-tree">
          ${renderMemoryTreeNode(tree, currentKeys)}
        </div>

        <fieldset id="personalMemoryGroupingPanel" class="memory-grouping-panel" hidden>
          <legend>How should selected individual photos appear?</legend>
          <div class="small subtle">Selected whole albums stay as albums. These choices apply only to individual photos.</div>
          <div class="memory-grouping-options">
            <label class="check-row"><input type="radio" name="personalMemoryGrouping" value="loose" checked> <span>Loose images on the personal Memories page</span></label>
            <label class="check-row"><input type="radio" name="personalMemoryGrouping" value="one"> <span>Put all selected photos into one album</span></label>
            <label class="check-row"><input type="radio" name="personalMemoryGrouping" value="multiple"> <span>Organize selected photos into one or more albums</span></label>
          </div>
          <label id="personalMemoryOneAlbumField" class="field memory-grouping-one" hidden>
            <span>Album name</span>
            <input name="personalMemoryAlbumName" placeholder="Family favourites">
          </label>
          <div id="personalMemoryMultipleGroups" class="memory-multiple-groups" hidden></div>
        </fieldset>
      </form>
    `;

    const search = document.getElementById("personalMemorySearch");
    const treeElement = document.getElementById("personalMemoryTree");

    els.formArea.querySelectorAll("[data-memory-preview]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openPersonalMemoryPreview(
          button.dataset.memoryPreview,
          button.dataset.memoryPreviewStart || ""
        );
      });
    });

    const groupingPanel = document.getElementById("personalMemoryGroupingPanel");
    const oneAlbumField = document.getElementById("personalMemoryOneAlbumField");
    const multipleGroups = document.getElementById("personalMemoryMultipleGroups");

    const updateGroupingPanel = () => {
      const selectedFiles = Array.from(
        els.formArea.querySelectorAll('[data-add-personal-memory][data-memory-kind="file"]:checked')
      );

      groupingPanel.hidden = selectedFiles.length === 0;
      if (!selectedFiles.length) return;

      const mode = els.formArea.querySelector('input[name="personalMemoryGrouping"]:checked')?.value || "loose";
      oneAlbumField.hidden = mode !== "one";
      multipleGroups.hidden = mode !== "multiple";

      if (mode === "multiple") {
        const previousValues = new Map(
          Array.from(multipleGroups.querySelectorAll("[data-memory-group-reference]"))
            .map(input => [input.dataset.memoryGroupReference, input.value])
        );

        multipleGroups.innerHTML = selectedFiles.map(input => {
          const reference = cleanMemoryReference(input.dataset.addPersonalMemory);
          const defaultAlbum = memoryReferenceName(parentPath(reference)) || "";
          const currentValue = previousValues.get(reference) ?? defaultAlbum;

          return `
            <label class="field memory-group-assignment">
              <span>${escapeHtml(memoryReferenceName(reference))}</span>
              <input
                type="text"
                data-memory-group-reference="${escapeHtml(reference)}"
                value="${escapeHtml(currentValue)}"
                placeholder="Album name"
              >
            </label>
          `;
        }).join("");
      }
    };

    els.formArea.querySelectorAll("[data-add-personal-memory]").forEach(input => {
      input.addEventListener("change", updateGroupingPanel);
    });

    els.formArea.querySelectorAll('input[name="personalMemoryGrouping"]').forEach(input => {
      input.addEventListener("change", updateGroupingPanel);
    });

    updateGroupingPanel();

    search?.addEventListener("input", () => {
      const term = search.value.trim().toLowerCase();
      const branches = treeElement.querySelectorAll(".memory-tree-branch");
      const files = treeElement.querySelectorAll(".memory-tree-file");

      if (!term) {
        branches.forEach(branch => {
          branch.hidden = false;
        });
        files.forEach(file => {
          file.hidden = false;
        });
        return;
      }

      branches.forEach(branch => {
        const ownMatch =
          String(branch.dataset.memorySearch || "").includes(term);

        const descendantMatch =
          Array.from(
            branch.querySelectorAll("[data-memory-search]")
          ).some(child =>
            child !== branch &&
            String(child.dataset.memorySearch || "").includes(term)
          );

        branch.hidden = !(ownMatch || descendantMatch);
        if (ownMatch || descendantMatch) branch.open = true;
      });

      files.forEach(file => {
        file.hidden =
          !String(file.dataset.memorySearch || "").includes(term);
      });
    });

    updateDestinationPreview();
    els.stepEditor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    els.formArea.innerHTML =
      `<div class="notice bad small">${escapeHtml(error.message)}</div>`;
  }
}

/* ------------------------------ folder browser ------------------------------ */
function filteredEntriesForWorkflow(workflow, entries) {
  if (workflow?.kind !== "work" || !workflow.personal) return entries;

  return entries.filter(entry => {
    const relative = relativePath(workflow.root, entryPath(entry));
    const firstSegment = relative.split("/").filter(Boolean)[0]?.toLowerCase() || "";
    return !RESERVED_PERSON_FOLDERS.has(firstSegment);
  });
}

async function showFolderStep(workflow) {
  els.stepLocation.hidden = false;
  els.stepItem.hidden = true;
  els.stepEditor.hidden = true;
  els.locationStepNumber.textContent = state.contentType === "work" ? "5" : "3";

  if (state.mode === "add") {
    els.locationStepLabel.textContent =
      workflow.kind === "memory"
        ? "Where should this album go?"
        : "Where should this appear?";
  } else {
    els.locationStepLabel.textContent = "Choose a folder";
  }

  els.locationArea.innerHTML = `<div class="notice small">Loading folders…</div>`;
  try {
    const entries = await fetchFolder(workflow.root, true, true);
    state.entries = filteredEntriesForWorkflow(workflow, entries);
    state.currentFolder = workflow.root;
    renderFolderBrowser(workflow);
  } catch (error) {
    els.locationArea.innerHTML = `<div class="notice bad small">${escapeHtml(error.message)}</div>`;
  }
}

function childFolders(currentFolder) {
  return state.entries
    .filter(entry => String(entry.type).toLowerCase() === "folder" && isDirectChild(entry, currentFolder))
    .sort((a,b) => String(a.name).localeCompare(String(b.name), undefined, {numeric:true, sensitivity:"base"}));
}

function allFolders() {
  return state.entries.filter(entry => String(entry.type).toLowerCase() === "folder");
}

function humanFolderSegments(workflow, path) {
  const rel = relativePath(workflow.root, path);
  const relSegments = rel ? rel.split("/").filter(Boolean) : [];

  if (workflow.kind === "work" && workflow.personal && state.person) {
    return [state.person, "Works", ...relSegments];
  }

  if (workflow.kind === "memory") {
    return ["Memories", ...relSegments];
  }

  return [filename(workflow.root) || "Home", ...relSegments];
}

function humanFolderLabel(workflow, path) {
  return humanFolderSegments(workflow, path).join(" › ");
}

function destinationFolderPaths(workflow, movingPath = "") {
  if (!workflow) return [];

  const root = normalizePath(workflow.root);
  const movingKey = movingPath ? pathKey(movingPath) : "";
  const seen = new Set();

  return [root, ...allFolders().map(entryPath)]
    .map(normalizePath)
    .filter(path => {
      const key = pathKey(path);
      if (seen.has(key)) return false;
      seen.add(key);

      if (!movingKey) return true;
      if (key === movingKey) return false;
      if (key.startsWith(`${movingKey}/`)) return false;
      return true;
    })
    .sort((a, b) =>
      humanFolderLabel(workflow, a).localeCompare(
        humanFolderLabel(workflow, b),
        undefined,
        { numeric: true, sensitivity: "base" }
      )
    );
}

function renderDestinationFolderOptions(workflow, selectedPath, movingPath = "") {
  const selectedKey = pathKey(selectedPath || workflow?.root || "");
  return destinationFolderPaths(workflow, movingPath)
    .map(path => `
      <option value="${escapeHtml(path)}" ${pathKey(path) === selectedKey ? "selected" : ""}>
        ${escapeHtml(humanFolderLabel(workflow, path))}
      </option>
    `)
    .join("");
}

function renderBreadcrumbs(root, current, workflow) {
  const rel = relativePath(root, current);
  const relSegments = rel ? rel.split("/").filter(Boolean) : [];

  let html = "";
  let built = root;

  if (workflow.kind === "work" && workflow.personal && state.person) {
    html += `<button class="breadcrumb-btn" type="button" data-jump-folder="${escapeHtml(root)}">${escapeHtml(state.person)}</button>`;
    html += `<span class="breadcrumb-separator">›</span>`;
    html += `<button class="breadcrumb-btn breadcrumb-current-root" type="button" data-jump-folder="${escapeHtml(root)}">Works</button>`;
  } else {
    const rootLabel = workflow.kind === "memory" ? "Memories" : (filename(root) || "Home");
    html += `<button class="breadcrumb-btn" type="button" data-jump-folder="${escapeHtml(root)}">${escapeHtml(rootLabel)}</button>`;
  }

  relSegments.forEach(segment => {
    built = joinDropboxPath(built, segment);
    html += `<span class="breadcrumb-separator">›</span>`;
    html += `<button class="breadcrumb-btn" type="button" data-jump-folder="${escapeHtml(built)}">${escapeHtml(segment)}</button>`;
  });

  return html;
}

function renderFolderBrowser(workflow) {
  const current = state.currentFolder;
  const folders = childFolders(current);
  const workFiles =
    workflow.kind === "work" && state.mode === "edit"
      ? state.entries
          .filter(entry => isDirectChild(entry, current) && itemMatchesWorkflow(workflow, entry))
          .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: "base" }))
      : [];

  const navigateTo = nextFolder => {
    state.currentFolder = nextFolder;
    state.destinationFolder = null;
    state.selectedItem = null;
    state.selectedData = null;
    els.stepItem.hidden = true;
    els.stepEditor.hidden = true;
    renderFolderBrowser(workflow);
  };

  const canRenameCurrent =
    pathKey(current) !== pathKey(workflow.root);

  els.locationArea.innerHTML = `
    <div class="folder-browser simple-folder-browser">
      <div class="breadcrumbs">${renderBreadcrumbs(workflow.root, current, workflow)}</div>

      ${allFolders().length ? `
        <label class="field folder-search-field">
          <span>Find a folder</span>
          <input id="folderSearch" type="search" placeholder="Search folders">
        </label>
        <div id="folderSearchResults" class="search-results" hidden></div>
      ` : ""}

      <div class="folder-grid simple-folder-grid">
        ${folders.length
          ? folders.map(folder => `
              <button
                class="folder-card simple-folder-card"
                type="button"
                data-open-folder="${escapeHtml(entryPath(folder))}"
              >
                <span class="simple-folder-icon" aria-hidden="true">›</span>
                <strong>${escapeHtml(folder.name)}</strong>
              </button>
            `).join("")
          : `<div class="browser-empty simple-browser-empty">No folders here yet.</div>`}
      </div>

      ${workflow.kind === "work" && state.mode === "edit" ? `
        <div class="folder-file-section">
          <div class="folder-file-heading">Files in this folder</div>
          <div class="folder-file-list">
            ${workFiles.length
              ? workFiles.map(item => `
                  <button class="folder-file-card" type="button" data-folder-file-path="${escapeHtml(entryPath(item))}">
                    <strong>${escapeHtml(workFileDisplayName(entryPath(item)))}</strong>
                    ${workFileDisplayName(entryPath(item)) !== item.name ? `<small>${escapeHtml(item.name)}</small>` : ""}
                  </button>
                `).join("")
              : `<div class="browser-empty">No files in this folder.</div>`}
          </div>
        </div>
      ` : ""}

      <div class="simple-folder-actions">
        ${state.mode === "add" ? `
          <button id="useLocationButton" class="btn folder-primary-action" type="button">
            Add here
          </button>
          <button id="showNewFolderButton" class="btn folder-secondary-action" type="button">
            + New folder
          </button>
        ` : `
          ${workflow.kind === "work"
            ? `<button id="addContentHereButton" class="btn folder-primary-action" type="button">Add content here</button>`
            : `<button id="editFolderButton" class="btn folder-primary-action" type="button">Edit this album</button>`}

          ${workflow.kind === "work"
            ? `<button id="openFolderItemsButton" class="btn folder-secondary-action" type="button">Edit files</button>`
            : ""}

          ${canRenameCurrent
            ? `<button id="renameFolderButton" class="btn folder-secondary-action" type="button">Rename / move folder</button>`
            : ""}

          <button id="showNewFolderButton" class="btn folder-secondary-action" type="button">
            + New folder
          </button>
        `}

        <div id="newFolderPanel" class="new-folder-panel" hidden>
          <label class="field">
            <span>Folder name</span>
            <input id="newFolderNameInput" placeholder="New folder">
          </label>
          <div class="row row-left compact-row">
            <button id="createFolderButton" class="btn folder-primary-action" type="button">Create folder</button>
            <button id="cancelNewFolderButton" class="btn btn-quiet" type="button">Cancel</button>
          </div>
          <div id="folderActionStatus" class="status-line small"></div>
        </div>
      </div>
    </div>
  `;

  els.locationArea
    .querySelectorAll("[data-jump-folder]")
    .forEach(button =>
      button.addEventListener("click", () => navigateTo(button.dataset.jumpFolder))
    );

  els.locationArea
    .querySelectorAll("[data-open-folder]")
    .forEach(button =>
      button.addEventListener("click", () => navigateTo(button.dataset.openFolder))
    );

  els.locationArea
    .querySelectorAll("[data-folder-file-path]")
    .forEach(button =>
      button.addEventListener("click", async () => {
        state.selectedItem = state.entries.find(
          entry => pathKey(entryPath(entry)) === pathKey(button.dataset.folderFilePath)
        ) || null;
        await loadAndShowSelected(workflow);
      })
    );

  const search = document.getElementById("folderSearch");
  const results = document.getElementById("folderSearchResults");

  search?.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase();

    if (!term) {
      results.hidden = true;
      results.innerHTML = "";
      return;
    }

    const matches = allFolders()
      .filter(folder =>
        humanFolderLabel(workflow, entryPath(folder)).toLowerCase().includes(term)
      )
      .slice(0, 40);

    results.hidden = false;
    results.innerHTML = matches.length
      ? matches.map(folder => `
          <button
            class="search-result"
            type="button"
            data-search-folder="${escapeHtml(entryPath(folder))}"
          >
            ${escapeHtml(humanFolderLabel(workflow, entryPath(folder)))}
          </button>
        `).join("")
      : `<div class="browser-empty">No matching folders.</div>`;

    results
      .querySelectorAll("[data-search-folder]")
      .forEach(button =>
        button.addEventListener("click", () => navigateTo(button.dataset.searchFolder))
      );
  });

  document.getElementById("useLocationButton")?.addEventListener("click", async () => {
    state.destinationFolder = current;
    await showEditor(workflow.kind, null, workflow);
  });

  document.getElementById("addContentHereButton")?.addEventListener("click", async () => {
    state.destinationFolder = current;
    state.selectedItem = null;
    state.selectedData = null;
    await showEditor("work", null, workflow);
  });

  document.getElementById("editFolderButton")?.addEventListener("click", async () => {
    state.selectedItem = {
      type: "folder",
      name: filename(current),
      path: current,
      displayPath: current
    };
    await loadAndShowSelected(workflow);
  });

  document.getElementById("openFolderItemsButton")?.addEventListener("click", () => {
    showItemsForFolder(workflow, current);
  });

  document.getElementById("renameFolderButton")?.addEventListener("click", async () => {
    await showFolderRenameEditor(workflow, current);
  });

  const panel = document.getElementById("newFolderPanel");
  const newFolderInput = document.getElementById("newFolderNameInput");
  const folderStatus = document.getElementById("folderActionStatus");

  document.getElementById("showNewFolderButton")?.addEventListener("click", () => {
    panel.hidden = false;
    newFolderInput.focus();
  });

  document.getElementById("cancelNewFolderButton")?.addEventListener("click", () => {
    panel.hidden = true;
    newFolderInput.value = "";
    folderStatus.textContent = "";
  });

  document.getElementById("createFolderButton")?.addEventListener("click", async () => {
    const rawName = newFolderInput.value.trim();

    if (!rawName) {
      folderStatus.textContent = "Enter a folder name.";
      folderStatus.className = "status-line small error";
      return;
    }

    const folderName = safeSegment(rawName);
    const target = joinDropboxPath(current, folderName);

    try {
      folderStatus.textContent = "Creating folder…";
      folderStatus.className = "status-line small working";

      await ensureFolder(target);

      const entries = await fetchFolder(workflow.root, true, true);
      state.entries = filteredEntriesForWorkflow(workflow, entries);
      state.currentFolder = target;

      renderFolderBrowser(workflow);

    } catch (error) {
      folderStatus.textContent = `Could not create folder: ${error.message}`;
      folderStatus.className = "status-line small error";
    }
  });
}

function itemMatchesWorkflow(workflow, entry) {
  if (String(entry.type).toLowerCase() !== "file") return false;
  const name = String(entry.name || "").toLowerCase();
  if (workflow.kind === "recipe") return name.endsWith(".txt") && !["name.txt", "blurb.txt", "albums.txt", "trips.txt"].includes(name);
  if (workflow.kind === "work") return !name.startsWith(".") && !["name.txt"].includes(name);
  return true;
}

function showItemsForFolder(workflow, folder) {
  state.currentFolder = folder;
  const items = state.entries.filter(entry => isDirectChild(entry, folder) && itemMatchesWorkflow(workflow, entry)).sort((a,b) => String(a.name).localeCompare(String(b.name), undefined, {numeric:true}));
  els.stepItem.hidden = false;
  els.stepEditor.hidden = true;
  els.itemStepNumber.textContent = state.contentType === "work" ? "6" : "4";
  els.itemStepLabel.textContent = `Choose what to edit in ${filename(folder) || "this folder"}`;
  els.itemArea.innerHTML = `
    <div class="breadcrumbs">${renderBreadcrumbs(workflow.root, folder, workflow)}</div>
    <div class="item-grid" style="margin-top:14px">
      ${items.length ? items.map(item => `
        <div class="item-card-shell">
          <button class="item-card item-card-main" type="button" data-item-path="${escapeHtml(entryPath(item))}">
            <strong>${escapeHtml(workflow.kind === "work" ? workFileDisplayName(entryPath(item)) : item.name)}</strong>
            ${workflow.kind === "work" && workFileDisplayName(entryPath(item)) !== item.name ? `<small>${escapeHtml(item.name)}</small>` : ""}
          </button>
          ${workflow.kind === "work" ? `<button class="btn btn-quiet item-view-button" type="button" data-view-work-path="${escapeHtml(entryPath(item))}">View / Preview</button>` : ""}
        </div>
      `).join("") : `<div class="browser-empty">No editable items in this folder. Press Add Content to create.</div>`}
    </div>
  `;
  els.itemArea.querySelectorAll("[data-item-path]").forEach(button => button.addEventListener("click", async () => {
    state.selectedItem = state.entries.find(entry => pathKey(entryPath(entry)) === pathKey(button.dataset.itemPath));
    await loadAndShowSelected(workflow);
  }));
  els.itemArea.querySelectorAll("[data-view-work-path]").forEach(button => button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    await viewExistingWork(button.dataset.viewWorkPath);
  }));
  els.stepItem.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function showRecipeItemStep(workflow) {
  els.stepItem.hidden = false;
  els.stepEditor.hidden = true;
  els.itemStepNumber.textContent = state.contentType === "work" ? "5" : "3";
  els.itemStepLabel.textContent = "Choose a recipe to edit";
  els.itemArea.innerHTML = `<div class="notice small">Loading recipes…</div>`;

  try {
    const entries = await fetchFolder(workflow.root, true, true);
    const recipeFiles = entries.filter(entry => {
      if (String(entry.type).toLowerCase() !== "file") return false;
      const name = String(entry.name || "").toLowerCase();
      return name.endsWith(".txt") && !["name.txt", "blurb.txt", "albums.txt", "trips.txt", "links.txt"].includes(name);
    });

    const recipes = (
      await Promise.all(
        recipeFiles.map(async entry => {
          try {
            const text = await fetchText(entryPath(entry));
            const parsed = parseRecipe(text, entryPath(entry));
            return { entry, title: parsed.name || withoutExtension(entry.name), category: parsed.category || "" };
          } catch {
            return { entry, title: withoutExtension(entry.name), category: "" };
          }
        })
      )
    ).sort((a, b) => String(a.title).localeCompare(String(b.title), undefined, { numeric: true, sensitivity: "base" }));

    state.entries = entries;
    els.itemArea.innerHTML = `
      <label class="field"><span>Search recipes</span><input id="recipeItemSearch" type="search" placeholder="Search recipe names"></label>
      <div id="recipeItemList" class="item-grid" style="margin-top:14px"></div>
    `;

    const search = document.getElementById("recipeItemSearch");
    const list = document.getElementById("recipeItemList");

    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const visible = recipes.filter(recipe => `${recipe.title} ${recipe.category}`.toLowerCase().includes(term));
      list.innerHTML = visible.length
        ? visible.map(recipe => `
            <button class="item-card" type="button" data-recipe-path="${escapeHtml(entryPath(recipe.entry))}">
              <strong>${escapeHtml(recipe.title)}</strong>
              ${recipe.category ? `<small>${escapeHtml(recipe.category)}</small>` : ""}
            </button>
          `).join("")
        : `<div class="browser-empty">No matching recipes.</div>`;

      list.querySelectorAll("[data-recipe-path]").forEach(button => {
        button.addEventListener("click", async () => {
          state.selectedItem = recipes.find(recipe => pathKey(entryPath(recipe.entry)) === pathKey(button.dataset.recipePath))?.entry || null;
          await loadAndShowSelected(workflow);
        });
      });
    };

    search.addEventListener("input", paint);
    paint();
  } catch (error) {
    els.itemArea.innerHTML = `<div class="notice bad small">${escapeHtml(error.message)}</div>`;
  }
}

/* ------------------------------ direct lists ------------------------------ */
async function showDirectItemStep(workflow) {
  els.stepItem.hidden = false;
  els.stepEditor.hidden = true;
  els.itemStepNumber.textContent = state.contentType === "work" ? "5" : "3";
  els.itemStepLabel.textContent = workflow.kind === "travel" ? "Choose a trip" : "Choose an item";
  els.itemArea.innerHTML = `<div class="notice small">Loading…</div>`;

  try {
    const entries = await fetchFolder(workflow.root, false, true);
    const folders = entries.filter(entry => String(entry.type).toLowerCase() === "folder");

    const items = (
      await Promise.all(
        folders.map(async folder => {
          const root = entryPath(folder);

          if (workflow.kind === "travel") {
            try {
              const trip = parseTrip(await fetchText(joinDropboxPath(root, "trip.txt")));
              return { entry: folder, title: trip.title || folder.name, secondary: trip.year || "" };
            } catch {
              return { entry: folder, title: folder.name, secondary: "" };
            }
          }

          if (workflow.kind === "merch") {
            try {
              const metadata = parseKeyValueText(await fetchText(joinDropboxPath(root, "merch.txt")));
              return { entry: folder, title: metadata.name || folder.name, secondary: "" };
            } catch {
              return { entry: folder, title: folder.name, secondary: "" };
            }
          }

          return { entry: folder, title: folder.name, secondary: "" };
        })
      )
    ).sort((a, b) => String(a.title).localeCompare(String(b.title), undefined, { numeric: true, sensitivity: "base" }));

    state.entries = entries;
    els.itemArea.innerHTML = `
      <label class="field"><span>Search</span><input id="directItemSearch" type="search" placeholder="Search ${workflow.kind === "travel" ? "trips" : "items"}"></label>
      <div id="directItemList" class="item-grid" style="margin-top:14px"></div>
    `;

    const search = document.getElementById("directItemSearch");
    const list = document.getElementById("directItemList");

    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const visible = items.filter(item => `${item.title} ${item.secondary}`.toLowerCase().includes(term));
      list.innerHTML = visible.length
        ? visible.map(item => `
            <button class="item-card" type="button" data-direct-path="${escapeHtml(entryPath(item.entry))}">
              <strong>${escapeHtml(item.title)}</strong>
              ${item.secondary ? `<small>${escapeHtml(item.secondary)}</small>` : ""}
            </button>
          `).join("")
        : `<div class="browser-empty">Nothing found.</div>`;

      list.querySelectorAll("[data-direct-path]").forEach(button => button.addEventListener("click", async () => {
        state.selectedItem = items.find(item => pathKey(entryPath(item.entry)) === pathKey(button.dataset.directPath))?.entry || null;
        await loadAndShowSelected(workflow);
      }));
    };

    search.addEventListener("input", paint);
    paint();
  } catch (error) {
    els.itemArea.innerHTML = `<div class="notice bad small">${escapeHtml(error.message)}</div>`;
  }
}

async function loadAndShowSelected(workflow) {
  const item = state.selectedItem;
  if (!item) return;
  setPublishStatus("Loading existing content…", "working");
  try {
    if (workflow.kind === "recipe") {
      const text = await fetchText(entryPath(item));
      state.selectedData = parseRecipe(text, entryPath(item));
    } else if (workflow.kind === "travel") {
      const root = entryPath(item);
      const folderEntries = await fetchFolder(root, true, true);
      const tripPath = joinDropboxPath(root, "trip.txt");
      const text = await fetchText(tripPath);
      state.selectedData = { ...parseTrip(text), root, tripPath, entries: folderEntries };
    } else if (workflow.kind === "merch") {
      const root = entryPath(item);
      const folderEntries = await fetchFolder(root, true, true);
      const metadataEntry = folderEntries.find(entry => String(entry.type).toLowerCase() === "file" && String(entry.name).toLowerCase() === "merch.txt");
      const text = metadataEntry ? await fetchText(entryPath(metadataEntry)) : "";
      const metadata = parseKeyValueText(text);
      state.selectedData = { root, metadataPath: metadataEntry ? entryPath(metadataEntry) : joinDropboxPath(root, "merch.txt"), metadata, entries: folderEntries };
    } else if (workflow.kind === "memory") {
      const root = entryPath(item);
      const folderEntries = await fetchFolder(root, false, true);
      state.selectedData = { root, entries: folderEntries };
    } else if (workflow.kind === "work") {
      const path = entryPath(item);
      let text = "";
      let links = [];
      if (extension(path) === "txt") {
        text = await fetchText(path).catch(() => "");
        links = parseLinkText(text);
      }
      state.selectedData = { path, text, links };
    }
    await showEditor(workflow.kind, state.selectedData, workflow);
  } catch (error) {
    setPublishStatus(`Could not load selection: ${error.message}`, "error");
  }
}

/* ------------------------------ editor forms ------------------------------ */
function currentForm() { return els.formArea.querySelector("form"); }
function value(name) { return currentForm()?.elements?.[name]?.value?.trim?.() || ""; }
function files(name) { return Array.from(currentForm()?.elements?.[name]?.files || []); }
function checked(name) { return Boolean(currentForm()?.elements?.[name]?.checked); }

function assetRows(paths, label = "Existing files", removeMode = "delete") {
  if (!paths.length) return "";
  return `
    <div class="existing-assets">
      <strong>${escapeHtml(label)}</strong>
      ${paths.map(path => `
        <div class="asset-row">
          <div class="asset-main"><strong>${escapeHtml(filename(path))}</strong><small>${escapeHtml(path)}</small></div>
          <label class="check-row remove-check"><input type="checkbox" data-remove-path="${escapeHtml(path)}" data-remove-mode="${escapeHtml(removeMode)}"> Remove</label>
        </div>
      `).join("")}
      
    </div>
  `;
}

function memoryAssetRows(entries) {
  if (!entries.length) return "";

  return `
    <div class="existing-assets memory-existing-assets">
      <strong>Existing files in this folder</strong>
      ${entries.map(entry => {
        const path = entryPath(entry);
        const isText = extension(path) === "txt";
        const displayName = workFileDisplayName(path);

        return `
          <div class="asset-row memory-asset-row">
            <div class="asset-main">
              <strong>${escapeHtml(displayName)}</strong>
              <small>${escapeHtml(path)}</small>
            </div>
            <div class="memory-asset-actions">
              ${isText ? `
                <button
                  class="btn btn-quiet memory-text-edit-button"
                  type="button"
                  data-edit-memory-text="${escapeHtml(path)}"
                >Edit</button>
              ` : ""}
              <label class="check-row remove-check">
                <input type="checkbox" data-remove-path="${escapeHtml(path)}" data-remove-mode="delete">
                Remove
              </label>
            </div>
            ${isText ? `
              <div class="memory-text-editor" hidden>
                <label class="field">
                  <span>${escapeHtml(displayName)}</span>
                  <textarea
                    rows="8"
                    data-memory-text-path="${escapeHtml(path)}"
                    data-memory-text-loaded="false"
                    data-memory-text-active="false"
                  ></textarea>
                  <small>Saving this page will update this text file.</small>
                </label>
              </div>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function selectedRemovePaths(mode = null) {
  return Array.from(els.formArea.querySelectorAll("[data-remove-path]:checked"))
    .filter(input => !mode || input.dataset.removeMode === mode)
    .map(input => input.dataset.removePath);
}

async function showEditor(kind, data, workflow) {
  state.mapCleanup?.(); state.mapCleanup = null;
  state.currentEditorKind = kind;
  els.stepEditor.hidden = false;
  els.editorStepLabel.textContent = "Edit details";
  if (state.contentType === "work") {
    if (kind === "personalTravel") {
      els.editorStepNumber.textContent = "5";
    } else if (workflow.hierarchy) {
      els.editorStepNumber.textContent = state.mode === "edit" && data ? "7" : "6";
    } else {
      els.editorStepNumber.textContent = state.mode === "edit" ? "6" : "5";
    }
  } else if (workflow.hierarchy) {
    els.editorStepNumber.textContent = "4";
  } else {
    els.editorStepNumber.textContent = state.mode === "edit" ? "4" : "3";
  }

  if (kind === "recipe") renderRecipeForm(data);
  else if (kind === "travel") renderTravelForm(data);
  else if (kind === "memory") renderMemoryForm(data, workflow);
  else if (kind === "merch") await renderMerchForm(data, workflow);
  else if (kind === "work") renderWorkForm(data, workflow);
  else if (kind === "folder") renderFolderRenameForm(data);

  const form = currentForm();
  form?.addEventListener("input", updateDestinationPreview);
  form?.addEventListener("change", updateDestinationPreview);
  updateDestinationPreview();
  setPublishStatus();
  els.stepEditor.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function showFolderRenameEditor(workflow, folderPath) {
  state.selectedItem = { type: "folder", name: filename(folderPath), path: folderPath, displayPath: folderPath };
  state.selectedData = { path: folderPath, root: folderPath };
  await showEditor("folder", state.selectedData, workflow);
}

function renderFolderRenameForm(data) {
  const workflow = currentWorkflow();
  const currentParent = parentPath(data.path);
  const canMove =
    workflow &&
    ["work", "memory"].includes(workflow.kind) &&
    pathKey(data.path) !== pathKey(workflow.root);

  els.formArea.innerHTML = `
    <form class="editor-form" data-kind="folder">
      <div class="form-heading">
        <h2>Rename or move folder</h2>
      </div>
      <div class="folder-being-edited">${escapeHtml(humanFolderLabel(workflow, data.path))}</div>
      <label class="field">
        <span>Folder name *</span>
        <input name="folderName" required value="${escapeHtml(filename(data.path))}">
      </label>
      ${canMove ? `
        <label class="field">
          <span>Parent folder</span>
          <select name="parentFolder">
            ${renderDestinationFolderOptions(workflow, currentParent, data.path)}
          </select>
          <small>Choose a different parent folder to reorganize this folder. A folder cannot be moved inside itself.</small>
        </label>
      ` : ""}
    </form>
  `;
}

function renderRecipeForm(data) {
  const edit = Boolean(data);
  els.formArea.innerHTML = `
    <form class="editor-form" data-kind="recipe">
      <div class="form-heading"><h2>${edit ? "Edit recipe" : "Add recipe"}</h2></div>
      <div class="form-grid two-column">
        <label class="field"><span>Recipe name *</span><input name="name" required value="${escapeHtml(data?.name || "")}"></label>
        <label class="field"><span>Category *</span><input name="category" required value="${escapeHtml(data?.category || "")}"></label>
      </div>
      <label class="field"><span>Ingredients *</span><textarea name="ingredients" required rows="8">${escapeHtml(data?.ingredients || "")}</textarea></label>
      <label class="field"><span>Procedure *</span><textarea name="preparation" required rows="8">${escapeHtml(data?.preparation || "")}</textarea></label>
      <label class="field"><span>Safta's Secrets</span><textarea name="secrets" rows="5">${escapeHtml(data?.secrets || "")}</textarea></label>
      ${assetRows(data?.images || [], "Photos currently used by this recipe", "reference")}
      <label class="field"><span>Add photos</span><input name="images" type="file" accept="image/*" multiple><small>Uploads are added.</small></label>
    </form>
  `;
}

function renderTravelForm(data) {
  const edit = Boolean(data);
  const linksText = (data?.links || []).map(link => `${link.label} | ${link.url}`).join("\n");
  const existing = (data?.entries || []).filter(entry => String(entry.type).toLowerCase() === "file" && String(entry.name).toLowerCase() !== "trip.txt").map(entryPath);
  els.formArea.innerHTML = `
    <form class="editor-form" data-kind="travel">
      <div class="form-heading"><h2>${edit ? "Edit trip" : "Add trip"}</h2></div>
      ${edit ? `
        <div class="notice">
          <label class="check-row">
            <input name="renameTravelFolder" type="checkbox">
            <span>Rename this trip folder</span>
          </label>
          <label class="field" style="margin-top:10px">
            <span>Folder name</span>
            <input name="folderName" value="${escapeHtml(filename(data.root))}">
          </label>
        </div>
      ` : ""}
      <div class="form-grid two-column">
        <label class="field"><span>Trip title *</span><input name="title" required value="${escapeHtml(data?.title || "")}"></label>
        <label class="field"><span>Year</span><input name="year" value="${escapeHtml(data?.year || "")}"></label>
      </div>
      <label class="field"><span>Travelers</span><input name="travelers" value="${escapeHtml(data?.travelers || "")}"></label>
      <label class="field"><span>Filter Name</span><input name="filterName" value="${escapeHtml(data?.filterName || "")}" placeholder="Family"><small>This is the label used in the Travel filter.</small></label>
      <label class="field"><span>Short description (optional)</span><textarea name="blurb" rows="4">${escapeHtml(data?.blurb || "")}</textarea></label>
      <fieldset class="map-panel">
        <div class="map-top-row"><div><legend>Map location *</legend><div class="small subtle">Click to place the pin. Zoom and pan, then drag the pin for precision.</div></div><div class="row compact-row"><button id="mapZoomOut" class="btn btn-icon" type="button">−</button><span id="mapZoomLabel" class="pill">100%</span><button id="mapZoomIn" class="btn btn-icon" type="button">+</button><button id="mapZoomReset" class="btn btn-quiet" type="button">Reset</button></div></div>
        <div id="adminTravelMapViewport" class="map-viewport"><div id="adminTravelMapStage" class="map-stage"><img id="adminTravelMap" src="assets/travel/world.svg" alt="World map" draggable="false"><button id="adminTravelPin" class="map-pin" type="button" aria-label="Selected location" hidden></button></div></div>
        <input name="x" type="hidden" required value="${escapeHtml(data?.x || "")}"><input name="y" type="hidden" required value="${escapeHtml(data?.y || "")}">
        <div class="map-bottom-row"><span id="coordinateReadout" class="small subtle">No location selected</span><button id="clearMapPin" class="btn btn-quiet" type="button">Clear pin</button></div>
      </fieldset>
      ${assetRows(existing, "Existing trip files", "delete")}
      <label class="field"><span>Add photos or videos</span><input name="images" type="file" accept="image/*,video/*" multiple></label>
      <label class="field"><span>Add documents</span><input name="documents" type="file" multiple></label>
      <label class="field"><span>External links</span><textarea name="links" rows="5" placeholder="Photo album | https://example.com">${escapeHtml(linksText)}</textarea></label>
    </form>
  `;
  setupTravelMap(data?.x, data?.y);
}

function setupMemoryCoverChooser({ enabled }) {
  const form = currentForm();
  const mediaInput = document.getElementById("memoryMediaInput");
  const prompt = document.getElementById("memoryCoverPrompt");
  const choices = document.getElementById("memoryCoverChoices");
  const toggle = form?.elements?.setMemoryCover;

  if (!enabled || !mediaInput || !prompt || !choices || !toggle) {
    if (prompt) prompt.hidden = true;
    return;
  }

  const redraw = () => {
    const imageFiles = Array.from(mediaInput.files || []).filter(file =>
      String(file.type || "").startsWith("image/") ||
      IMAGE_EXTENSIONS.has(extension(file.name))
    );

    const alreadyNamedCover = imageFiles.some(file =>
      withoutExtension(file.name).toLowerCase() === "cover"
    );

    prompt.hidden = imageFiles.length === 0 || alreadyNamedCover;

    if (prompt.hidden) {
      toggle.checked = false;
      choices.hidden = true;
      choices.innerHTML = "";
      return;
    }

    choices.innerHTML = imageFiles.map((file, index) => {
      const objectUrl = URL.createObjectURL(file);
      return `
        <label class="memory-cover-choice">
          <input
            type="radio"
            name="memoryCoverFile"
            value="${escapeHtml(file.name)}"
            ${index === 0 ? "checked" : ""}
          >
          <img src="${escapeHtml(objectUrl)}" alt="${escapeHtml(file.name)}">
          <span>${escapeHtml(file.name)}</span>
        </label>
      `;
    }).join("");

    choices.hidden = !toggle.checked;
  };

  mediaInput.addEventListener("change", redraw);
  toggle.addEventListener("change", () => {
    choices.hidden = !toggle.checked;
  });

  redraw();
}

function renderMemoryForm(data, workflow) {
  const edit = Boolean(data);
  const existingEntries = (data?.entries || []).filter(
    entry => String(entry.type).toLowerCase() === "file"
  );
  const existing = existingEntries.map(entryPath);
  const destinationRoot =
    data?.root ||
    state.destinationFolder ||
    state.currentFolder ||
    "";

  const knownDestinationFiles = (state.entries || [])
    .filter(entry =>
      String(entry.type).toLowerCase() === "file" &&
      destinationRoot &&
      isDirectChild(entry, destinationRoot)
    )
    .map(entryPath);

  const hasExistingCover = [...existing, ...knownDestinationFiles].some(path =>
    withoutExtension(filename(path)).toLowerCase() === "cover"
  );

  const canReorganizeFolder =
    edit &&
    workflow &&
    pathKey(data.root) !== pathKey(workflow.root);

  els.formArea.innerHTML = `
    <form class="editor-form" data-kind="memory">
      <div class="form-heading"><h2>${edit ? `Edit ${escapeHtml(filename(data.root))}` : "Add memories"}</h2></div>
      ${canReorganizeFolder ? `
        <div class="form-grid two-column">
          <label class="field">
            <span>Folder / album name</span>
            <input name="folderName" value="${escapeHtml(filename(data.root))}">
          </label>
          <label class="field">
            <span>Parent folder</span>
            <select name="memoryParentFolder">
              ${renderDestinationFolderOptions(workflow, parentPath(data.root), data.root)}
            </select>
          </label>
        </div>
        <div class="small subtle">Change the parent folder to reorganize this Memories album.</div>
      ` : ""}
      ${memoryAssetRows(existingEntries)}
      <label class="field"><span>Add photos, videos, PDFs, or other files</span><input id="memoryMediaInput" name="media" type="file" multiple></label>
      <div id="memoryCoverPrompt" class="memory-cover-prompt" hidden>
        <div>
          <strong>This album has no file named “cover”.</strong>
          <div class="small subtle">Would you like to use one of these photos as the album cover?</div>
        </div>
        <label class="check-row memory-cover-toggle">
          <input name="setMemoryCover" type="checkbox">
          <span>Yes, set a cover image</span>
        </label>
        <div id="memoryCoverChoices" class="memory-cover-choices" hidden></div>
      </div>
      <label class="field"><span>Add website links</span><textarea name="linksToAdd" rows="5" placeholder="Family video | https://example.com\nPhoto archive | https://example.com"></textarea></label>
    </form>
  `;

  els.formArea.querySelectorAll("[data-edit-memory-text]").forEach(button => {
    button.addEventListener("click", async () => {
      const row = button.closest(".memory-asset-row");
      const editor = row?.querySelector(".memory-text-editor");
      const textarea = row?.querySelector("[data-memory-text-path]");
      if (!editor || !textarea) return;

      if (!editor.hidden) {
        editor.hidden = true;
        button.textContent = "Edit";
        return;
      }

      if (textarea.dataset.memoryTextLoaded !== "true") {
        button.disabled = true;
        button.textContent = "Loading…";
        try {
          textarea.value = await fetchText(button.dataset.editMemoryText, true);
          textarea.dataset.memoryTextLoaded = "true";
        } catch (error) {
          setPublishStatus(`Could not load ${filename(button.dataset.editMemoryText)}: ${error.message}`, "error");
          button.disabled = false;
          button.textContent = "Edit";
          return;
        }
        button.disabled = false;
      }

      textarea.dataset.memoryTextActive = "true";
      editor.hidden = false;
      button.textContent = "Hide editor";
      textarea.focus();
    });
  });

  setupMemoryCoverChooser({
    enabled: !edit && !hasExistingCover
  });
}

function merchImagePaths(data) {
  if (!data) return [];
  const raw = String(data.metadata?.images || "").trim();
  if (raw) {
    return raw.split(",").map(part => {
      const clean = part.trim();
      return clean.startsWith("/") ? normalizePath(clean) : joinDropboxPath(data.root, clean);
    }).filter(Boolean);
  }
  return data.entries
    .filter(entry => String(entry.type).toLowerCase() === "file" && IMAGE_EXTENSIONS.has(extension(entryPath(entry))))
    .map(entryPath);
}

async function renderMerchForm(data, workflow) {
  const edit = Boolean(data);
  const metadata = data?.metadata || {};
  const images = merchImagePaths(data);
  let customName = "";
  if (workflow.collection) customName = (await fetchText(joinDropboxPath(workflow.root, "name.txt"), true)).trim();
  els.formArea.innerHTML = `
    <form class="editor-form" data-kind="merch">
      <div class="form-heading"><h2>${edit ? "Edit item" : workflow.collection ? "Add collection item" : "Add merch item"}</h2></div>
      ${edit ? `<label class="field"><span>Folder name</span><input name="folderName" value="${escapeHtml(filename(data.root))}"></label>` : ""}
      ${workflow.collection ? `<label class="field"><span>Collection tab name *</span><input name="collectionName" required value="${escapeHtml(customName || "Collection")}"><small>This controls the person's tab label.</small></label>` : ""}
      <label class="field"><span>Item name *</span><input name="name" required value="${escapeHtml(metadata.name || (data ? filename(data.root) : ""))}"></label>
      <label class="field"><span>Description</span><textarea name="description" rows="5">${escapeHtml(metadata.description || "")}</textarea></label>
      <div class="form-grid three-column">
        <label class="field"><span>Created</span><input name="created" value="${escapeHtml(metadata.created || "")}"></label>
        <label class="field"><span>Created by</span><input name="createdBy" value="${escapeHtml(metadata.createdby || metadata.creator || "")}"></label>
        <label class="field"><span>Currently with</span><input name="owner" value="${escapeHtml(metadata.owner || "")}"></label>
      </div>
      ${assetRows(images, "Existing item photos", "delete")}
      <label class="field"><span>Add item photos</span><input name="images" type="file" accept="image/*" multiple></label>
    </form>
  `;
}

function renderWorkForm(data, workflow) {
  const edit = Boolean(data);
  const isLink = Boolean(data?.links?.length === 1 && data.links[0].url);
  els.formArea.innerHTML = `
    <form class="editor-form" data-kind="work">
      <div class="form-heading"><h2>${edit ? `Edit ${escapeHtml(workFileDisplayName(data.path))}` : "Add to Works"}</h2></div>
      ${edit ? `<div class="notice small selected-work-notice"><div><b>Selected:</b> ${escapeHtml(workFileDisplayName(data.path))}</div><button id="viewSelectedWorkButton" class="btn btn-quiet" type="button">View / Preview selected file</button></div>` : ""}
      <label class="field"><span>Add files</span><input name="workFiles" type="file" multiple></label>
      <div class="hr"></div>
      <div class="form-grid two-column">
        <label class="field"><span>Add website title</span><input name="linkTitle" placeholder="My Substack"></label>
        <label class="field"><span>Add website URL</span><input name="linkUrl" type="url" placeholder="https://..."></label>
      </div>
      ${edit && extension(data.path) === "txt" ? `
        <div class="notice">
          <label class="check-row"><input name="updateTextFile" type="checkbox"><span><b>Explicitly update this text/link file</b></span></label>
          <label class="field" style="margin-top:10px"><span>Text contents</span><textarea name="textContents" rows="6">${escapeHtml(data.text || "")}</textarea><small>This existing file is overwritten only when the checkbox above is checked.</small></label>
        </div>
      ` : ""}
      ${edit ? `
        <div class="notice file-reorganize-panel">
          <strong>Reorganize this file</strong>
          <div class="form-grid two-column" style="margin-top:10px">
            <label class="field">
              <span>Folder</span>
              <select name="workParentFolder">
                ${renderDestinationFolderOptions(workflow, parentPath(data.path))}
              </select>
            </label>
            <label class="field">
              <span>Filename</span>
              <input name="newFilename" value="${escapeHtml(filename(data.path))}">
            </label>
          </div>
          <small>Changing either field moves/renames the file when you save.</small>
        </div>
        <div class="notice">
          <label class="check-row remove-check"><input name="deleteSelected" type="checkbox"><span>Remove the selected file from Dropbox</span></label>
          <small class="warn">This will permanently delete the selected file.</small>
        </div>
      ` : ""}
    </form>
  `;

  if (edit) {
    document.getElementById("viewSelectedWorkButton")?.addEventListener("click", () => viewExistingWork(data.path));
  }
}

/* ------------------------------ map ------------------------------ */
function setupTravelMap(initialX, initialY) {
  const viewport = document.getElementById("adminTravelMapViewport");
  const stage = document.getElementById("adminTravelMapStage");
  const map = document.getElementById("adminTravelMap");
  const pin = document.getElementById("adminTravelPin");
  const label = document.getElementById("mapZoomLabel");
  const readout = document.getElementById("coordinateReadout");
  const form = currentForm();
  let zoom = 1;
  let dragging = false;

  function applyZoom() {
    stage.style.width = `${zoom * 100}%`;
    label.textContent = `${Math.round(zoom * 100)}%`;
  }
  function setCoordinates(x, y) {
    const xx = Math.max(0, Math.min(100, Number(x)));
    const yy = Math.max(0, Math.min(100, Number(y)));
    if (!Number.isFinite(xx) || !Number.isFinite(yy)) return;
    const rx = Number(xx.toFixed(1)); const ry = Number(yy.toFixed(1));
    form.elements.x.value = rx; form.elements.y.value = ry;
    pin.style.left = `${rx}%`; pin.style.top = `${ry}%`; pin.hidden = false;
    readout.textContent = `Location selected (${rx}%, ${ry}%)`;
  }
  function fromPointer(event) {
    const rect = map.getBoundingClientRect();
    setCoordinates(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
  }
  function stageDown(event) { if (event.target !== pin) fromPointer(event); }
  function pinDown(event) { dragging = true; pin.setPointerCapture?.(event.pointerId); event.preventDefault(); event.stopPropagation(); }
  function pinMove(event) { if (dragging) fromPointer(event); }
  function pinUp(event) { dragging = false; pin.releasePointerCapture?.(event.pointerId); }
  function zoomBy(delta) { zoom = Math.max(.75, Math.min(5, zoom + delta)); applyZoom(); }

  stage.addEventListener("pointerdown", stageDown);
  pin.addEventListener("pointerdown", pinDown);
  pin.addEventListener("pointermove", pinMove);
  pin.addEventListener("pointerup", pinUp);
  pin.addEventListener("pointercancel", pinUp);
  document.getElementById("mapZoomIn").addEventListener("click", () => zoomBy(.25));
  document.getElementById("mapZoomOut").addEventListener("click", () => zoomBy(-.25));
  document.getElementById("mapZoomReset").addEventListener("click", () => { zoom = 1; applyZoom(); viewport.scrollTo({left:0, top:0}); });
  document.getElementById("clearMapPin").addEventListener("click", () => { form.elements.x.value = ""; form.elements.y.value = ""; pin.hidden = true; readout.textContent = "No location selected"; });
  applyZoom();
  if (initialX !== "" && initialY !== "" && initialX != null && initialY != null) setCoordinates(initialX, initialY);
  state.mapCleanup = () => {
    stage.removeEventListener("pointerdown", stageDown);
    pin.removeEventListener("pointerdown", pinDown);
    pin.removeEventListener("pointermove", pinMove);
    pin.removeEventListener("pointerup", pinUp);
    pin.removeEventListener("pointercancel", pinUp);
  };
}

/* ------------------------------ destination / preview ------------------------------ */
function updateDestinationPreview() {
  const kind = state.currentEditorKind;
  let destination = state.selectedItem ? entryPath(state.selectedItem) : state.destinationFolder || state.rootPath || "";
  if (kind === "recipe" && state.mode === "add" && currentForm()) destination = joinDropboxPath(state.destinationFolder, `${safeSegment(value("name") || "New Recipe")}.txt`);
  if (kind === "travel" && state.mode === "add" && currentForm()) destination = joinDropboxPath(state.rootPath, safeSegment([value("title") || "New Trip", value("year")].filter(Boolean).join(" ")));
  if (kind === "merch" && state.mode === "add" && currentForm()) destination = joinDropboxPath(state.rootPath, safeSegment(value("name") || "New Item"));
  if (kind === "work" && state.mode === "add") destination = state.destinationFolder;
  if (kind === "work" && state.mode === "edit" && state.selectedData?.path && currentForm()) {
    destination = joinDropboxPath(
      value("workParentFolder") || parentPath(state.selectedData.path),
      safeSegment(value("newFilename"), filename(state.selectedData.path))
    );
  }
  if (kind === "memory" && state.mode === "edit" && state.selectedData?.root && currentForm() && value("folderName")) {
    destination = joinDropboxPath(
      value("memoryParentFolder") || parentPath(state.selectedData.root),
      safeSegment(value("folderName"), filename(state.selectedData.root))
    );
  }
  if (kind === "folder" && state.selectedData?.path && currentForm()) destination = joinDropboxPath(value("parentFolder") || parentPath(state.selectedData.path), safeSegment(value("folderName"), filename(state.selectedData.path)));
  if (kind === "personalTravel") destination = joinDropboxPath(state.rootPath, "trips.txt");
  if (kind === "personalMemory") destination = joinDropboxPath(state.rootPath, "albums.txt");
  els.destinationPreview.textContent = destination || "";
}

function openPreview() {
  const form = currentForm();
  if (!form) return;
  const kind = form.dataset.kind;
  let title = "Preview";
  let body = "";
  if (kind === "recipe") { title = value("name") || "Recipe"; body = `${value("category")}\n\nIngredients\n${value("ingredients")}\n\nProcedure\n${value("preparation")}`; }
  else if (kind === "travel") { title = value("title") || "Trip"; body = `${value("year")}\n${value("travelers")}\n${value("blurb")}`; }
  else if (kind === "merch") { title = value("name") || "Item"; body = value("description"); }
  else if (kind === "memory") { title = filename(state.destinationFolder || state.selectedData?.root || state.currentFolder); body = "New files and links will be added to this memory folder."; }
  else if (kind === "work") { title = state.selectedData ? filename(state.selectedData.path) : "Works"; body = "Files and links selected here will be added to the chosen Works folder."; }
  else if (kind === "folder") { title = `Rename ${filename(state.selectedData?.path || "folder")}`; body = `New folder name: ${value("folderName")}`; }
  else if (kind === "personalTravel") {
    title = `${state.person}'s Travel`;
    const additions = Array.from(els.formArea.querySelectorAll("[data-add-personal-trip]:checked")).map(input => input.dataset.addPersonalTrip);
    const removals = Array.from(els.formArea.querySelectorAll("[data-remove-personal-trip]:checked")).map(input => input.dataset.removePersonalTrip);
    body = `${additions.length ? `Add: ${additions.join(", ")}` : "No trips added."}${removals.length ? `\nRemove: ${removals.join(", ")}` : ""}`;
  }
  else if (kind === "personalMemory") {
    title = `${state.person}'s Memories`;
    const additions = Array.from(els.formArea.querySelectorAll("[data-add-personal-memory]:checked")).map(input => input.dataset.addPersonalMemory);
    const removals = Array.from(els.formArea.querySelectorAll("[data-remove-personal-memory]:checked")).map(input => input.dataset.removePersonalMemory);
    body = `${additions.length ? `Add: ${additions.join(", ")}` : "No memories added."}${removals.length ? `\nRemove: ${removals.join(", ")}` : ""}`;
  }
  els.previewContent.innerHTML = `<div class="preview-layout"><h2 class="preview-title">${escapeHtml(title)}</h2><div class="preview-copy">${escapeHtml(body)}</div><div class="notice small"><b>Destination:</b><br><code>${escapeHtml(els.destinationPreview.textContent)}</code></div></div>`;
  els.previewModal.classList.add("is-open");
  els.previewModal.setAttribute("aria-hidden", "false");
}

function closePreview() { els.previewModal.classList.remove("is-open"); els.previewModal.setAttribute("aria-hidden", "true"); }

/* ------------------------------ publishing ------------------------------ */
function confirmExplicitRemovals() {
  const count = els.formArea.querySelectorAll("[data-remove-path]:checked, [data-remove-trip]:checked, [data-remove-personal-trip]:checked, [data-remove-personal-memory]:checked, input[name='deleteSelected']:checked").length;
  return count === 0 || window.confirm(`${count} item${count === 1 ? " is" : "s are"} explicitly marked for removal. Continue?`);
}

function requireForm() {
  const form = currentForm();
  if (form && !form.reportValidity()) return false;
  if (state.currentEditorKind === "work" && !state.selectedData && files("workFiles").length === 0 && !value("linkUrl")) {
    setPublishStatus("Choose at least one file or enter a website URL.", "error");
    return false;
  }
  if (!confirmExplicitRemovals()) return false;
  return true;
}

function recipeTextFromForm(imagePaths, existingOrder = "") {
  const lines = [
    `name: ${value("name")}`,
    `id: ${slugify(value("name"))}`,
    `category: ${value("category")}`,
    `showInPile: ${checked("showInPile") ? "true" : "false"}`
  ];
  if (existingOrder !== "") lines.push(`order: ${existingOrder}`);
  if (imagePaths.length) lines.push(`images: ${imagePaths.join(", ")}`);
  return `${lines.join("\n")}\n\n[ingredients]\n${value("ingredients")}\n[/ingredients]\n\n[preparation]\n${value("preparation")}\n[/preparation]\n\n[secrets]\n${value("secrets")}\n[/secrets]\n`;
}



async function publishPersonalMemory(workflow) {
  await ensureFolder(workflow.root);

  const manifestPath = joinDropboxPath(workflow.root, "albums.txt");
  const currentText = await fetchText(manifestPath, true).catch(() => "");
  let groups = parsePersonalMemoryGroups(currentText);

  const removals = new Set(
    Array.from(
      els.formArea.querySelectorAll("[data-remove-personal-memory]:checked")
    ).map(input =>
      cleanMemoryReference(input.dataset.removePersonalMemory).toLowerCase()
    )
  );

  groups = groups
    .map(group => ({
      ...group,
      references: group.references.filter(
        reference => !removals.has(reference.toLowerCase())
      )
    }))
    .filter(group => group.references.length);

  const existingAssignments = new Map(
    Array.from(
      els.formArea.querySelectorAll("[data-existing-memory-group-reference]")
    ).map(input => [
      cleanMemoryReference(input.dataset.existingMemoryGroupReference).toLowerCase(),
      input.value.trim() || "@loose"
    ])
  );

  if (existingAssignments.size) {
    const regrouped = [];

    const addExistingToGroup = (groupName, reference) => {
      const cleanName = String(groupName || "").trim() || "@loose";
      let group = regrouped.find(item =>
        String(item.name).toLowerCase() === cleanName.toLowerCase()
      );

      if (!group) {
        group = { name: cleanName, references: [] };
        regrouped.push(group);
      }

      if (!group.references.some(item => item.toLowerCase() === reference.toLowerCase())) {
        group.references.push(reference);
      }
    };

    groups.forEach(group => {
      group.references.forEach(reference => {
        const assignedGroup =
          existingAssignments.get(reference.toLowerCase()) ?? group.name;
        addExistingToGroup(assignedGroup, reference);
      });
    });

    groups = regrouped;
  }

  const existingKeys = new Set(
    groups.flatMap(group =>
      group.references.map(reference => reference.toLowerCase())
    )
  );

  const selectedInputs = Array.from(
    els.formArea.querySelectorAll("[data-add-personal-memory]:checked")
  );

  const folderAdditions = selectedInputs
    .filter(input => input.dataset.memoryKind === "folder")
    .map(input => cleanMemoryReference(input.dataset.addPersonalMemory))
    .filter(Boolean);

  const fileAdditions = selectedInputs
    .filter(input => input.dataset.memoryKind === "file")
    .map(input => cleanMemoryReference(input.dataset.addPersonalMemory))
    .filter(Boolean)
    .filter(reference =>
      !folderAdditions.some(folderReference =>
        reference.toLowerCase().startsWith(
          `${folderReference.toLowerCase()}/`
        )
      )
    );

  const addToGroup = (groupName, reference) => {
    const cleanName = String(groupName || "").trim() || "@loose";
    const key = reference.toLowerCase();
    if (existingKeys.has(key)) return;

    let group = groups.find(item =>
      String(item.name).toLowerCase() === cleanName.toLowerCase()
    );

    if (!group) {
      group = { name: cleanName, references: [] };
      groups.push(group);
    }

    group.references.push(reference);
    existingKeys.add(key);
  };

  folderAdditions.forEach(reference => {
    addToGroup(memoryReferenceName(reference), reference);
  });

  const groupingMode =
    els.formArea.querySelector('input[name="personalMemoryGrouping"]:checked')?.value ||
    "loose";

  if (groupingMode === "one") {
    const albumName =
      currentForm()?.elements?.personalMemoryAlbumName?.value?.trim() ||
      "Selected memories";

    fileAdditions.forEach(reference => addToGroup(albumName, reference));
  } else if (groupingMode === "multiple") {
    const assignments = new Map(
      Array.from(
        els.formArea.querySelectorAll("[data-memory-group-reference]")
      ).map(input => [
        cleanMemoryReference(input.dataset.memoryGroupReference),
        input.value.trim()
      ])
    );

    fileAdditions.forEach(reference => {
      addToGroup(assignments.get(reference) || "@loose", reference);
    });
  } else {
    fileAdditions.forEach(reference => addToGroup("@loose", reference));
  }

  await uploadText(
    manifestPath,
    serializePersonalMemoryGroups(groups),
    true
  );

  return manifestPath;
}

async function publishPersonalTravel(workflow) {
  await ensureFolder(workflow.root);

  const manifestPath = joinDropboxPath(workflow.root, "trips.txt");
  const currentText = await fetchText(manifestPath, true);
  const current = parseManifestLines(currentText);

  const additions = Array.from(
    els.formArea.querySelectorAll("[data-add-personal-trip]:checked")
  ).map(input => input.dataset.addPersonalTrip);

  const removals = new Set(
    Array.from(
      els.formArea.querySelectorAll("[data-remove-personal-trip]:checked")
    ).map(input => String(input.dataset.removePersonalTrip).toLowerCase())
  );

  const next = [];
  const seen = new Set();

  [...current, ...additions].forEach(name => {
    const clean = String(name || "").trim();
    const key = clean.toLowerCase();
    if (!clean || removals.has(key) || seen.has(key)) return;
    seen.add(key);
    next.push(clean);
  });

  await uploadText(
    manifestPath,
    next.length ? `${next.join("\n")}\n` : "",
    true
  );

  return manifestPath;
}

async function publishRecipe() {
  const edit = Boolean(state.selectedData);
  let recipePath = edit ? state.selectedData.sourcePath : joinDropboxPath(state.rootPath || "/Zohar Family/Recipes", `${safeSegment(value("name"))}.txt`);
  await ensureFolder(parentPath(recipePath));
  let imagePaths = edit ? [...state.selectedData.images] : [];
  const removed = new Set(selectedRemovePaths("reference").map(pathKey));
  imagePaths = imagePaths.filter(path => !removed.has(pathKey(path)));

  const newFiles = files("images");
  if (newFiles.length) {
    const imageFolder = joinDropboxPath(parentPath(recipePath), "images");
    await ensureFolder(imageFolder);
    imagePaths.push(...await uploadFiles(imageFolder, newFiles));
  }
  const text = recipeTextFromForm(imagePaths, edit ? state.selectedData.order : "");
  const result = await uploadText(recipePath, text, edit);
  if (!edit && result.entry) recipePath = result.entry.displayPath || result.entry.path || recipePath;
  return recipePath;
}

function tripTextFromForm() {
  const filterName = value("filterName");
  const normalizedFilterName = filterName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const lines = [
    `Title: ${value("title")}`,
    `Year: ${value("year")}`,
    `Travelers: ${value("travelers")}`,
    `Filter: ${filterName}`
  ];

  if (
    normalizedFilterName === "sabba & safta"
    ||
    normalizedFilterName === "sabba and safta"
  ) {
    lines.push("Generation: first");
  }

  lines.push(
    `Blurb: ${value("blurb")}`,
    `X: ${value("x")}`,
    `Y: ${value("y")}`
  );
  value("links").split(/\r?\n/).map(line => line.trim()).filter(Boolean).forEach(line => {
    const index = line.indexOf("|");
    if (index > 0) lines.push(`Link: ${line.slice(0,index).trim()} | ${line.slice(index+1).trim()}`);
  });
  return `${lines.join("\n")}\n`;
}

async function availableFolder(root, preferred) {
  const direct = await fetchFolder(root, false, true);
  const names = new Set(direct.filter(entry => String(entry.type).toLowerCase() === "folder").map(entry => String(entry.name).toLowerCase()));
  let candidate = safeSegment(preferred);
  if (!names.has(candidate.toLowerCase())) return joinDropboxPath(root, candidate);
  let index = 2;
  while (names.has(`${candidate} ${index}`.toLowerCase())) index += 1;
  return joinDropboxPath(root, `${candidate} ${index}`);
}

async function publishTravel() {
  const edit = Boolean(state.selectedData?.root);

  let root;

  if (edit) {
    /*
     * Editing must NEVER create a folder. The selected existing trip folder
     * has to still exist; otherwise stop instead of silently creating a new
     * empty folder containing only trip.txt.
     */
    root = normalizePath(state.selectedData.root);

    if (
      !root ||
      pathKey(root) === pathKey(state.rootPath)
    ) {
      throw new Error("The existing trip folder could not be identified.");
    }

    try {
      await fetchFolder(root, false, false);
    } catch {
      throw new Error(
        `The original trip folder "${filename(root)}" could not be found. Nothing was changed.`
      );
    }

  } else {
    root = await availableFolder(
      state.rootPath,
      [value("title"), value("year")]
        .filter(Boolean)
        .join(" ") || "Trip"
    );

    await ensureFolder(root);
  }

  if (!value("x") || !value("y")) {
    throw new Error("Choose a location on the map.");
  }

  /*
   * Only trip.txt is intentionally overwritten.
   * Existing photos, videos and documents remain exactly where they are.
   */
  await uploadText(
    joinDropboxPath(root, "trip.txt"),
    tripTextFromForm(),
    edit
  );

  /*
   * Existing files are removed only when the user explicitly checked Remove.
   */
  for (const path of selectedRemovePaths("delete")) {
    await deletePath(path);
  }

  /*
   * New uploads are additive. Existing files are not replaced.
   */
  const media = files("images");

  if (media.length) {
    const imageFolder = joinDropboxPath(root, "images");
    await ensureFolder(imageFolder);
    await uploadFiles(imageFolder, media);
  }

  const documents = files("documents");

  if (documents.length) {
    await uploadFiles(root, documents);
  }

  /*
   * Folder renaming is a separate, explicit action. Moving the folder moves
   * the entire existing folder tree, including all photos and documents.
   */
  if (
    edit &&
    checked("renameTravelFolder")
  ) {
    const newName = safeSegment(
      value("folderName"),
      filename(root)
    );

    const target = joinDropboxPath(
      parentPath(root),
      newName
    );

    if (pathKey(target) !== pathKey(root)) {
      const moved = await movePath(root, target);

      root =
        moved.entry?.displayPath ||
        moved.entry?.path ||
        target;
    }
  }

  return root;
}

async function publishMemory() {
  const root = state.selectedData?.root || state.destinationFolder;
  await ensureFolder(root);

  const pathsToDelete = selectedRemovePaths("delete");
  const deleteKeys = new Set(pathsToDelete.map(pathKey));

  const activeTextEditors = Array.from(
    els.formArea.querySelectorAll('[data-memory-text-path][data-memory-text-active="true"]')
  );

  for (const textarea of activeTextEditors) {
    const path = textarea.dataset.memoryTextPath;
    if (!path || deleteKeys.has(pathKey(path))) continue;
    await uploadText(path, textarea.value, true);
  }

  for (const path of pathsToDelete) {
    await deletePath(path);
  }

  const mediaFiles = files("media");
  let uploadedMedia = [];

  if (mediaFiles.length) {
    uploadedMedia = await uploadFiles(root, mediaFiles);
  }

  if (checked("setMemoryCover")) {
    const selectedCoverName =
      currentForm()?.elements?.memoryCoverFile?.value || "";

    if (selectedCoverName) {
      const selectedIndex = mediaFiles.findIndex(file =>
        file.name === selectedCoverName
      );

      const uploadedPath =
        selectedIndex >= 0
          ? uploadedMedia[selectedIndex]
          : "";

      if (uploadedPath) {
        const ext = extension(uploadedPath) || extension(selectedCoverName) || "jpg";
        const coverPath = joinDropboxPath(root, `cover.${ext}`);

        if (pathKey(uploadedPath) !== pathKey(coverPath)) {
          await movePath(uploadedPath, coverPath);
        }
      }
    }
  }

  const links = value("linksToAdd")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (links.length) {
    await uploadText(
      joinDropboxPath(root, "Links.txt"),
      `${links.join("\n")}\n`,
      false
    );
  }

  if (
    state.selectedData &&
    value("folderName") &&
    pathKey(root) !== pathKey(state.rootPath)
  ) {
    const selectedParent =
      value("memoryParentFolder") ||
      parentPath(root);

    const target = joinDropboxPath(
      selectedParent,
      safeSegment(value("folderName"), filename(root))
    );

    if (pathKey(target) !== pathKey(root)) {
      const moved = await movePath(root, target);
      return moved.entry?.displayPath || moved.entry?.path || target;
    }
  }

  return root;
}

async function nextMerchOrder(root) {
  const entries = await fetchFolder(root, true, true);
  const metadataFiles = entries.filter(entry => String(entry.type).toLowerCase() === "file" && String(entry.name).toLowerCase() === "merch.txt");
  const values = await Promise.all(metadataFiles.map(async entry => Number(parseKeyValueText(await fetchText(entryPath(entry)).catch(() => "")).order)));
  const finite = values.filter(Number.isFinite);
  return finite.length ? Math.max(...finite) + 1 : 1;
}

async function publishMerch(workflow) {
  const edit = Boolean(state.selectedData);
  const root = edit ? state.selectedData.root : await availableFolder(workflow.root, value("name") || "Item");
  await ensureFolder(root);
  if (workflow.collection) await uploadText(joinDropboxPath(workflow.root, "name.txt"), `${value("collectionName")}\n`, true);
  for (const path of selectedRemovePaths("delete")) await deletePath(path);
  const newImagePaths = files("images").length ? await uploadFiles(root, files("images")) : [];
  let existingImages = edit ? merchImagePaths(state.selectedData) : [];
  const removed = new Set(selectedRemovePaths("delete").map(pathKey));
  existingImages = existingImages.filter(path => !removed.has(pathKey(path)));
  const allImages = [...existingImages, ...newImagePaths];
  if (!allImages.length) throw new Error("A Merch/Collection item needs at least one image.");
  const order = edit && state.selectedData.metadata.order ? state.selectedData.metadata.order : await nextMerchOrder(workflow.root);
  const lines = [
    `id: ${slugify(value("name"))}`,
    `name: ${value("name")}`,
    `description: ${value("description")}`,
    `created: ${value("created")}`,
    `createdBy: ${value("createdBy")}`,
    `owner: ${value("owner")}`,
    `order: ${order}`,
    `images: ${allImages.join(", ")}`
  ];
  await uploadText(joinDropboxPath(root, "merch.txt"), `${lines.join("\n")}\n`, edit);
  if (edit && value("folderName")) {
    const target = joinDropboxPath(parentPath(root), safeSegment(value("folderName"), filename(root)));
    if (pathKey(target) !== pathKey(root)) {
      const moved = await movePath(root, target);
      return moved.entry?.displayPath || moved.entry?.path || target;
    }
  }
  return root;
}

async function publishFolderRename() {
  const from = state.selectedData?.path;
  if (!from) throw new Error("No folder is selected.");

  const workflow = currentWorkflow();
  const newName = safeSegment(value("folderName"), filename(from));
  const selectedParent = value("parentFolder") || parentPath(from);

  if (workflow) {
    const rootKey = pathKey(workflow.root);
    const parentKey = pathKey(selectedParent);
    if (parentKey !== rootKey && !parentKey.startsWith(`${rootKey}/`)) {
      throw new Error("The folder must stay inside this section.");
    }
  }

  const target = joinDropboxPath(selectedParent, newName);
  if (pathKey(target) === pathKey(from)) return from;
  if (pathKey(target).startsWith(`${pathKey(from)}/`)) {
    throw new Error("A folder cannot be moved inside itself.");
  }

  const moved = await movePath(from, target);
  return moved.entry?.displayPath || moved.entry?.path || target;
}

async function publishWork() {
  const edit = Boolean(state.selectedData);
  let folder = edit ? parentPath(state.selectedData.path) : state.destinationFolder;
  await ensureFolder(folder);
  if (files("workFiles").length) await uploadFiles(folder, files("workFiles"));
  if (value("linkUrl")) await uploadText(joinDropboxPath(folder, `${safeSegment(value("linkTitle") || "Website")}.txt`), `${value("linkUrl")}\n`, false);

  if (edit && checked("updateTextFile") && extension(state.selectedData.path) === "txt") {
    await uploadText(state.selectedData.path, value("textContents"), true);
  }
  let selectedPath = edit ? state.selectedData.path : folder;
  if (edit) {
    const workflow = currentWorkflow();
    const selectedParent = value("workParentFolder") || parentPath(state.selectedData.path);
    const newName = safeSegment(value("newFilename"), filename(state.selectedData.path));

    if (workflow) {
      const rootKey = pathKey(workflow.root);
      const parentKey = pathKey(selectedParent);
      if (parentKey !== rootKey && !parentKey.startsWith(`${rootKey}/`)) {
        throw new Error("The file must stay inside this Works section.");
      }
    }

    const target = joinDropboxPath(selectedParent, newName);
    if (pathKey(target) !== pathKey(state.selectedData.path)) {
      const moved = await movePath(state.selectedData.path, target);
      selectedPath = moved.entry?.displayPath || moved.entry?.path || target;
      folder = parentPath(selectedPath);
    }
  }
  if (edit && checked("deleteSelected")) await deletePath(selectedPath);
  return folder;
}


async function publish() {
  if (!requireForm()) return;
  els.publishButton.disabled = true;
  setProgress(10);
  setPublishStatus("Saving…", "working");
  try {
    const workflow = currentWorkflow();
    let result = "";
    if (state.currentEditorKind === "personalTravel") result = await publishPersonalTravel(workflow);
    else if (state.currentEditorKind === "personalMemory") result = await publishPersonalMemory(workflow);
    else if (state.currentEditorKind === "recipe") result = await publishRecipe();
    else if (state.currentEditorKind === "travel") result = await publishTravel();
    else if (state.currentEditorKind === "memory") result = await publishMemory();
    else if (state.currentEditorKind === "merch") result = await publishMerch(workflow);
    else if (state.currentEditorKind === "work") result = await publishWork();
    else if (state.currentEditorKind === "folder") result = await publishFolderRename();
    setProgress(100);
    setPublishStatus(`Saved successfully: ${result}`, "success");
  } catch (error) {
    console.error(error);
    setProgress(0);
    setPublishStatus(`Could not save: ${error.message}`, "error");
  } finally {
    els.publishButton.disabled = false;
  }
}

/* ------------------------------ events ------------------------------ */
els.connectButton.addEventListener("click", connect);
els.adminToken.addEventListener("keydown", event => { if (event.key === "Enter") connect(); });
els.lockButton.addEventListener("click", lock);
els.restartButton.addEventListener("click", restartFlow);
els.modeTabs.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => chooseMode(button.dataset.mode)));
els.contentTabs.querySelectorAll("[data-content-type]").forEach(button => button.addEventListener("click", () => chooseContentType(button.dataset.contentType)));
els.personalContentTabs.querySelectorAll("[data-personal-type]").forEach(button => button.addEventListener("click", () => choosePersonalType(button.dataset.personalType)));
els.publishButton.addEventListener("click", publish);
els.previewButton.addEventListener("click", openPreview);
els.previewBackdrop.addEventListener("click", closePreview);
els.previewClose.addEventListener("click", closePreview);
document.addEventListener("keydown", event => { if (event.key === "Escape") closePreview(); });

if (els.adminToken.value) connect();
