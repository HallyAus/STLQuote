import { describe, it, expect } from "vitest";
import {
  calculateMaterialCost,
  calculateMachineCost,
  calculateLabourCost,
  calculateOverheadCost,
  calculateTotalCost,
  type CalculatorInput,
} from "./calculator";

describe("calculateMaterialCost", () => {
  it("should calculate basic material cost", () => {
    const result = calculateMaterialCost({
      spoolPrice: 30,
      spoolWeightG: 1000,
      printWeightG: 50,
      supportWeightG: 10,
      wasteFactorPct: 10,
    });
    // $30/1000g = $0.03/g × 60g × 1.1 waste = $1.98
    expect(result).toBe(1.98);
  });

  it("should handle zero print weight", () => {
    const result = calculateMaterialCost({
      spoolPrice: 30,
      spoolWeightG: 1000,
      printWeightG: 0,
      supportWeightG: 0,
      wasteFactorPct: 10,
    });
    expect(result).toBe(0);
  });

  it("should handle zero waste factor", () => {
    const result = calculateMaterialCost({
      spoolPrice: 30,
      spoolWeightG: 1000,
      printWeightG: 100,
      supportWeightG: 0,
      wasteFactorPct: 0,
    });
    expect(result).toBe(3.0);
  });
});

describe("calculateMachineCost", () => {
  it("should calculate depreciation + electricity + maintenance", () => {
    const result = calculateMachineCost({
      purchasePrice: 2000,
      lifetimeHours: 5000,
      printTimeMinutes: 120, // 2 hours
      powerWatts: 200,
      electricityRate: 0.3,
      maintenanceCostPerHour: 0.5,
    });
    // Depreciation: $2000/5000h × 2h = $0.80
    // Electricity: 0.2kW × 2h × $0.30 = $0.12
    // Maintenance: $0.50 × 2h = $1.00
    // Total: $1.92
    expect(result).toBe(1.92);
  });

  it("should handle zero print time", () => {
    const result = calculateMachineCost({
      purchasePrice: 2000,
      lifetimeHours: 5000,
      printTimeMinutes: 0,
      powerWatts: 200,
      electricityRate: 0.3,
      maintenanceCostPerHour: 0.5,
    });
    expect(result).toBe(0);
  });
});

describe("calculateLabourCost", () => {
  it("should calculate design + labour time", () => {
    const result = calculateLabourCost({
      designTimeMinutes: 60,
      designRate: 50,
      setupTimeMinutes: 15,
      postProcessingTimeMinutes: 30,
      packingTimeMinutes: 15,
      labourRate: 35,
    });
    // Design: 1h × $50 = $50
    // Labour: 1h × $35 = $35
    // Total: $85
    expect(result).toBe(85.0);
  });

  it("should handle zero times", () => {
    const result = calculateLabourCost({
      designTimeMinutes: 0,
      designRate: 50,
      setupTimeMinutes: 0,
      postProcessingTimeMinutes: 0,
      packingTimeMinutes: 0,
      labourRate: 35,
    });
    expect(result).toBe(0);
  });
});

describe("calculateOverheadCost", () => {
  it("should spread monthly overhead across jobs", () => {
    const result = calculateOverheadCost({
      monthlyOverhead: 200,
      estimatedMonthlyJobs: 20,
    });
    expect(result).toBe(10.0);
  });

  it("should return zero when no jobs estimated", () => {
    const result = calculateOverheadCost({
      monthlyOverhead: 200,
      estimatedMonthlyJobs: 0,
    });
    expect(result).toBe(0);
  });
});

describe("calculateTotalCost", () => {
  const defaultInput: CalculatorInput = {
    material: {
      spoolPrice: 30,
      spoolWeightG: 1000,
      printWeightG: 50,
      supportWeightG: 10,
      wasteFactorPct: 10,
    },
    machine: {
      purchasePrice: 2000,
      lifetimeHours: 5000,
      printTimeMinutes: 120,
      powerWatts: 200,
      electricityRate: 0.3,
      maintenanceCostPerHour: 0.5,
    },
    labour: {
      designTimeMinutes: 0,
      designRate: 50,
      setupTimeMinutes: 15,
      postProcessingTimeMinutes: 15,
      packingTimeMinutes: 10,
      labourRate: 35,
    },
    overhead: {
      monthlyOverhead: 200,
      estimatedMonthlyJobs: 20,
    },
    pricing: {
      markupPct: 50,
      minimumCharge: 15,
      quantity: 1,
      rushMultiplier: 1,
    },
    shipping: {
      shippingCostPerUnit: 0,
      packagingCostPerUnit: 0,
    },
  };

  it("should calculate complete cost breakdown", () => {
    const result = calculateTotalCost(defaultInput);
    expect(result.materialCost).toBe(1.98);
    expect(result.machineCost).toBe(1.92);
    expect(result.overheadCost).toBe(10.0);
    expect(result.subtotal).toBeGreaterThan(0);
    expect(result.markup).toBeGreaterThan(0);
    expect(result.unitPrice).toBeGreaterThan(result.subtotal);
    expect(result.totalPrice).toBe(result.unitPrice * result.quantity);
  });

  it("should apply minimum charge", () => {
    const input: CalculatorInput = {
      ...defaultInput,
      material: { ...defaultInput.material, printWeightG: 1, supportWeightG: 0 },
      machine: { ...defaultInput.machine, printTimeMinutes: 5 },
      labour: {
        ...defaultInput.labour,
        setupTimeMinutes: 0,
        postProcessingTimeMinutes: 0,
        packingTimeMinutes: 0,
      },
      overhead: { monthlyOverhead: 0, estimatedMonthlyJobs: 20 },
      pricing: { ...defaultInput.pricing, minimumCharge: 15 },
    };
    const result = calculateTotalCost(input);
    expect(result.unitPrice).toBeGreaterThanOrEqual(15);
  });

  it("should apply rush multiplier", () => {
    const normalResult = calculateTotalCost(defaultInput);
    const rushInput: CalculatorInput = {
      ...defaultInput,
      pricing: { ...defaultInput.pricing, rushMultiplier: 1.5 },
    };
    const rushResult = calculateTotalCost(rushInput);
    expect(rushResult.rushSurcharge).toBeGreaterThan(0);
    expect(rushResult.unitPrice).toBeGreaterThan(normalResult.unitPrice);
  });

  it("should multiply by quantity", () => {
    const input: CalculatorInput = {
      ...defaultInput,
      pricing: { ...defaultInput.pricing, quantity: 5 },
    };
    const result = calculateTotalCost(input);
    expect(result.quantity).toBe(5);
    expect(result.totalPrice).toBeCloseTo(result.unitPrice * 5, 2);
  });
});
