export const DEMO_PASSWORD = 'Password123!';

export const USERS = [
  { key: 'alice', name: 'Alice Buyer', email: 'alice@example.com', roles: ['user'] },
  { key: 'bob', name: 'Bob Buyer', email: 'bob@example.com', roles: ['user'] },
  { key: 'carol', name: 'Carol Buyer', email: 'carol@example.com', roles: ['user'] },
  { key: 'dave', name: 'Dave Buyer', email: 'dave@example.com', roles: ['user'] },
  { key: 'erin', name: 'Erin Applicant', email: 'erin@example.com', roles: ['user'] },
  { key: 'sam', name: 'Sam Seller', email: 'sam.seller@example.com', roles: ['user', 'seller'] },
  { key: 'sofia', name: 'Sofia Seller', email: 'sofia.seller@example.com', roles: ['user', 'seller'] },
  { key: 'sunny', name: 'Sunny Seller', email: 'sunny.seller@example.com', roles: ['user', 'seller'] },
  { key: 'admin', name: 'Ada Admin', email: 'admin@example.com', roles: ['user', 'admin'] },
  { key: 'adminSeller1', name: 'Alex Admin-Seller', email: 'admin.seller1@example.com', roles: ['user', 'admin', 'seller'] },
  { key: 'adminSeller2', name: 'Avery Admin-Seller', email: 'admin.seller2@example.com', roles: ['user', 'admin', 'seller'] },
] as const;

export const CATEGORIES = [
  { name: 'Electronics', description: 'Gadgets, audio and smart devices' },
  { name: 'Fashion', description: 'Clothing, bags and accessories' },
  { name: 'Home & Living', description: 'Kitchen, decor and everyday essentials' },
  { name: 'Sports & Outdoors', description: 'Gear for adventure and fitness' },
];

export const SHOPS = [
  { key: 'gadget', owner: 'sam', name: 'Gadget Garage', description: 'Curated consumer electronics with honest specs and fast shipping.' },
  { key: 'home', owner: 'sam', name: 'Home Haven', description: 'Everything to make a house feel like home.' },
  { key: 'urban', owner: 'sofia', name: 'Urban Threads', description: 'Modern, durable everyday fashion.' },
  { key: 'trail', owner: 'sofia', name: 'Trail & Peak', description: 'Outdoor and fitness gear tested on real trails.' },
  { key: 'sunny', owner: 'sunny', name: 'Sunny Living', description: 'Bright, practical pieces for home and wardrobe.' },
  { key: 'picks', owner: 'adminSeller1', name: "Admin's Picks", description: 'Hand-picked favourites from the marketplace team.' },
];

type P = {
  shop: string;
  cat: string;
  name: string;
  desc: string;
  price: number;
  discount?: number;
  stock: number;
  sku: string;
  featured?: boolean;
  specs: [string, string][];
};
export const PRODUCTS: P[] = [
  {
    shop: 'gadget',
    cat: 'Electronics',
    name: 'AeroSound Wireless Headphones',
    desc: 'Over-ear Bluetooth headphones with active noise cancellation and 40-hour battery life.',
    price: 129.99,
    discount: 15,
    stock: 40,
    sku: 'GG-HP-001',
    featured: true,
    specs: [
      ['Battery', '40 hours'],
      ['Connectivity', 'Bluetooth 5.3'],
      ['Weight', '250 g'],
    ],
  },
  {
    shop: 'gadget',
    cat: 'Electronics',
    name: 'PixelBook 14 Laptop',
    desc: '14-inch ultralight laptop with 16 GB RAM, 512 GB SSD and an all-day battery.',
    price: 899,
    stock: 12,
    sku: 'GG-LT-002',
    featured: true,
    specs: [
      ['Display', '14" 2.2K IPS'],
      ['RAM', '16 GB'],
      ['Storage', '512 GB SSD'],
    ],
  },
  {
    shop: 'gadget',
    cat: 'Electronics',
    name: 'Pulse Smartwatch S2',
    desc: 'Fitness smartwatch with heart-rate, GPS and sleep tracking. Water resistant to 50 m.',
    price: 179,
    discount: 10,
    stock: 25,
    sku: 'GG-SW-003',
    specs: [
      ['Battery', '7 days'],
      ['GPS', 'Built-in'],
    ],
  },
  {
    shop: 'gadget',
    cat: 'Electronics',
    name: 'BoomBox Mini Bluetooth Speaker',
    desc: 'Pocket-sized speaker with surprisingly deep bass and 12-hour playtime.',
    price: 39.5,
    stock: 60,
    sku: 'GG-SP-004',
    specs: [
      ['Playtime', '12 hours'],
      ['Rating', 'IPX7'],
    ],
  },
  {
    shop: 'home',
    cat: 'Home & Living',
    name: 'ChefMate 1200W Blender',
    desc: 'High-speed countertop blender with six presets and a dishwasher-safe 1.5 L jar.',
    price: 79.99,
    discount: 20,
    stock: 30,
    sku: 'HH-BL-001',
    featured: true,
    specs: [
      ['Power', '1200 W'],
      ['Capacity', '1.5 L'],
    ],
  },
  {
    shop: 'home',
    cat: 'Home & Living',
    name: 'Cast Iron Dutch Oven 5 qt',
    desc: 'Enameled cast iron pot that goes from stovetop to oven. Perfect for stews and bread.',
    price: 64,
    stock: 18,
    sku: 'HH-DO-002',
    specs: [
      ['Capacity', '5 quarts'],
      ['Material', 'Enameled cast iron'],
    ],
  },
  {
    shop: 'home',
    cat: 'Home & Living',
    name: 'Linen Throw Blanket',
    desc: 'Soft stonewashed linen blanket in a warm neutral tone.',
    price: 49,
    stock: 35,
    sku: 'HH-TB-003',
    specs: [
      ['Size', '130 x 170 cm'],
      ['Material', '100% linen'],
    ],
  },
  {
    shop: 'home',
    cat: 'Home & Living',
    name: 'Ceramic Pour-Over Coffee Set',
    desc: 'Handmade ceramic dripper with matching server and two cups.',
    price: 54.9,
    stock: 3,
    sku: 'HH-CS-004',
    specs: [['Pieces', '4']],
  },
  {
    shop: 'urban',
    cat: 'Fashion',
    name: 'Denim Trucker Jacket',
    desc: 'Classic mid-wash denim jacket with a relaxed fit and brass buttons.',
    price: 89,
    discount: 25,
    stock: 22,
    sku: 'UT-JK-001',
    featured: true,
    specs: [
      ['Fit', 'Relaxed'],
      ['Material', 'Cotton denim'],
    ],
  },
  {
    shop: 'urban',
    cat: 'Fashion',
    name: 'Everyday Leather Backpack',
    desc: 'Full-grain leather backpack with padded laptop sleeve for up to 15 inches.',
    price: 139,
    stock: 14,
    sku: 'UT-BP-002',
    specs: [
      ['Capacity', '20 L'],
      ['Laptop', 'up to 15"'],
    ],
  },
  {
    shop: 'urban',
    cat: 'Fashion',
    name: 'Merino Crew Sweater',
    desc: 'Lightweight merino wool sweater that regulates temperature year-round.',
    price: 74.5,
    stock: 28,
    sku: 'UT-SW-003',
    specs: [['Material', '100% merino wool']],
  },
  {
    shop: 'urban',
    cat: 'Fashion',
    name: 'Polarized Aviator Sunglasses',
    desc: 'Timeless aviator frames with polarized UV400 lenses.',
    price: 59,
    stock: 50,
    sku: 'UT-SG-004',
    specs: [
      ['UV', 'UV400'],
      ['Lens', 'Polarized'],
    ],
  },
  {
    shop: 'trail',
    cat: 'Sports & Outdoors',
    name: 'Summit 2-Person Backpacking Tent',
    desc: 'Three-season freestanding tent weighing just 1.9 kg with a full rainfly.',
    price: 219,
    discount: 12,
    stock: 9,
    sku: 'TP-TN-001',
    featured: true,
    specs: [
      ['Weight', '1.9 kg'],
      ['Capacity', '2 persons'],
    ],
  },
  {
    shop: 'trail',
    cat: 'Sports & Outdoors',
    name: 'GripFlex Yoga Mat',
    desc: 'Non-slip 6 mm yoga mat made from natural rubber with alignment lines.',
    price: 42,
    stock: 45,
    sku: 'TP-YM-002',
    specs: [['Thickness', '6 mm']],
  },
  {
    shop: 'trail',
    cat: 'Sports & Outdoors',
    name: 'TrailRunner Hydration Vest',
    desc: '10-litre running vest with two soft flasks and quick-access pockets.',
    price: 98,
    stock: 20,
    sku: 'TP-HV-003',
    specs: [
      ['Capacity', '10 L'],
      ['Flasks', '2 x 500 ml'],
    ],
  },
  {
    shop: 'trail',
    cat: 'Sports & Outdoors',
    name: 'Adjustable Dumbbell Pair',
    desc: 'Space-saving adjustable dumbbells from 2 to 24 kg each.',
    price: 249,
    stock: 0,
    sku: 'TP-DB-004',
    specs: [['Range', '2-24 kg']],
  },
  {
    shop: 'sunny',
    cat: 'Home & Living',
    name: 'Sunrise Desk Lamp',
    desc: 'Warm-to-cool LED desk lamp with wireless phone charging base.',
    price: 45,
    discount: 10,
    stock: 33,
    sku: 'SL-LP-001',
    specs: [
      ['Light', '2700-6500 K'],
      ['Charging', 'Qi 10 W'],
    ],
  },
  {
    shop: 'sunny',
    cat: 'Fashion',
    name: 'Canvas Tote Bag',
    desc: 'Heavy cotton canvas tote with inner zip pocket. Fits a 13-inch laptop.',
    price: 24,
    stock: 80,
    sku: 'SL-TB-002',
    specs: [['Material', 'Cotton canvas']],
  },
  {
    shop: 'picks',
    cat: 'Electronics',
    name: 'UltraCharge 65W GaN Charger',
    desc: 'Compact 3-port GaN charger that powers a laptop and two phones at once.',
    price: 49.99,
    stock: 70,
    sku: 'AP-CH-001',
    featured: true,
    specs: [
      ['Output', '65 W'],
      ['Ports', '2x USB-C, 1x USB-A'],
    ],
  },
  {
    shop: 'picks',
    cat: 'Sports & Outdoors',
    name: 'Insulated Steel Water Bottle 1 L',
    desc: 'Double-wall vacuum bottle keeps drinks cold 24 h or hot 12 h.',
    price: 29,
    stock: 100,
    sku: 'AP-WB-002',
    specs: [
      ['Capacity', '1 L'],
      ['Material', '18/8 steel'],
    ],
  },
];

export const imageFor = (slug: string, n = 0) => `https://picsum.photos/seed/${slug}-${n}/800/800`;
