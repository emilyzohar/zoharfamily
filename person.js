function renderNav() {
  const nav = document.getElementById("main-nav");
  nav.innerHTML = NAV_ITEMS.map(item =>
    `<a href="${item.href}">${item.label}</a>`
  ).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function renderPerson() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("person");
  const person = PEOPLE[slug];

  if (!person) {
    document.querySelector(".person-card").innerHTML =
      "<h1>Person not found</h1><p>This profile has not been added yet.</p>";
    return;
  }

  document.title = `${person.name} | Zohar Family`;
  document.getElementById("person-name").textContent = person.name;
  document.getElementById("person-summary").textContent = person.summary || "";

  const mainPhoto = document.getElementById("person-photo");
  mainPhoto.src = person.photo || HERO_IMAGE;
  mainPhoto.alt = `${person.name} family photo`;

  document.getElementById("person-story").innerHTML =
    (person.story || []).map(p => `<p>${escapeHtml(p)}</p>`).join("");

  const photoGallery = document.getElementById("photo-gallery");
  if (person.photos && person.photos.length) {
    photoGallery.innerHTML = person.photos.map(photo =>
      `<img src="${photo}" alt="${escapeHtml(person.name)} family memory" loading="lazy">`
    ).join("");
  } else {
    photoGallery.innerHTML = '<p class="empty-state">No extra photos added yet.</p>';
  }

  const videoGallery = document.getElementById("video-gallery");
  if (person.videos && person.videos.length) {
    videoGallery.innerHTML = person.videos.map(video => {
      if (video.endsWith(".mp4") || video.endsWith(".webm")) {
        return `<video controls preload="metadata"><source src="${video}"></video>`;
      }
      return `<a class="video-link" href="${video}" target="_blank" rel="noopener">Open video</a>`;
    }).join("");
  } else {
    videoGallery.innerHTML = '<p class="empty-state">No videos added yet.</p>';
  }
}

renderNav();
renderPerson();
