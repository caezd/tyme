import { isElement as isEl, pad } from "./utils.js";
/**
 * Tyme v0.1 — Normalisateur de dates pour Forumactif
 * API :
 *    Tyme('8 juin 2025').fromNow()
 *    Tyme('01/03/25, 10:48 pm').parseToFormat('YYYY-MM-DD HH:mm')
 *    new Tyme(element).parseToFormat('DD/MM/YYYY')
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format
 */

function formatDate(date, fmt = "YYYY-MM-DD HH:mm") {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const Y = date.getFullYear();
    const M = date.getMonth() + 1;
    const D = date.getDate();
    const H24 = date.getHours();
    const H12 = ((H24 + 11) % 12) + 1;
    const m = date.getMinutes();
    const s = date.getSeconds();
    const ampm = H24 < 12 ? "am" : "pm";
    return fmt
        .replace(/YYYY/g, String(Y))
        .replace(/YY/g, String(Y).slice(-2))
        .replace(/MM/g, pad(M))
        .replace(/M(?![a-zA-Z])/g, String(M))
        .replace(/DD/g, pad(D))
        .replace(/D(?![a-zA-Z])/g, String(D))
        .replace(/HH/g, pad(H24))
        .replace(/H(?![a-zA-Z])/g, String(H24))
        .replace(/hh/g, pad(H12))
        .replace(/h(?![a-zA-Z])/g, String(H12))
        .replace(/mm/g, pad(m))
        .replace(/m(?![a-zA-Z])/g, String(m))
        .replace(/ss/g, pad(s))
        .replace(/s(?![a-zA-Z])/g, String(s))
        .replace(/A/g, ampm.toUpperCase())
        .replace(/a/g, ampm);
}

// ---------- Relative time ----------
const RTF_CACHE = new Map();
const getRTF = (locale) => {
    if (!RTF_CACHE.has(locale)) {
        RTF_CACHE.set(
            locale,
            new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
        );
    }
    return RTF_CACHE.get(locale);
};

function fromNow(date, { locale = "fr-CA", now = () => new Date() } = {}) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const rtf = getRTF(locale);
    const diffSec = Math.round((date.getTime() - now().getTime()) / 1000);
    const abs = Math.abs(diffSec);
    const MIN = 60,
        H = 3600,
        D = 86400,
        W = 604800,
        M = 2592000,
        Y = 31536000;

    if (abs < 45) return rtf.format(diffSec, "second");
    if (abs < 90) return rtf.format(Math.round(diffSec / MIN), "minute");
    if (abs < 45 * MIN) return rtf.format(Math.round(diffSec / MIN), "minute");
    if (abs < 90 * MIN) return rtf.format(Math.round(diffSec / H), "hour");
    if (abs < 22 * H) return rtf.format(Math.round(diffSec / H), "hour");
    if (abs < 36 * H) return rtf.format(Math.round(diffSec / D), "day");
    if (abs < 25 * D) return rtf.format(Math.round(diffSec / D), "day");
    if (abs < 45 * D) return rtf.format(Math.round(diffSec / W), "week");
    if (abs < 345 * D) return rtf.format(Math.round(diffSec / M), "month");
    return rtf.format(Math.round(diffSec / Y), "year");
}

// ---------- Parsing (reprend TOUT + “date seule”) ----------
function parseMonth(monthStr) {
    const m = String(monthStr || "").toLowerCase();
    const months = {
        jan: 0,
        january: 0,
        janv: 0,
        feb: 1,
        february: 1,
        févr: 1,
        mar: 2,
        march: 2,
        mars: 2,
        apr: 3,
        april: 3,
        avr: 3,
        may: 4,
        mai: 4,
        jun: 5,
        june: 5,
        juin: 5,
        jul: 6,
        july: 6,
        juil: 6,
        aug: 7,
        august: 7,
        août: 7,
        sep: 8,
        sept: 8,
        september: 8,
        oct: 9,
        october: 9,
        nov: 10,
        november: 10,
        dec: 11,
        december: 11,
        déc: 11,
        decembre: 11,
    };
    return months[m] ?? 0;
}

const APOS = "['’]"; // apostrophe droite ou typographique
const AT = "(?:a|à)"; // tolère 'a' non accentué
const toInt = (x) => parseInt(x, 10);
const baseYMD = (offsetDays = 0) => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    n.setDate(n.getDate() + offsetDays);
    return n;
};
const withTime = (base, h, min, sec = 0, ap) => {
    let H = toInt(h),
        M = toInt(min),
        S = sec ? toInt(sec) : 0;
    if (ap) {
        const ampm = ap.toLowerCase();
        if (ampm === "pm" && H < 12) H += 12;
        if (ampm === "am" && H === 12) H = 0;
    }
    base.setHours(H, M, S, 0);
    return base;
};

// Tous les formats Forumactif + variantes “date seule”
const PATTERNS = [
    // "Aujourd'hui à 12:40" / "Aujourd’hui 12:40:33" / AM/PM toléré
    {
        regex: new RegExp(
            `^aujourd${APOS}hui\\s*(?:[, ]+)?\\s*(?:${AT})?\\s*(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*([ap]m)?$`,
            "i"
        ),
        process: (m) => withTime(baseYMD(0), m[1], m[2], m[3], m[4]),
    },
    // "Hier à 08:05" / "hier 8:05 pm"
    {
        regex: new RegExp(
            `^hier\\s*(?:[, ]+)?\\s*(?:${AT})?\\s*(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*([ap]m)?$`,
            "i"
        ),
        process: (m) => withTime(baseYMD(-1), m[1], m[2], m[3], m[4]),
    },
    // (optionnels) sans heure → minuit
    {
        regex: new RegExp(`^aujourd${APOS}hui$`, "i"),
        process: () => baseYMD(0),
    },
    { regex: /^hier$/i, process: () => baseYMD(-1) },
    // D j M Y - G:i
    {
        regex: /^(\d{1,2})\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4})\s*[-,]\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[3], parseMonth(m[2]), +m[1], +m[4], +m[5]),
    },
    // D j M - G:i  (année courante)
    {
        regex: /^(\d{1,2})\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s*[-,]\s*(\d{1,2}):(\d{2})$/,
        process: (m) =>
            new Date(
                new Date().getFullYear(),
                parseMonth(m[2]),
                +m[1],
                +m[3],
                +m[4]
            ),
    },
    // D j M Y - G:i:s
    {
        regex: /^(\d{1,2})\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4})\s*[-,]\s*(\d{1,2}):(\d{2}):(\d{2})$/,
        process: (m) =>
            new Date(+m[3], parseMonth(m[2]), +m[1], +m[4], +m[5], +m[6]),
    },
    // D j M Y - H:i:s a
    {
        regex: /^(\d{1,2})\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4})\s*[-,]\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[7].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[3], parseMonth(m[2]), +m[1], h, +m[5], +m[6]);
        },
    },
    // d.m.y G:i
    {
        regex: /^(\d{2})\.(\d{2})\.(\d{2})\s+(\d{1,2}):(\d{2})$/,
        process: (m) => {
            let yr = +m[3];
            yr += yr < 50 ? 2000 : 1900;
            return new Date(yr, +m[2] - 1, +m[1], +m[4], +m[5]);
        },
    },
    // d/m/y, h:i a
    {
        regex: /^(\d{2})\/(\d{2})\/(\d{2}),\s*(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let yr = +m[3];
            yr += yr < 50 ? 2000 : 1900;
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(yr, +m[2] - 1, +m[1], h, +m[5]);
        },
    },
    // D d M Y, g:i a
    {
        regex: /^(\d{1,2})\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4}),\s*(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[3], parseMonth(m[2]), +m[1], h, +m[5]);
        },
    },
    // D d M Y, H:i
    {
        regex: /^(\d{1,2})\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4}),\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[3], parseMonth(m[2]), +m[1], +m[4], +m[5]),
    },
    // D M d, Y g:i a
    {
        regex: /^([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[3], parseMonth(m[1]), +m[2], h, +m[5]);
        },
    },
    // D M d Y, H:i
    {
        regex: /^([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{1,2})\s+(\d{4}),\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[3], parseMonth(m[1]), +m[2], +m[4], +m[5]),
    },
    // jS F Y, g:i a
    {
        regex: /^(\d{1,2})\s+[a-z]{2}\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4}),\s*(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[3], parseMonth(m[2]), +m[1], h, +m[5]);
        },
    },
    // jS F Y, H:i
    {
        regex: /^(\d{1,2})\s+[a-z]{2}\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4}),\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[3], parseMonth(m[2]), +m[1], +m[4], +m[5]),
    },
    // F jS Y, g:i a
    {
        regex: /^([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{1,2})\s*[a-z]{2}\s+(\d{4}),\s*(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[3], parseMonth(m[1]), +m[2], h, +m[5]);
        },
    },
    // F jS Y, H:i
    {
        regex: /^([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{1,2})\s*[a-z]{2}\s+(\d{4}),\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[3], parseMonth(m[1]), +m[2], +m[4], +m[5]),
    },
    // j/n/Y, g:i a
    {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[3], +m[2] - 1, +m[1], h, +m[5]);
        },
    },
    // j/n/Y, H:i
    {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]),
    },
    // n/j/Y, g:i a
    {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[3], +m[1] - 1, +m[2], h, +m[5]);
        },
    },
    // n/j/Y, H:i
    {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5]),
    },
    // Y-m-d, g:i a
    {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2}),\s*(\d{1,2}):(\d{2})\s*([ap]m)$/i,
        process: (m) => {
            let h = +m[4];
            const ap = m[6].toLowerCase();
            if (ap === "pm" && h < 12) h += 12;
            if (ap === "am" && h === 12) h = 0;
            return new Date(+m[1], +m[2] - 1, +m[3], h, +m[5]);
        },
    },
    // Y-m-d, H:i
    {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2}),\s*(\d{1,2}):(\d{2})$/,
        process: (m) => new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]),
    },
    // Y-m-d, H:i:s
    {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2}),\s*(\d{1,2}):(\d{2}):(\d{2})$/,
        process: (m) => new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]),
    },

    // ---- Ajouts “date seule” (sans heure) :
    // j M Y    => "8 juin 2025"
    {
        regex: /^(\d{1,2})\s+([A-Za-zéûÀ-ÖØ-öø-ÿ]+)\s+(\d{4})$/,
        process: (m) => new Date(+m[3], parseMonth(m[2]), +m[1], 0, 0, 0, 0),
    },
    // Y-m-d    => "2025-06-08"
    {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        process: (m) => new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0),
    },
    // d.m.y    => "08.06.25"
    {
        regex: /^(\d{2})\.(\d{2})\.(\d{2})$/,
        process: (m) => {
            let yr = +m[3];
            yr += yr < 50 ? 2000 : 1900;
            return new Date(yr, +m[2] - 1, +m[1], 0, 0, 0, 0);
        },
    },
    // d/m/Y    => "08/06/2025"
    {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        process: (m) => new Date(+m[3], +m[2] - 1, +m[1], 0, 0, 0, 0),
    },
    // n/j/Y    => "6/8/2025"
    {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        process: (m) => new Date(+m[3], +m[1] - 1, +m[2], 0, 0, 0, 0),
    },
];

function preClean(str) {
    return String(str || "")
        .trim()
        .replace(
            /^(?:(?:lun(?:di)?|mar(?:di)?|mer(?:credi)?|jeu(?:di)?|ven(?:dredi)?|sam(?:edi)?|dim(?:anche)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)[\.,]?\s+)/i,
            ""
        )
        .replace(/(\d+)(st|nd|rd|th)/gi, "$1");
}

function parseInput(input) {
    if (input instanceof Date) return input;
    const raw =
        typeof input === "string"
            ? input
            : isEl(input)
            ? input.textContent || ""
            : String(input ?? "");
    const s = preClean(raw);
    for (const { regex, process } of PATTERNS) {
        const m = s.match(regex);
        if (m) {
            const d = process(m);
            if (d instanceof Date && !isNaN(d)) return d;
        }
    }
    // fallback permissif
    const d2 = new Date(s);
    return isNaN(d2) ? new Date(NaN) : d2;
}

function makeFacade(date, opts = {}) {
    return {
        parseToFormat: (fmt) => formatDate(date, fmt),
        fromNow: () => fromNow(date, opts),
    };
}

// ---------- API principale ----------
function Tyme(input, opts = {}) {
    if (!(this instanceof Tyme)) {
        return makeFacade(parseInput(input), opts);
    }
    const fac = makeFacade(parseInput(input), opts);
    this.parseToFormat = fac.parseToFormat;
    this.fromNow = fac.fromNow;
}

Tyme.parse = parseInput;
Tyme.format = formatDate; // utilitaire si besoin
Tyme.fromNow = (input, opts) => fromNow(parseInput(input), opts);

export default Tyme;
