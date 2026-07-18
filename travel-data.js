/*
  ============================================
  TRAVEL DATA
  ============================================

  x:
    Horizontal position as percentage
    from the LEFT of the map.

  y:
    Vertical position as percentage
    from the TOP of the map.

  pdfs:
    Add one or more PDF files.

    If there is one PDF:
      arrows and dots are hidden.

    If there are multiple PDFs:
      users can move through them
      with arrows or dots.


  HOW TO FIND X AND Y:

  On the travel page:

  Hold ALT / OPTION and click
  anywhere on the map.

  The x and y percentages will
  appear on screen.

  Copy those numbers here.
*/


const TRAVELS = [


  {
    id: "israel-2019",

    title: "Israel",

    year: "2019",

    x: 56.2,

    y: 42.5,

    pdfs: [

      "assets/travel/pdfs/israel-2019.pdf",

      "assets/travel/pdfs/israel-2019-2.pdf"

    ]
  },


  {
    id: "france-2022",

    title: "France",

    year: "2022",

    x: 48.7,

    y: 32.8,

    pdfs: [

      "assets/travel/pdfs/france-2022.pdf"

    ]
  },


  {
    id: "toronto-2024",

    title: "Toronto",

    year: "2024",

    x: 29.5,

    y: 31.5,

    pdfs: [

      "assets/travel/pdfs/toronto-2024.pdf",

      "assets/travel/pdfs/toronto-2024-2.pdf",

      "assets/travel/pdfs/toronto-2024-3.pdf"

    ]
  },


  {
    id: "south-africa-2017",

    title: "South Africa",

    year: "2017",

    x: 53.5,

    y: 76.5,

    pdfs: [

      "assets/travel/pdfs/south-africa-2017.pdf"

    ]
  }


];