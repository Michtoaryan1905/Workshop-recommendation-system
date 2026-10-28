// two-proportion z-test (two-sided) for the A/B comparison
const phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
function zTest(x1, n1, x2, n2) {
  if (!n1 || !n2) return null;
  const p = (x1 + x2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (!se) return null;
  const z = (x2 / n2 - x1 / n1) / se; return +(2 * (1 - phi(Math.abs(z)))).toFixed(4);
}
module.exports = { zTest, phi };
