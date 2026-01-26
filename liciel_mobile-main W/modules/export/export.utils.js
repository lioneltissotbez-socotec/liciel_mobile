// Padding numérique (Liciel)
const pad = (n, l) => String(n).padStart(l, '0');

// Échappement XML STRICT
// ⚠️ PAS d'entités HTML pour les accents
function escapeXML(s) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Téléchargement de blob (ZIP)
function downloadBlob(filename, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Encode une string en bytes Windows-1252 (CP1252)
function encodeWin1252(str) {
  const s = String(str ?? "");
  const out = new Uint8Array(s.length);

  // table CP1252 pour la zone 0x80–0x9F
  const map = {
    0x20AC: 0x80, // €
    0x201A: 0x82, // ‚
    0x0192: 0x83, // ƒ
    0x201E: 0x84, // „
    0x2026: 0x85, // …
    0x2020: 0x86, // †
    0x2021: 0x87, // ‡
    0x02C6: 0x88, // ˆ
    0x2030: 0x89, // ‰
    0x0160: 0x8A, // Š
    0x2039: 0x8B, // ‹
    0x0152: 0x8C, // Œ
    0x017D: 0x8E, // Ž
    0x2018: 0x91, // ‘
    0x2019: 0x92, // ’
    0x201C: 0x93, // “
    0x201D: 0x94, // ”
    0x2022: 0x95, // •
    0x2013: 0x96, // –
    0x2014: 0x97, // —
    0x02DC: 0x98, // ˜
    0x2122: 0x99, // ™
    0x0161: 0x9A, // š
    0x203A: 0x9B, // ›
    0x0153: 0x9C, // œ
    0x017E: 0x9E, // ž
    0x0178: 0x9F  // Ÿ
  };

  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);

    // ASCII + Latin-1 direct (inclut é=0xE9, è=0xE8, à=0xE0, ç=0xE7, etc.)
    if (code <= 0xFF) {
      out[i] = code;
      continue;
    }

    // zone CP1252 spéciale
    const mapped = map[code];
    out[i] = mapped !== undefined ? mapped : 0x3F; // '?' si non supporté
  }

  return out;
}
