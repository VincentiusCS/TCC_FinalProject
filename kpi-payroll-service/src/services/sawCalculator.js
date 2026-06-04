/**
 * SAW (Simple Additive Weighting) Calculator
 * Pure functions for KPI scoring and bonus calculation.
 * No side effects — all functions are deterministic.
 */

/**
 * Menghitung sales_score dari jumlah unit terjual.
 * Formula: min((salesUnit / 20) * 100, 100)
 *
 * @param {number} salesUnit - Jumlah unit terjual (>= 0)
 * @returns {number} Skor dalam rentang [0, 100]
 */
function calculateSalesScore(salesUnit) {
  const raw = (salesUnit / 20) * 100;
  return Math.min(raw, 100);
}

/**
 * Menghitung transaction_score dari rata-rata nilai transaksi.
 * - avg_transaction < 200.000.000  → score = 1
 * - avg_transaction > 1.000.000.000 → score = 100
 * - Nilai di antara keduanya: normalisasi linear ke rentang [1, 100]
 *
 * @param {number} avgTransaction - Rata-rata nilai transaksi (Rupiah)
 * @returns {number} Skor dalam rentang [1, 100]
 */
function calculateTransactionScore(avgTransaction) {
  const MIN_TRANSACTION = 200_000_000;
  const MAX_TRANSACTION = 1_000_000_000;

  if (avgTransaction < MIN_TRANSACTION) {
    return 1;
  }
  if (avgTransaction > MAX_TRANSACTION) {
    return 100;
  }
  return ((avgTransaction - MIN_TRANSACTION) / (MAX_TRANSACTION - MIN_TRANSACTION)) * 99 + 1;
}

/**
 * Menghitung final_score menggunakan metode SAW dengan bobot:
 * - C1 (sales_score):       0.35
 * - C2 (transaction_score): 0.25
 * - C3 (attendance_score):  0.20
 * - C4 (satisfaction_score): 0.20
 *
 * @param {number} salesScore            - Skor unit penjualan [0, 100]
 * @param {number} transactionScore      - Skor rata-rata transaksi [1, 100]
 * @param {number} attendanceScore       - Skor kehadiran [0, 100]
 * @param {number} customerSatisfactionScore - Skor kepuasan pelanggan [0, 100]
 * @returns {number} Final score dalam rentang [0, 100]
 */
function calculateFinalScore(salesScore, transactionScore, attendanceScore, customerSatisfactionScore) {
  return (salesScore * 0.35) +
         (transactionScore * 0.25) +
         (attendanceScore * 0.20) +
         (customerSatisfactionScore * 0.20);
}

/**
 * Menentukan persentase dan nominal bonus berdasarkan final_score.
 * Tabel tier bonus:
 *  >= 90            → { bonus_percentage: 100, bonus_amount: 2_000_000 }
 *  >= 80 dan < 90   → { bonus_percentage: 90,  bonus_amount: 1_800_000 }
 *  >= 70 dan < 80   → { bonus_percentage: 80,  bonus_amount: 1_600_000 }
 *  >= 60 dan < 70   → { bonus_percentage: 70,  bonus_amount: 1_400_000 }
 *  >= 50 dan < 60   → { bonus_percentage: 60,  bonus_amount: 1_200_000 }
 *  >= 40 dan < 50   → { bonus_percentage: 50,  bonus_amount: 1_000_000 }
 *  < 40             → { bonus_percentage: 0,   bonus_amount: 0 }
 *
 * @param {number} finalScore - Final score dalam rentang [0, 100]
 * @returns {{ bonus_percentage: number, bonus_amount: number }}
 */
function calculateBonus(finalScore) {
  if (finalScore >= 90) {
    return { bonus_percentage: 100, bonus_amount: 2_000_000 };
  }
  if (finalScore >= 80) {
    return { bonus_percentage: 90, bonus_amount: 1_800_000 };
  }
  if (finalScore >= 70) {
    return { bonus_percentage: 80, bonus_amount: 1_600_000 };
  }
  if (finalScore >= 60) {
    return { bonus_percentage: 70, bonus_amount: 1_400_000 };
  }
  if (finalScore >= 50) {
    return { bonus_percentage: 60, bonus_amount: 1_200_000 };
  }
  if (finalScore >= 40) {
    return { bonus_percentage: 50, bonus_amount: 1_000_000 };
  }
  return { bonus_percentage: 0, bonus_amount: 0 };
}

module.exports = {
  calculateSalesScore,
  calculateTransactionScore,
  calculateFinalScore,
  calculateBonus,
};
