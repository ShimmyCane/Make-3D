/* Make 3D — units. Files store inches. Display: feet and inches to 1/8 inch. Pure JS (Node-testable). */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const EIGHTHS = 8;

  // 36.5 -> "36 1/2" style for inches part; returns string without quote mark
  function fmtInches(inches) {
    const whole = Math.floor(inches);
    let eighths = Math.round((inches - whole) * EIGHTHS);
    let w = whole;
    if (eighths === EIGHTHS) { w += 1; eighths = 0; }
    if (eighths === 0) return String(w);
    let num = eighths, den = EIGHTHS;
    while (num % 2 === 0 && den > 1) { num /= 2; den /= 2; }
    return w === 0 ? `${num}/${den}` : `${w} ${num}/${den}`;
  }

  // Feet and inches, e.g. 36 -> 3′ 0″, 42.5 -> 3′ 6 1/2″, 7.25 -> 7 1/4″
  function fmtFtIn(inches) {
    const sign = inches < 0 ? '-' : '';
    const abs = Math.abs(inches);
    const feet = Math.floor(abs / 12 + 1e-9);
    const rem = abs - feet * 12;
    if (feet === 0) return `${sign}${fmtInches(rem)}″`;
    const inchStr = fmtInches(rem);
    if (inchStr === '0') return `${sign}${feet}′ 0″`;
    return `${sign}${feet}′ ${inchStr}″`;
  }

  function fmtLength(inches, mode) {
    return mode === 'in' ? `${Number(inches.toFixed(3))} in` : fmtFtIn(inches);
  }

  // Parse "7", "3/4", "3 1/2", "3' 6\"", "3ft 6in", "7'" into inches. NaN if unreadable.
  function parseFrac(str) {
    const s = str.trim();
    if (s === '') return 0;
    let m = s.match(/^(-?\d+(?:\.\d+)?)(?:[\s-]+(\d+)\/(\d+))?$/);
    if (m) {
      const v = parseFloat(m[1]);
      if (m[2] !== undefined) {
        const f = parseInt(m[2], 10) / parseInt(m[3], 10);
        return v < 0 ? v - f : v + f;
      }
      return v;
    }
    m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);
    return NaN;
  }

  function parseLength(input) {
    if (typeof input === 'number') return input;
    if (input == null) return NaN;
    const s = String(input).trim().toLowerCase().replace(/″/g, '"').replace(/′/g, "'");
    if (s === '') return NaN;
    const ft = s.match(/^(.*?)\s*(?:'|ft\b|feet\b)\s*(.*)$/);
    if (ft) {
      const feet = ft[1].trim() === '' ? 0 : parseFrac(ft[1]);
      const rest = ft[2].replace(/(in|inch|inches|")$/, '').trim();
      const inch = rest === '' ? 0 : parseFrac(rest);
      if (Number.isNaN(feet) || Number.isNaN(inch)) return NaN;
      return feet * 12 + inch;
    }
    const inch = parseFrac(s.replace(/(in|inch|inches|")$/, '').trim());
    return inch;
  }

  return { fmtInches, fmtFtIn, fmtLength, parseLength };
});
