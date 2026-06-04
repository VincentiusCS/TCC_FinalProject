/**
 * Tests for sawCalculator.js
 * Unit tests + Property-Based Tests (fast-check) untuk kalkulasi SAW dan bonus.
 *
 * Property tags sesuai desain:
 * - Property 21: Kalkulasi sales_score terbatas pada rentang 0–100         (Req 7.1)
 * - Property 22: Kalkulasi transaction_score dengan normalisasi linear      (Req 7.2)
 * - Property 23: Kalkulasi final_score SAW menghasilkan nilai 0–100        (Req 7.3, 7.4, 7.5)
 * - Property 24: Tier bonus deterministik berdasarkan final_score          (Req 8.1–8.8)
 */

const fc = require('fast-check');
const {
  calculateSalesScore,
  calculateTransactionScore,
  calculateFinalScore,
  calculateBonus,
} = require('../services/sawCalculator');

// ---------------------------------------------------------------------------
// calculateSalesScore — Unit Tests
// ---------------------------------------------------------------------------

describe('calculateSalesScore — unit tests', () => {
  test('sales_unit = 0 menghasilkan score 0', () => {
    expect(calculateSalesScore(0)).toBe(0);
  });

  test('sales_unit = 20 menghasilkan score 100 (tepat di batas)', () => {
    expect(calculateSalesScore(20)).toBe(100);
  });

  test('sales_unit = 10 menghasilkan score 50', () => {
    expect(calculateSalesScore(10)).toBe(50);
  });

  test('sales_unit = 30 (melebihi) tetap menghasilkan score 100 (capped)', () => {
    expect(calculateSalesScore(30)).toBe(100);
  });

  test('sales_unit = 1 menghasilkan score 5', () => {
    expect(calculateSalesScore(1)).toBe(5);
  });

  test('sales_unit = 5 menghasilkan score 25', () => {
    expect(calculateSalesScore(5)).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// calculateSalesScore — Property-Based Tests
// ---------------------------------------------------------------------------

// Validates: Requirements 7.1
// Feature: erp-kpi-salesman, Property 21: Kalkulasi sales_score terbatas pada rentang 0–100
describe('calculateSalesScore — property tests', () => {
  test('Property 21: untuk semua salesUnit >= 0, sales_score selalu dalam [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000, noNaN: true }),
        (salesUnit) => {
          const score = calculateSalesScore(salesUnit);
          return score >= 0 && score <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: score meningkat monoton seiring bertambahnya salesUnit (sampai cap)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 19, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (base, delta) => {
          // base < base + delta, keduanya < 20, jadi score ikut naik
          const scoreA = calculateSalesScore(base);
          const scoreB = calculateSalesScore(base + delta);
          return scoreB >= scoreA;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// calculateTransactionScore — Unit Tests
// ---------------------------------------------------------------------------

describe('calculateTransactionScore — unit tests', () => {
  test('avg_transaction < 200.000.000 mengembalikan 1', () => {
    expect(calculateTransactionScore(100_000_000)).toBe(1);
    expect(calculateTransactionScore(0)).toBe(1);
    expect(calculateTransactionScore(199_999_999)).toBe(1);
  });

  test('avg_transaction = 200.000.000 (batas bawah) mengembalikan 1', () => {
    // Tepat di batas bawah: formula → (0/800.000.000)*99+1 = 1
    expect(calculateTransactionScore(200_000_000)).toBe(1);
  });

  test('avg_transaction > 1.000.000.000 mengembalikan 100', () => {
    expect(calculateTransactionScore(1_500_000_000)).toBe(100);
    expect(calculateTransactionScore(2_000_000_000)).toBe(100);
  });

  test('avg_transaction = 1.000.000.000 (batas atas) mengembalikan 100', () => {
    // Tepat di batas atas: formula → (800.000.000/800.000.000)*99+1 = 100
    expect(calculateTransactionScore(1_000_000_000)).toBe(100);
  });

  test('avg_transaction = 600.000.000 (titik tengah) mengembalikan 50.5', () => {
    // ((600M - 200M) / 800M) * 99 + 1 = (400/800)*99+1 = 0.5*99+1 = 49.5+1 = 50.5
    expect(calculateTransactionScore(600_000_000)).toBeCloseTo(50.5, 5);
  });
});

// ---------------------------------------------------------------------------
// calculateTransactionScore — Property-Based Tests
// ---------------------------------------------------------------------------

// Validates: Requirements 7.2
// Feature: erp-kpi-salesman, Property 22: Kalkulasi transaction_score dengan normalisasi linear
describe('calculateTransactionScore — property tests', () => {
  test('Property 22: untuk semua avgTransaction, transaction_score selalu dalam [1, 100]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2_000_000_000, noNaN: true }),
        (avgTransaction) => {
          const score = calculateTransactionScore(avgTransaction);
          return score >= 1 && score <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: nilai di bawah batas bawah selalu menghasilkan 1', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 199_999_999, noNaN: true }),
        (avgTransaction) => {
          return calculateTransactionScore(avgTransaction) === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: nilai di atas batas atas selalu menghasilkan 100', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1_000_000_001, max: 5_000_000_000, noNaN: true }),
        (avgTransaction) => {
          return calculateTransactionScore(avgTransaction) === 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 22: untuk nilai dalam rentang [200M, 1B], score meningkat monoton', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 200_000_000, max: 999_999_999, noNaN: true }),
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),
        (base, delta) => {
          const scoreA = calculateTransactionScore(base);
          const scoreB = calculateTransactionScore(base + delta);
          return scoreB >= scoreA;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// calculateFinalScore — Unit Tests
// ---------------------------------------------------------------------------

describe('calculateFinalScore — unit tests', () => {
  test('semua skor 0 menghasilkan final_score 0', () => {
    // transaction_score min adalah 1, tapi kita uji perhitungan murni
    expect(calculateFinalScore(0, 0, 0, 0)).toBe(0);
  });

  test('semua skor 100 menghasilkan final_score 100', () => {
    expect(calculateFinalScore(100, 100, 100, 100)).toBe(100);
  });

  test('contoh kalkulasi konkret: ss=80, ts=60, as=90, cs=70', () => {
    // (80*0.35) + (60*0.25) + (90*0.20) + (70*0.20)
    // = 28 + 15 + 18 + 14 = 75
    expect(calculateFinalScore(80, 60, 90, 70)).toBeCloseTo(75, 5);
  });

  test('bobot total = 1.0 — final_score sama dengan input jika semua skor sama', () => {
    const score = 65;
    expect(calculateFinalScore(score, score, score, score)).toBeCloseTo(score, 5);
  });

  test('hanya salesScore yang berpengaruh (yang lain 0)', () => {
    expect(calculateFinalScore(100, 0, 0, 0)).toBeCloseTo(35, 5);
  });

  test('hanya transactionScore yang berpengaruh (yang lain 0)', () => {
    expect(calculateFinalScore(0, 100, 0, 0)).toBeCloseTo(25, 5);
  });

  test('hanya attendanceScore yang berpengaruh (yang lain 0)', () => {
    expect(calculateFinalScore(0, 0, 100, 0)).toBeCloseTo(20, 5);
  });

  test('hanya customerSatisfactionScore yang berpengaruh (yang lain 0)', () => {
    expect(calculateFinalScore(0, 0, 0, 100)).toBeCloseTo(20, 5);
  });
});

// ---------------------------------------------------------------------------
// calculateFinalScore — Property-Based Tests
// ---------------------------------------------------------------------------

// Validates: Requirements 7.3, 7.4, 7.5
// Feature: erp-kpi-salesman, Property 23: Kalkulasi final_score SAW menghasilkan nilai 0–100
describe('calculateFinalScore — property tests', () => {
  test('Property 23: untuk semua kombinasi skor valid, final_score selalu dalam [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),   // salesScore
        fc.float({ min: 1, max: 100, noNaN: true }),   // transactionScore
        fc.float({ min: 0, max: 100, noNaN: true }),   // attendanceScore
        fc.float({ min: 0, max: 100, noNaN: true }),   // customerSatisfactionScore
        (ss, ts, as, cs) => {
          const finalScore = calculateFinalScore(ss, ts, as, cs);
          return finalScore >= 0 && finalScore <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23: total bobot = 1.0 — jika semua skor identik maka final_score = skor itu', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        (score) => {
          const finalScore = calculateFinalScore(score, score, score, score);
          return Math.abs(finalScore - score) < 1e-6;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// calculateBonus — Unit Tests
// ---------------------------------------------------------------------------

describe('calculateBonus — unit tests', () => {
  test('finalScore = 100 (maximum) → tier 100%', () => {
    expect(calculateBonus(100)).toEqual({ bonus_percentage: 100, bonus_amount: 2_000_000 });
  });

  test('finalScore = 90 (batas bawah tier 100%) → tier 100%', () => {
    expect(calculateBonus(90)).toEqual({ bonus_percentage: 100, bonus_amount: 2_000_000 });
  });

  test('finalScore = 89.9 → tier 90%', () => {
    expect(calculateBonus(89.9)).toEqual({ bonus_percentage: 90, bonus_amount: 1_800_000 });
  });

  test('finalScore = 80 (batas bawah tier 90%) → tier 90%', () => {
    expect(calculateBonus(80)).toEqual({ bonus_percentage: 90, bonus_amount: 1_800_000 });
  });

  test('finalScore = 79.9 → tier 80%', () => {
    expect(calculateBonus(79.9)).toEqual({ bonus_percentage: 80, bonus_amount: 1_600_000 });
  });

  test('finalScore = 70 (batas bawah tier 80%) → tier 80%', () => {
    expect(calculateBonus(70)).toEqual({ bonus_percentage: 80, bonus_amount: 1_600_000 });
  });

  test('finalScore = 69.9 → tier 70%', () => {
    expect(calculateBonus(69.9)).toEqual({ bonus_percentage: 70, bonus_amount: 1_400_000 });
  });

  test('finalScore = 60 (batas bawah tier 70%) → tier 70%', () => {
    expect(calculateBonus(60)).toEqual({ bonus_percentage: 70, bonus_amount: 1_400_000 });
  });

  test('finalScore = 59.9 → tier 60%', () => {
    expect(calculateBonus(59.9)).toEqual({ bonus_percentage: 60, bonus_amount: 1_200_000 });
  });

  test('finalScore = 50 (batas bawah tier 60%) → tier 60%', () => {
    expect(calculateBonus(50)).toEqual({ bonus_percentage: 60, bonus_amount: 1_200_000 });
  });

  test('finalScore = 49.9 → tier 50%', () => {
    expect(calculateBonus(49.9)).toEqual({ bonus_percentage: 50, bonus_amount: 1_000_000 });
  });

  test('finalScore = 40 (batas bawah tier 50%) → tier 50%', () => {
    expect(calculateBonus(40)).toEqual({ bonus_percentage: 50, bonus_amount: 1_000_000 });
  });

  test('finalScore = 39.9 → tier 0%', () => {
    expect(calculateBonus(39.9)).toEqual({ bonus_percentage: 0, bonus_amount: 0 });
  });

  test('finalScore = 0 (minimum) → tier 0%', () => {
    expect(calculateBonus(0)).toEqual({ bonus_percentage: 0, bonus_amount: 0 });
  });
});

// ---------------------------------------------------------------------------
// calculateBonus — Property-Based Tests
// ---------------------------------------------------------------------------

// Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
// Feature: erp-kpi-salesman, Property 24: Tier bonus deterministik berdasarkan final_score
describe('calculateBonus — property tests', () => {
  // Tabel tier referensi
  const TIERS = [
    { minScore: 90,  maxScore: 100, bonus_percentage: 100, bonus_amount: 2_000_000 },
    { minScore: 80,  maxScore: 90,  bonus_percentage: 90,  bonus_amount: 1_800_000 },
    { minScore: 70,  maxScore: 80,  bonus_percentage: 80,  bonus_amount: 1_600_000 },
    { minScore: 60,  maxScore: 70,  bonus_percentage: 70,  bonus_amount: 1_400_000 },
    { minScore: 50,  maxScore: 60,  bonus_percentage: 60,  bonus_amount: 1_200_000 },
    { minScore: 40,  maxScore: 50,  bonus_percentage: 50,  bonus_amount: 1_000_000 },
    { minScore: 0,   maxScore: 40,  bonus_percentage: 0,   bonus_amount: 0 },
  ];

  test('Property 24: untuk semua final_score dalam [0, 100], bonus sesuai tier yang tepat', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        (finalScore) => {
          const result = calculateBonus(finalScore);
          const expectedTier = TIERS.find(
            (tier) => finalScore >= tier.minScore && finalScore < tier.maxScore
          ) || TIERS[0]; // score = 100 masuk tier pertama (>= 90)

          return (
            result.bonus_percentage === expectedTier.bonus_percentage &&
            result.bonus_amount === expectedTier.bonus_amount
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 24: hasil bonus selalu deterministik — input yang sama menghasilkan output yang sama', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        (finalScore) => {
          const result1 = calculateBonus(finalScore);
          const result2 = calculateBonus(finalScore);
          return (
            result1.bonus_percentage === result2.bonus_percentage &&
            result1.bonus_amount === result2.bonus_amount
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 24: bonus_percentage selalu salah satu dari {0, 50, 60, 70, 80, 90, 100}', () => {
    const validPercentages = new Set([0, 50, 60, 70, 80, 90, 100]);
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        (finalScore) => {
          const { bonus_percentage } = calculateBonus(finalScore);
          return validPercentages.has(bonus_percentage);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 24: bonus_amount selalu salah satu dari {0, 1M, 1.2M, 1.4M, 1.6M, 1.8M, 2M}', () => {
    const validAmounts = new Set([0, 1_000_000, 1_200_000, 1_400_000, 1_600_000, 1_800_000, 2_000_000]);
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        (finalScore) => {
          const { bonus_amount } = calculateBonus(finalScore);
          return validAmounts.has(bonus_amount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
