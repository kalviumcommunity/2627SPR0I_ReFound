// Mock PUBLIC item records — only fields that are safe to show anyone.
// Private details (serial numbers, contents, distinguishing marks) are never
// sent to the public listing; staff hold them for ownership checks.
// TODO(backend): replace with GET /api/items

export const CATEGORY_COLORS = {
  Electronics: "sky",
  Bottles: "marker",
  Clothing: "rose",
  "ID & Cards": "marker",
  Keys: "rose",
  Bags: "sky",
  Stationery: "marker",
  Accessories: "rose",
};

export const ITEMS = [
  { ref: "RF-0148", title: "Silver laptop charger", category: "Electronics", location: "Library", foundOn: "2026-11-11", description: "USB-C laptop charger with a braided cable, left at a study desk." },
  { ref: "RF-0147", title: "Navy blue backpack", category: "Bags", location: "Block A", foundOn: "2026-11-11", description: "Medium-sized backpack found under a bench outside room A-104." },
  { ref: "RF-0146", title: "Wireless mouse", category: "Electronics", location: "Computer lab", foundOn: "2026-11-10", description: "Black wireless mouse, found next to lab machine 12." },
  { ref: "RF-0145", title: "Denim jacket", category: "Clothing", location: "Auditorium", foundOn: "2026-11-10", description: "Light-wash denim jacket left on a seat after the evening event." },
  { ref: "RF-0144", title: "Scientific calculator", category: "Stationery", location: "Exam hall B", foundOn: "2026-11-09", description: "Scientific calculator found on a desk after the morning exam." },
  { ref: "RF-0143", title: "Pencil case, yellow", category: "Stationery", location: "Library", foundOn: "2026-11-09", description: "Zip-up fabric pencil case with pens inside." },
  { ref: "RF-0142", title: "Blue steel bottle", category: "Bottles", location: "Library", foundOn: "2026-11-08", description: "Insulated steel water bottle, found on the second floor." },
  { ref: "RF-0141", title: "Grey hoodie", category: "Clothing", location: "Sports hall", foundOn: "2026-11-08", description: "Plain grey pullover hoodie left on the bleachers." },
  { ref: "RF-0140", title: "Earphones with case", category: "Electronics", location: "Cafeteria", foundOn: "2026-11-07", description: "Wireless earbuds in a charging case, found on a table." },
  { ref: "RF-0139", title: "Black earbuds case", category: "Electronics", location: "Cafeteria", foundOn: "2026-11-07", description: "Empty charging case for wireless earbuds." },
  { ref: "RF-0138", title: "Student ID card", category: "ID & Cards", location: "Main gate", foundOn: "2026-11-06", description: "Campus ID card handed in by security. Name withheld." },
  { ref: "RF-0137", title: "Red umbrella", category: "Accessories", location: "Main gate", foundOn: "2026-11-06", description: "Foldable red umbrella left at the security cabin." },
  { ref: "RF-0136", title: "Glasses in a hard case", category: "Accessories", location: "Block B", foundOn: "2026-11-05", description: "Prescription glasses in a dark hard case." },
  { ref: "RF-0135", title: "Bike key on a ring", category: "Keys", location: "Hostel lobby", foundOn: "2026-11-05", description: "Single key on a metal ring, found near the bike stand." },
  { ref: "RF-0134", title: "Canvas tote bag", category: "Bags", location: "Cafeteria", foundOn: "2026-11-04", description: "Canvas tote bag with notebooks inside." },
  { ref: "RF-0133", title: "Pink water bottle", category: "Bottles", location: "Sports hall", foundOn: "2026-11-04", description: "Plastic sports bottle with a flip-top lid." },
  { ref: "RF-0132", title: "Wrist watch", category: "Accessories", location: "Sports hall", foundOn: "2026-11-03", description: "Analog wrist watch with a leather strap, found in the changing room." },
  { ref: "RF-0131", title: "Lanyard with keys", category: "Keys", location: "Block C", foundOn: "2026-11-03", description: "Lanyard with three keys, found on the stairs." },
  { ref: "RF-0130", title: "Bus pass", category: "ID & Cards", location: "Main gate", foundOn: "2026-11-02", description: "City bus pass in a plastic sleeve. Name withheld." },
  { ref: "RF-0129", title: "Power bank", category: "Electronics", location: "Library", foundOn: "2026-11-01", description: "Slim power bank with a short cable attached." },
  { ref: "RF-0128", title: "Black cap", category: "Clothing", location: "Block A", foundOn: "2026-10-31", description: "Plain black baseball cap." },
  { ref: "RF-0127", title: "Spiral notebook", category: "Stationery", location: "Block B", foundOn: "2026-10-30", description: "A4 spiral notebook with lecture notes." },
  { ref: "RF-0126", title: "Steel tiffin box", category: "Bottles", location: "Hostel lobby", foundOn: "2026-10-29", description: "Two-tier steel lunch box." },
  { ref: "RF-0125", title: "Room key with tag", category: "Keys", location: "Hostel lobby", foundOn: "2026-10-28", description: "Single key with a plastic tag. Room number withheld." },
];
