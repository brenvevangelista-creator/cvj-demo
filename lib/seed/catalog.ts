// Fixed lists for the demo seed. Everything here is invented sample data.

export const UNITS = [
  { slug: 'events', name: 'Events Place', kind: 'venue', capacity: 500 },
  { slug: 'catering', name: 'Catering', kind: 'catering', capacity: null },
  { slug: 'cafe', name: 'Cafe', kind: 'cafe', capacity: 40 },
  { slug: 'commissary', name: 'Commissary', kind: 'commissary', capacity: null },
  { slug: 'parking', name: 'Parking', kind: 'parking', capacity: 120 },
  { slug: 'pickleball', name: 'Pickleball Park', kind: 'courts', capacity: 4 } // listed publicly as CVJ Pickleball Park; four courts is an assumption,
] as const;

export type UnitSlug = (typeof UNITS)[number]['slug'];

export const VENUE_AREAS = ['Ground Floor', '2nd Floor', '3rd Floor'] as const; // one event space per floor, per public listings; confirm names with the owners

export const MANPOWER_RATIOS = [
  { role: 'servers', paxPerHead: 25, fixedCount: null, unit: 'catering' },
  { role: 'cooks', paxPerHead: 50, fixedCount: null, unit: 'commissary' },
  { role: 'dishwashers', paxPerHead: 100, fixedCount: null, unit: 'catering' },
  { role: 'parking marshals', paxPerHead: 80, fixedCount: null, unit: 'parking' },
  { role: 'supervisor', paxPerHead: null, fixedCount: 1, unit: 'events' },
] as const;

// name, uom, cost per uom (centavos), par level, fresh
export const INGREDIENTS: [string, string, number, number, boolean][] = [
  ['Chicken, whole', 'kg', 21_000, 60, false],
  ['Pork belly', 'kg', 38_000, 40, false],
  ['Beef brisket', 'kg', 52_000, 30, false],
  ['Bangus', 'kg', 26_000, 20, false],
  ['Shrimp', 'kg', 48_000, 15, false],
  ['Jasmine rice', 'kg', 5_800, 150, false],
  ['Egg noodles', 'kg', 9_000, 20, false],
  ['Cooking oil', 'L', 11_000, 40, false],
  ['Soy sauce', 'L', 6_500, 20, false],
  ['Vinegar', 'L', 4_000, 20, false],
  ['Calamansi', 'kg', 9_000, 10, true],
  ['Garlic', 'kg', 18_000, 10, false],
  ['Onion', 'kg', 12_000, 20, false],
  ['Tomato', 'kg', 8_000, 15, true],
  ['Lettuce', 'kg', 14_000, 8, true],
  ['Cucumber', 'kg', 7_000, 8, true],
  ['Carrot', 'kg', 7_500, 10, false],
  ['Bell pepper', 'kg', 16_000, 6, false],
  ['Potato', 'kg', 7_000, 25, false],
  ['Coconut milk', 'L', 9_500, 15, false],
  ['Butter', 'kg', 42_000, 8, false],
  ['Cheese', 'kg', 48_000, 8, false],
  ['Flour', 'kg', 5_500, 30, false],
  ['Sugar', 'kg', 7_000, 30, false],
  ['Eggs', 'tray', 28_000, 12, false],
  ['Fresh milk', 'L', 9_000, 20, false],
  ['Coffee beans', 'kg', 90_000, 6, false],
  ['Mango', 'kg', 15_000, 10, false],
  ['Banana', 'kg', 6_000, 10, false],
  ['Lemongrass', 'bundle', 3_000, 6, false],
];

// Ingredient marked low on stock in the seed (index into INGREDIENTS).
export const LOW_STOCK_INGREDIENT = 'Chicken, whole';

// Menu items: name, unit slug that sells it, menu price (centavos), recipe lines [ingredient name, qty per portion]
export const MENU_ITEMS: { name: string; unit: UnitSlug; price: number; recipe: [string, number][] }[] = [
  { name: 'Chicken Inasal', unit: 'catering', price: 18_000, recipe: [['Chicken, whole', 0.25], ['Calamansi', 0.01], ['Lemongrass', 0.02]] },
  { name: 'Lechon Kawali', unit: 'catering', price: 22_000, recipe: [['Pork belly', 0.2], ['Cooking oil', 0.03]] },
  { name: 'Beef Caldereta', unit: 'catering', price: 26_000, recipe: [['Beef brisket', 0.18], ['Potato', 0.06], ['Carrot', 0.04], ['Bell pepper', 0.02]] },
  { name: 'Pork Adobo', unit: 'catering', price: 19_000, recipe: [['Pork belly', 0.18], ['Soy sauce', 0.02], ['Vinegar', 0.02], ['Garlic', 0.01]] },
  { name: 'Bangus Belly', unit: 'catering', price: 21_000, recipe: [['Bangus', 0.2], ['Cooking oil', 0.02]] },
  { name: 'Garlic Shrimp', unit: 'catering', price: 28_000, recipe: [['Shrimp', 0.12], ['Garlic', 0.01], ['Butter', 0.01]] },
  { name: 'Pancit Canton', unit: 'catering', price: 12_000, recipe: [['Egg noodles', 0.08], ['Carrot', 0.02], ['Soy sauce', 0.01]] },
  { name: 'Steamed Rice', unit: 'catering', price: 4_000, recipe: [['Jasmine rice', 0.12]] },
  { name: 'Garden Salad', unit: 'catering', price: 9_000, recipe: [['Lettuce', 0.1], ['Tomato', 0.05], ['Cucumber', 0.05]] },
  { name: 'Chicken Curry', unit: 'catering', price: 20_000, recipe: [['Chicken, whole', 0.22], ['Coconut milk', 0.08], ['Potato', 0.05]] },
  { name: 'Beef Steak Tagalog', unit: 'catering', price: 27_000, recipe: [['Beef brisket', 0.17], ['Onion', 0.05], ['Soy sauce', 0.02]] },
  { name: 'Fish Fillet in Lemon Butter', unit: 'catering', price: 24_000, recipe: [['Bangus', 0.18], ['Butter', 0.02], ['Calamansi', 0.01]] },
  { name: 'Mac and Cheese', unit: 'catering', price: 11_000, recipe: [['Egg noodles', 0.07], ['Cheese', 0.04], ['Fresh milk', 0.05]] },
  { name: 'Buttered Vegetables', unit: 'catering', price: 8_000, recipe: [['Carrot', 0.05], ['Bell pepper', 0.03], ['Butter', 0.01]] },
  { name: 'Mango Float', unit: 'catering', price: 9_000, recipe: [['Mango', 0.08], ['Fresh milk', 0.04], ['Sugar', 0.02]] },
  { name: 'Leche Flan', unit: 'catering', price: 8_000, recipe: [['Eggs', 0.1], ['Fresh milk', 0.05], ['Sugar', 0.03]] },
  { name: 'Banana Turon', unit: 'catering', price: 6_000, recipe: [['Banana', 0.1], ['Sugar', 0.02], ['Cooking oil', 0.02]] },
  { name: 'Iced Tea Pitcher', unit: 'catering', price: 5_000, recipe: [['Sugar', 0.03], ['Calamansi', 0.01]] },
  { name: 'Shrimp Sinigang', unit: 'catering', price: 25_000, recipe: [['Shrimp', 0.1], ['Tomato', 0.05], ['Onion', 0.03]] },
  { name: 'Pork Sisig', unit: 'catering', price: 17_000, recipe: [['Pork belly', 0.15], ['Onion', 0.03], ['Calamansi', 0.01]] },
  { name: 'Chicken Lollipop', unit: 'catering', price: 14_000, recipe: [['Chicken, whole', 0.15], ['Flour', 0.02], ['Cooking oil', 0.03]] },
  { name: 'Cheese Sticks', unit: 'catering', price: 6_000, recipe: [['Cheese', 0.03], ['Flour', 0.02], ['Cooking oil', 0.02]] },
  { name: 'Lumpiang Shanghai', unit: 'catering', price: 9_000, recipe: [['Pork belly', 0.08], ['Carrot', 0.02], ['Cooking oil', 0.02]] },
  { name: 'Fruit Platter', unit: 'catering', price: 7_000, recipe: [['Mango', 0.06], ['Banana', 0.06]] },
  { name: 'Dinner Rolls', unit: 'catering', price: 3_000, recipe: [['Flour', 0.05], ['Butter', 0.01], ['Eggs', 0.02]] },
  // Cafe items
  { name: 'Americano', unit: 'cafe', price: 12_000, recipe: [['Coffee beans', 0.018]] },
  { name: 'Cafe Latte', unit: 'cafe', price: 15_000, recipe: [['Coffee beans', 0.018], ['Fresh milk', 0.2]] },
  { name: 'Spanish Latte', unit: 'cafe', price: 16_500, recipe: [['Coffee beans', 0.018], ['Fresh milk', 0.18], ['Sugar', 0.02]] },
  { name: 'Mango Shake', unit: 'cafe', price: 14_000, recipe: [['Mango', 0.15], ['Fresh milk', 0.1], ['Sugar', 0.02]] },
  { name: 'Ensaymada', unit: 'cafe', price: 8_500, recipe: [['Flour', 0.06], ['Butter', 0.02], ['Cheese', 0.02], ['Sugar', 0.02]] },
  { name: 'Chicken Sandwich', unit: 'cafe', price: 18_500, recipe: [['Chicken, whole', 0.12], ['Lettuce', 0.03], ['Tomato', 0.03], ['Flour', 0.05]] },
  { name: 'Pasta Carbonara', unit: 'cafe', price: 21_000, recipe: [['Egg noodles', 0.1], ['Cheese', 0.03], ['Fresh milk', 0.08]] },
  { name: 'Banana Bread', unit: 'cafe', price: 9_000, recipe: [['Banana', 0.08], ['Flour', 0.05], ['Eggs', 0.03], ['Sugar', 0.03]] },
  { name: 'Iced Tea', unit: 'cafe', price: 7_000, recipe: [['Sugar', 0.02], ['Calamansi', 0.005]] },
  { name: 'Hot Chocolate', unit: 'cafe', price: 13_000, recipe: [['Fresh milk', 0.2], ['Sugar', 0.02]] },
  { name: 'Garlic Rice Breakfast', unit: 'cafe', price: 16_000, recipe: [['Jasmine rice', 0.15], ['Garlic', 0.01], ['Eggs', 0.03], ['Pork belly', 0.08]] },
  { name: 'Club Sandwich', unit: 'cafe', price: 19_500, recipe: [['Chicken, whole', 0.1], ['Eggs', 0.03], ['Lettuce', 0.03], ['Flour', 0.05]] },
  { name: 'Fish and Chips', unit: 'cafe', price: 22_000, recipe: [['Bangus', 0.15], ['Potato', 0.15], ['Flour', 0.03], ['Cooking oil', 0.04]] },
  { name: 'Mango Cheesecake', unit: 'cafe', price: 14_500, recipe: [['Mango', 0.06], ['Cheese', 0.05], ['Sugar', 0.03], ['Butter', 0.02]] },
  { name: 'Cappuccino', unit: 'cafe', price: 15_000, recipe: [['Coffee beans', 0.018], ['Fresh milk', 0.15]] },
];

// Packages: name, price per pax (centavos), service style, menu items with portions per pax
export const PACKAGES: { name: string; pricePerPax: number; serviceStyle: string; items: [string, number][] }[] = [
  { name: 'Classic Buffet', pricePerPax: 62_000, serviceStyle: 'buffet', items: [['Chicken Inasal', 1], ['Pork Adobo', 1], ['Pancit Canton', 1], ['Steamed Rice', 1.2], ['Garden Salad', 0.5], ['Leche Flan', 1], ['Iced Tea Pitcher', 0.15]] },
  { name: 'Fiesta Buffet', pricePerPax: 88_000, serviceStyle: 'buffet', items: [['Lechon Kawali', 1], ['Chicken Curry', 1], ['Bangus Belly', 1], ['Pancit Canton', 1], ['Steamed Rice', 1.2], ['Buttered Vegetables', 0.8], ['Mango Float', 1], ['Iced Tea Pitcher', 0.15]] },
  { name: 'Garden Cocktail', pricePerPax: 75_000, serviceStyle: 'cocktail', items: [['Chicken Lollipop', 1.5], ['Cheese Sticks', 1.5], ['Lumpiang Shanghai', 2], ['Pork Sisig', 0.6], ['Fruit Platter', 0.5], ['Banana Turon', 1], ['Iced Tea Pitcher', 0.15]] },
  { name: 'Plated Signature', pricePerPax: 125_000, serviceStyle: 'plated', items: [['Garden Salad', 1], ['Dinner Rolls', 1], ['Beef Steak Tagalog', 1], ['Garlic Shrimp', 1], ['Steamed Rice', 1], ['Mango Cheesecake', 1], ['Iced Tea Pitcher', 0.15]] },
  { name: 'Premium Plated', pricePerPax: 165_000, serviceStyle: 'plated', items: [['Garden Salad', 1], ['Dinner Rolls', 1], ['Shrimp Sinigang', 0.5], ['Beef Caldereta', 1], ['Fish Fillet in Lemon Butter', 1], ['Mac and Cheese', 0.5], ['Leche Flan', 1], ['Mango Float', 1]] },
  { name: 'Merienda Set', pricePerPax: 35_000, serviceStyle: 'buffet', items: [['Pancit Canton', 1], ['Lumpiang Shanghai', 2], ['Banana Turon', 1], ['Cheese Sticks', 1], ['Iced Tea Pitcher', 0.15], ['Dinner Rolls', 1]] },
];

// Staff: name, unit, role, hourly rate (centavos)
export const STAFF: [string, UnitSlug, string, number][] = [
  ['Rowena Dizon', 'events', 'supervisor', 15_000],
  ['Edgar Santos', 'events', 'supervisor', 15_000],
  ['Marites Villanueva', 'catering', 'servers', 9_000],
  ['Jonel Cruz', 'catering', 'servers', 9_000],
  ['Kristine Bautista', 'catering', 'servers', 9_000],
  ['Paolo Reyes', 'catering', 'servers', 9_000],
  ['Angelica Flores', 'catering', 'servers', 9_000],
  ['Dennis Ramos', 'catering', 'servers', 9_000],
  ['Jenny Mendoza', 'catering', 'servers', 9_000],
  ['Rico Garcia', 'catering', 'servers', 9_000],
  ['Lito Aquino', 'catering', 'dishwashers', 8_000],
  ['Mang Berto Castro', 'catering', 'dishwashers', 8_000],
  ['Chef Alvin Torres', 'commissary', 'cooks', 14_000],
  ['Chef Nica Domingo', 'commissary', 'cooks', 14_000],
  ['Jerome Pascual', 'commissary', 'cooks', 11_000],
  ['Rhea Salazar', 'commissary', 'cooks', 11_000],
  ['Boyet Navarro', 'parking', 'parking marshals', 8_000],
  ['Jun Dela Cruz', 'parking', 'parking marshals', 8_000],
  ['Noel Manalo', 'parking', 'parking marshals', 8_000],
  ['Ana Marie Lim', 'cafe', 'barista', 9_500],
  ['Carlo Fernandez', 'cafe', 'barista', 9_500],
  ['Grace Tan', 'cafe', 'cashier', 9_000],
  ['Mark Villar', 'pickleball', 'court attendant', 8_500],
  ['Joy Soriano', 'pickleball', 'court attendant', 8_500],
  ['Noel Lazaro', 'commissary', 'cooks', 11_000],
  ['Tess Marquez', 'catering', 'servers', 9_000],
];

export const FIRST_NAMES = [
  'Maria', 'Jose', 'Juan', 'Ana', 'Pedro', 'Rosa', 'Carlo', 'Liza', 'Ramon', 'Grace',
  'Miguel', 'Teresa', 'Antonio', 'Carmen', 'Rafael', 'Lourdes', 'Francis', 'Cecilia', 'Danilo', 'Marisol',
  'Rodrigo', 'Isabel', 'Benjamin', 'Patricia', 'Emmanuel', 'Dolores', 'Victor', 'Josefina', 'Alfredo', 'Lorna',
  'Arturo', 'Nenita', 'Felipe', 'Beatriz', 'Ernesto', 'Clarissa', 'Gerardo', 'Fe', 'Nestor', 'Imelda',
  'Rolando', 'Vilma', 'Reynaldo', 'Gloria', 'Eduardo', 'Marilou', 'Ricardo', 'Elena', 'Marlon', 'Divina',
  'Jonathan', 'Kristel', 'Christian', 'Jasmine', 'Patrick', 'Nicole', 'Kevin', 'Andrea', 'Ryan', 'Camille',
];

export const SURNAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada',
  'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Aquino', 'Castro', 'Domingo', 'Pascual', 'Salazar', 'Navarro',
  'Dela Cruz', 'Lim', 'Fernandez', 'Tan', 'Villar', 'Soriano', 'Lazaro', 'Marquez', 'Dizon', 'Gonzales',
  'Hernandez', 'Lopez', 'Perez', 'Rivera', 'Alvarez', 'Morales', 'Jimenez', 'Agustin', 'Mercado', 'Padilla',
];

export const COMPANIES = [
  'Rotary Club of Marikina', 'San Roque Parish', 'Lumina Realty Corp.', 'Bayanihan Credit Cooperative',
  'Metro Dental Group', 'Golden Harvest Trading', 'St. Agnes Academy', 'Luzon Logistics Inc.',
  'Sunrise Pharma Distributors', 'Villa Verde Homeowners Association', 'Kabayan Travel and Tours',
  'Pacific Rim BPO Services', 'Barangay Sto. Niño Council', 'Northgate Motors', 'Isla Insurance Brokers',
];

export const APPROVALS = [
  { kind: 'Discount request', unit: 'events', requestedBy: 'Rowena Dizon', amount: 1_500_000 },
  { kind: 'Overtime request', unit: 'catering', requestedBy: 'Marites Villanueva', amount: 480_000 },
  { kind: 'Purchase above limit', unit: 'commissary', requestedBy: 'Chef Alvin Torres', amount: 6_200_000 },
] as const;
