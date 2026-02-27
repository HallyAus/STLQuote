import { roundCurrency } from "./utils";
import { type BatchTier, applyBatchDiscount } from "./batch-pricing";

// --- Input types ---

export interface MaterialCostInput {
  /** Price per spool/bottle in AUD */
  spoolPrice: number;
  /** Spool weight in grams */
  spoolWeightG: number;
  /** Print weight in grams (from slicer) */
  printWeightG: number;
  /** Support material weight in grams */
  supportWeightG: number;
  /** Waste/failure factor as percentage (e.g., 10 = 10%) */
  wasteFactorPct: number;
}

export interface MachineCostInput {
  /** Printer purchase price */
  purchasePrice: number;
  /** Expected lifetime in hours */
  lifetimeHours: number;
  /** Print time in minutes (from slicer) */
  printTimeMinutes: number;
  /** Power consumption in watts */
  powerWatts: number;
  /** Electricity rate in $/kWh */
  electricityRate: number;
  /** Maintenance cost per hour */
  maintenanceCostPerHour: number;
}

export interface LabourCostInput {
  /** Design time in minutes */
  designTimeMinutes: number;
  /** Design hourly rate */
  designRate: number;
  /** Setup/prep time in minutes */
  setupTimeMinutes: number;
  /** Post-processing time in minutes */
  postProcessingTimeMinutes: number;
  /** Packing/shipping time in minutes */
  packingTimeMinutes: number;
  /** Labour hourly rate */
  labourRate: number;
}

export interface OverheadCostInput {
  /** Total monthly overhead costs */
  monthlyOverhead: number;
  /** Estimated jobs per month */
  estimatedMonthlyJobs: number;
}

export interface ShippingCostInput {
  /** Flat shipping cost per unit */
  shippingCostPerUnit: number;
  /** Packaging material cost per unit (boxes, tape, bubble wrap, etc.) */
  packagingCostPerUnit: number;
}

export interface PricingInput {
  /** Markup percentage (e.g., 50 = 50%) */
  markupPct: number;
  /** Minimum charge threshold */
  minimumCharge: number;
  /** Quantity */
  quantity: number;
  /** Rush job multiplier (e.g., 1.5 = 50% surcharge) */
  rushMultiplier: number;
}

export interface CalculatorInput {
  material: MaterialCostInput;
  machine: MachineCostInput;
  labour: LabourCostInput;
  overhead: OverheadCostInput;
  pricing: PricingInput;
  shipping: ShippingCostInput;
}

// --- Output types ---

export interface CostBreakdown {
  materialCost: number;
  machineCost: number;
  labourCost: number;
  overheadCost: number;
  shippingCost: number;
  packagingCost: number;
  subtotal: number;
  markup: number;
  rushSurcharge: number;
  unitPrice: number;
  totalPrice: number;
  quantity: number;
  pricePerUnit: number;
  batchDiscount: number;
  batchDiscountPct: number;
}

// --- Calculator functions ---

export function calculateMaterialCost(input: MaterialCostInput): number {
  const pricePerGram = input.spoolPrice / input.spoolWeightG;
  const totalWeight = input.printWeightG + input.supportWeightG;
  const wasteMultiplier = 1 + input.wasteFactorPct / 100;
  return roundCurrency(pricePerGram * totalWeight * wasteMultiplier);
}

export function calculateMachineCost(input: MachineCostInput): number {
  const printTimeHours = input.printTimeMinutes / 60;
  const depreciation = (input.purchasePrice / input.lifetimeHours) * printTimeHours;
  const electricityCost = (input.powerWatts / 1000) * printTimeHours * input.electricityRate;
  const maintenance = input.maintenanceCostPerHour * printTimeHours;
  return roundCurrency(depreciation + electricityCost + maintenance);
}

export function calculateLabourCost(input: LabourCostInput): number {
  const designCost = (input.designTimeMinutes / 60) * input.designRate;
  const labourMinutes =
    input.setupTimeMinutes +
    input.postProcessingTimeMinutes +
    input.packingTimeMinutes;
  const labourCost = (labourMinutes / 60) * input.labourRate;
  return roundCurrency(designCost + labourCost);
}

export function calculateOverheadCost(input: OverheadCostInput): number {
  if (input.estimatedMonthlyJobs <= 0) return 0;
  return roundCurrency(input.monthlyOverhead / input.estimatedMonthlyJobs);
}

export function calculateTotalCost(
  input: CalculatorInput,
  batchTiers?: BatchTier[] | null
): CostBreakdown {
  const materialCost = calculateMaterialCost(input.material);
  const machineCost = calculateMachineCost(input.machine);
  const labourCost = calculateLabourCost(input.labour);
  const overheadCost = calculateOverheadCost(input.overhead);

  // Shipping & packaging are per-unit flat costs (not subject to markup)
  const shippingCost = roundCurrency(input.shipping.shippingCostPerUnit);
  const packagingCost = roundCurrency(input.shipping.packagingCostPerUnit);

  const subtotal = materialCost + machineCost + labourCost + overheadCost;
  const markup = roundCurrency(subtotal * (input.pricing.markupPct / 100));
  const priceBeforeRush = subtotal + markup;

  const rushSurcharge =
    input.pricing.rushMultiplier > 1
      ? roundCurrency(priceBeforeRush * (input.pricing.rushMultiplier - 1))
      : 0;

  // Unit price = production costs + markup + rush, plus shipping & packaging
  let unitPrice = roundCurrency(priceBeforeRush + rushSurcharge + shippingCost + packagingCost);

  // Apply minimum charge
  if (unitPrice < input.pricing.minimumCharge) {
    unitPrice = input.pricing.minimumCharge;
  }

  const quantity = Math.max(1, input.pricing.quantity);
  const totalBeforeDiscount = roundCurrency(unitPrice * quantity);

  // Apply batch discount
  const batch = applyBatchDiscount(totalBeforeDiscount, quantity, batchTiers ?? null);

  return {
    materialCost,
    machineCost,
    labourCost,
    overheadCost,
    shippingCost,
    packagingCost,
    subtotal,
    markup,
    rushSurcharge,
    unitPrice,
    totalPrice: batch.finalPrice,
    quantity,
    pricePerUnit: unitPrice,
    batchDiscount: batch.discountAmount,
    batchDiscountPct: batch.discountPct,
  };
}
