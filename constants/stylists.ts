// constants/stylists.ts
// SAMPLE profiles for the Discover feed and stylist pages, used until real
// stylists join through the application form (constants/links.ts).
// Every profile is marked `sample: true` and the app labels them as samples,
// so nothing is presented as a real partner that isn't one.
// Photos: the licence-checked Unsplash images from constants/feedData.ts.
// When real stylists join, replace these with rows from Supabase and their
// own uploaded work.

const u = (id: string) => `https://images.unsplash.com/${id}?fm=jpg&q=80&w=1200&auto=format&fit=crop`;

export type Stylist = {
  id: string;
  name: string;
  speciality: string;
  city: string;
  about: string;
  hairTypes: string[];
  services: string[];
  photos: string[];
  sample: boolean;
};

export const STYLISTS: Stylist[] = [
  {
    id: 'sample-amara',
    name: 'Amara O.',
    speciality: 'Coils, silk press and scalp care',
    city: 'Brixton, London',
    about: 'Natural hair specialist. Silk presses that keep your curl pattern intact, and wash days built around moisture, not tension.',
    hairTypes: ['Type 4'],
    services: ['Silk press', 'Natural hair care', 'Treatments'],
    photos: [u('photo-1632765854612-9b02b6ec2b15'), u('photo-1783445744072-b2bc87d633ec'), u('photo-1583994009906-c00c0bd8acb2')],
    sample: true,
  },
  {
    id: 'sample-nia',
    name: 'Nia M.',
    speciality: 'Braids and protective styles',
    city: 'Peckham, London',
    about: 'Knotless, cornrows and long-wear protective styles, done light on the edges so your hair comes out healthier than it went in.',
    hairTypes: ['Type 3', 'Type 4'],
    services: ['Braids and protective styles', 'Cornrows'],
    photos: [u('photo-1673470907547-1c0c6a996095'), u('photo-1612459284970-e8f027596582'), u('photo-1778953501987-ece284f0b34a')],
    sample: true,
  },
  {
    id: 'sample-jade',
    name: 'Jade K.',
    speciality: 'Curl cuts and definition',
    city: 'Hackney, London',
    about: 'Dry cutting curl by curl, so the shape works on wash-and-go days, not just on the day you leave the chair.',
    hairTypes: ['Type 2', 'Type 3'],
    services: ['Cuts', 'Curl definition'],
    photos: [u('photo-1739825353871-2b9c6716142a'), u('photo-1664293272875-2cfa64e687c7')],
    sample: true,
  },
  {
    id: 'sample-priya',
    name: 'Priya S.',
    speciality: 'Colour and sleek styling',
    city: 'Soho, London',
    about: 'Low-damage colour and glossy finishes. Every colour appointment starts with a strand test and a bond treatment.',
    hairTypes: ['Type 1', 'Type 2'],
    services: ['Colour', 'Treatments'],
    photos: [u('photo-1674484145277-b42f70fbbfec')],
    sample: true,
  },
];

export function getStylist(id: string) {
  return STYLISTS.find(s => s.id === id);
}
