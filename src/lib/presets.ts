// ---------------------------------------------------------------------------
// Preset data for common 3D printers and materials (prices in AUD)
// ---------------------------------------------------------------------------

export interface PrinterPreset {
  name: string;
  model: string;
  purchasePrice: number;
  lifetimeHours: number;
  powerWatts: number;
  bedSizeX: number;
  bedSizeY: number;
  bedSizeZ: number;
  maintenanceCostPerHour: number;
}

export interface MaterialPreset {
  type: "filament" | "resin";
  materialType: string;
  brand: string;
  colour: string;
  spoolWeightG: number;
  price: number;
  density: number;
}

export const PRINTER_PRESETS: PrinterPreset[] = [
  { name: "Bambu Lab X1 Carbon", model: "X1C", purchasePrice: 1899, lifetimeHours: 8000, powerWatts: 350, bedSizeX: 256, bedSizeY: 256, bedSizeZ: 256, maintenanceCostPerHour: 0.40 },
  { name: "Bambu Lab P1S", model: "P1S", purchasePrice: 949, lifetimeHours: 8000, powerWatts: 350, bedSizeX: 256, bedSizeY: 256, bedSizeZ: 256, maintenanceCostPerHour: 0.35 },
  { name: "Bambu Lab A1 Mini", model: "A1 Mini", purchasePrice: 399, lifetimeHours: 6000, powerWatts: 150, bedSizeX: 180, bedSizeY: 180, bedSizeZ: 180, maintenanceCostPerHour: 0.25 },
  { name: "Bambu Lab A1", model: "A1", purchasePrice: 599, lifetimeHours: 7000, powerWatts: 200, bedSizeX: 256, bedSizeY: 256, bedSizeZ: 256, maintenanceCostPerHour: 0.30 },
  { name: "Creality Ender 3 V3", model: "Ender 3 V3", purchasePrice: 289, lifetimeHours: 5000, powerWatts: 270, bedSizeX: 220, bedSizeY: 220, bedSizeZ: 250, maintenanceCostPerHour: 0.50 },
  { name: "Creality K1 Max", model: "K1 Max", purchasePrice: 899, lifetimeHours: 6000, powerWatts: 350, bedSizeX: 300, bedSizeY: 300, bedSizeZ: 300, maintenanceCostPerHour: 0.40 },
  { name: "Prusa MK4S", model: "MK4S", purchasePrice: 1099, lifetimeHours: 10000, powerWatts: 200, bedSizeX: 250, bedSizeY: 210, bedSizeZ: 220, maintenanceCostPerHour: 0.30 },
  { name: "Prusa XL (Single Tool)", model: "XL", purchasePrice: 2399, lifetimeHours: 10000, powerWatts: 400, bedSizeX: 360, bedSizeY: 360, bedSizeZ: 360, maintenanceCostPerHour: 0.45 },
  { name: "Elegoo Saturn 4 Ultra", model: "Saturn 4 Ultra", purchasePrice: 599, lifetimeHours: 4000, powerWatts: 72, bedSizeX: 218, bedSizeY: 123, bedSizeZ: 260, maintenanceCostPerHour: 0.60 },
];

export const MATERIAL_PRESETS: MaterialPreset[] = [
  { type: "filament", materialType: "PLA", brand: "Bambu Lab", colour: "Black", spoolWeightG: 1000, price: 28, density: 1.24 },
  { type: "filament", materialType: "PLA", brand: "Bambu Lab", colour: "White", spoolWeightG: 1000, price: 28, density: 1.24 },
  { type: "filament", materialType: "PLA", brand: "eSUN", colour: "Black", spoolWeightG: 1000, price: 25, density: 1.24 },
  { type: "filament", materialType: "PETG", brand: "Bambu Lab", colour: "Black", spoolWeightG: 1000, price: 30, density: 1.27 },
  { type: "filament", materialType: "PETG", brand: "eSUN", colour: "Black", spoolWeightG: 1000, price: 28, density: 1.27 },
  { type: "filament", materialType: "ABS", brand: "Bambu Lab", colour: "Black", spoolWeightG: 1000, price: 30, density: 1.04 },
  { type: "filament", materialType: "TPU", brand: "Bambu Lab", colour: "Black", spoolWeightG: 1000, price: 35, density: 1.21 },
  { type: "filament", materialType: "ASA", brand: "Bambu Lab", colour: "Black", spoolWeightG: 1000, price: 33, density: 1.07 },
  { type: "filament", materialType: "Nylon", brand: "Polymaker", colour: "Natural", spoolWeightG: 1000, price: 45, density: 1.14 },
  { type: "filament", materialType: "PLA", brand: "Polymaker", colour: "Various", spoolWeightG: 1000, price: 27, density: 1.24 },
  { type: "resin", materialType: "Standard Resin", brand: "Elegoo", colour: "Grey", spoolWeightG: 1000, price: 35, density: 1.10 },
  { type: "resin", materialType: "ABS-Like Resin", brand: "Elegoo", colour: "Grey", spoolWeightG: 1000, price: 42, density: 1.12 },
];
