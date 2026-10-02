/**
 * Planet Rose: built-in content.
 *
 * This is what the site shows when the Sanity panel isn't connected yet,
 * and it's the starting point that `studio/seed/seed.mjs` imports into Sanity.
 * Once Sanity is connected, edit content in the panel, not here.
 */

const photo = (file, alt, width, height) => ({ src: `/assets/photos/${file}`, alt, width, height });

export default {
  settings: {
    phone: '+16098308233',
    phoneDisplay: '(609) 830-8233',
    email: 'planetrose.reservation@gmail.com',
    instagramUrl: 'https://www.instagram.com/planetroset_ac/',
    instagramHandle: '@planetroset_ac',
    facebookUrl: 'https://www.facebook.com/Planet-Rose-1486991048200882/',
    tiktokUrl: '',
    googleReviewUrl: '',
    calendlyUrl: 'https://calendly.com/d/cnbz-ws2-vcx',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Planet+Rose+at+Tropicana+Atlantic+City',
    addressVenue: 'Inside Tropicana Atlantic City',
    addressStreet: '2801 Pacific Ave',
    addressCity: 'Atlantic City',
    addressRegion: 'NJ',
    addressZip: '08401',
    songPrice: '$2',
    coverRange: '$5–$10',
    coverNote: 'Sun–Thu $5 · Fri–Sat $10',
    hours: [
      { days: 'Mon – Wed', time: '9PM – 1:30AM', late: false },
      { days: 'Thursday', time: '9PM – 2AM', late: false },
      { days: 'Fri – Sat', time: '9PM – 3AM', late: true },
      { days: 'Sunday', time: '9PM – 2AM', late: false }
    ],
    hoursNote: "Hours may change on holidays and event nights. Call ahead if you're planning around closing time."
  },

  menu: [
    { title: 'Cocktails', description: 'House signatures & classics', price: '$15', priceIsNote: false,
      image: photo('menu-cocktails.jpg', 'Row of bright cocktails lined up on the pink bar', 1100, 733) },
    { title: 'Beer', description: 'Draft & bottles', price: '$8–$9', priceIsNote: false,
      image: photo('menu-beer.jpg', 'Bottles of Corona, Michelob Ultra, Miller Lite, Heineken, Bud Light and Budweiser on ice at the pink bar', 1100, 733) },
    { title: 'Wine & Champagne', description: 'By the glass or the bottle', price: '$13–$100', priceIsNote: false,
      image: photo('menu-champagne.jpg', 'Bottle of Freixenet Cordón Negro cava chilling in an ice bucket on the pink bar', 1100, 733) },
    { title: 'Liquor', description: 'Well to top shelf. Ask your bartender.', price: 'At the bar', priceIsNote: true,
      image: photo('menu-liquor.jpg', 'Bartender pouring a drink over ice', 666, 1100) }
  ],

  merchCard: { description: 'Tees, caps & more. Take the night home.', price: '$30' },

  products: [
    { id: 'tee', name: 'Planet Rose Skull Tee', shortName: 'Skull Tee', price: '$30',
      description: 'Black crew-neck tee with the Planet Rose skull & roses crest. Tokyo · NYC · Atlantic City.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      image: photo('merch-tee.jpg', 'Black Planet Rose t-shirt with the red skull and rose logo on the chest', 900, 900) },
    { id: 'cap', name: 'Planet Rose Skull Cap', shortName: 'Skull Cap', price: '$30',
      description: 'Black structured cap with the Planet Rose crest on the front. Adjustable, one size fits most.',
      sizes: ['One size'],
      image: photo('merch-cap.jpg', 'Black Planet Rose cap with the red skull and rose logo on the front', 900, 900) }
  ],

  vip: {
    intro: 'Your own room, your own mic, your own rules. Built for birthdays, bachelorettes, work nights and anyone who wants the stage to themselves.',
    mainImage: photo('vip-main.jpg', 'The Planet Rose VIP Room: red walls, zebra-print booth seating, private karaoke screen and sound system', 1600, 2000),
    caption: 'VIP Room · up to 20 guests',
    thumbs: [
      photo('vip-room-wide.jpg', 'Wide view of the VIP Room with booth seating wrapping around the walls', 1600, 1124),
      photo('vip-outside.jpg', 'The VIP Room window seen from the main bar', 1105, 1400)
    ],
    // price: true → the value is highlighted in yellow like other prices
    specs: [
      { label: 'Capacity', value: 'Up to 20', price: '' },
      { label: 'Rate', value: '/ person / hr', price: '$10' },
      { label: 'Minimum', value: 'for 5 or fewer', price: '$50' },
      { label: 'Length', value: '1 – 3 hours', price: '' },
      { label: 'Gratuity', value: '20% added', price: '' },
      { label: 'To hold it', value: 'Card required', price: '' }
    ],
    finePrint: "Reservations aren't confirmed until approved by the Planet Rose team. A $50 fee applies to late cancellations and no-shows."
  },

  gallery: [
    { image: photo('gallery-01.jpg', 'Four friends posing at the pink bar, one in a fuzzy hat', 750, 1000), wide: false },
    { image: photo('gallery-02.jpg', 'A crowd singing together on the Planet Rose stage', 750, 1000), wide: false },
    { image: photo('gallery-03.jpg', 'Two friends raising cocktails at the bar', 793, 1000), wide: false },
    { image: photo('gallery-09.jpg', 'The Planet Rose and Karaoke neon signs glowing in the dark', 1000, 452), wide: true },
    { image: photo('gallery-04.jpg', 'Group of friends with drinks at the bar', 750, 1000), wide: false },
    { image: photo('gallery-05.jpg', 'The bartender making drinks for two guests', 667, 1000), wide: false },
    { image: photo('gallery-07.jpg', 'A packed Saturday crowd along the neon-lit bar', 750, 1000), wide: false },
    { image: photo('gallery-10.jpg', 'A guest in a Planet Rose tee holding out two microphones', 825, 1100), wide: false },
    { image: photo('gallery-12.jpg', 'A busy night along the pink bar under the black-lettered ceiling', 825, 1100), wide: false },
    { image: photo('gallery-11.jpg', 'Three friends in cowboy hats celebrating at the red bar', 825, 1100), wide: false },
    { image: photo('gallery-13.jpg', 'The main room packed in front of the karaoke screens', 825, 1100), wide: false },
    { image: photo('gallery-08.jpg', 'A guest picking a song from the songbook with a cocktail', 667, 1000), wide: false }
  ]
};
