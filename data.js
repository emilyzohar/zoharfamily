/*
  EDIT THIS FILE for most day-to-day site updates.

  - Change navigation labels/links in NAV_ITEMS.
  - Replace HERO_IMAGE with any image path inside assets/.
  - Change the homepage caption in HERO_CAPTION.
  - Edit names/relationships in FAMILY.
  - Add biographies, photos, and videos in PEOPLE.
*/

const NAV_ITEMS = [
  { label: "Recipes", href: "#" },
  { label: "Merch", href: "#" },
  { label: "S&S’s Travels", href: "#" },
  { label: "Home Videos", href: "#" }
];

const LANDING_PHOTO = "assets/family-photo.png";

const HERO_CAPTION =
  "Zohar family — our heirloom for Zohar heirs and successors";

const FAMILY = {
  grandparents: [
    { name: "Aliza", slug: "aliza" },
    { name: "Amnon", slug: "amnon" }
  ],
  branches: [
    {
      couple: [
        { name: "Eyal", slug: "eyal" },
        { name: "Mitzi", slug: "mitzi" }
      ],
      children: [
        { name: "Emily", slug: "emily" },
        { name: "Zach", slug: "zach" }
      ]
    },
    {
      couple: [
        { name: "Alon", slug: "alon" },
        { name: "Tracey", slug: "tracey" }
      ],
      children: [
        { name: "Erin", slug: "erin" },
        { name: "Ethan", slug: "ethan" },
        { name: "Jacklyn", slug: "jacklyn" }
      ]
    },
    {
      couple: [
        { name: "Sharon", slug: "sharon" },
        { name: "Mark", slug: "mark" }
      ],
      children: [
        { name: "Jaime", slug: "jaime" },
        { name: "Alex", slug: "alex" }
      ]
    }
  ]
};

// Add/edit keepsake content here.
// Photo paths should point to files in assets/.
// Videos can be local .mp4/.webm files or external links.
const PEOPLE = {
  aliza: {
    name: "Aliza",
    summary: "Add a short introduction here.",
    story: [
      "Write memories, family history, favourite sayings, recipes, or anything else you want to preserve here."
    ],
    photo: "assets/family-photo.png",
    photos: [],
    videos: []
  },
  amnon: { name: "Amnon", summary: "Add a short introduction here.", story: ["Add Amnon's story here."], photo: "assets/family-photo.png", photos: [], videos: [] },
  emily: { name: "Emily", summary: "Add a short introduction here.", story: ["Add Emily's story here."], photo: "assets/family-photo.png", photos: [], videos: [] },
  };
