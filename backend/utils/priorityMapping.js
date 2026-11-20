const CRITICAL_KEYWORDS = [
    "life threatening",
    "accident",
    "collapsed",
    "electrocution",
    "fire",
    "severe flooding",
    "open manhole"
];

const HIGH_KEYWORDS = [
    "major road damage",
    "deep pothole",
    "water pipeline burst",
    "major water leakage",
    "exposed electrical wire",
    "streetlight failure in a dangerous area"
];

const MEDIUM_KEYWORDS = [
    "normal pothole",
    "regular garbage overflow",
    "routine water leakage",
    "non emergency streetlight",
    "non-emergency streetlight"
];

const LOW_KEYWORDS = [
    "minor cleanliness",
    "small maintenance",
    "minor maintenance",
    "small cleanliness issue"
];

const normalizeText = (text) => {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
};

const containsPhrase = (text, phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) {
        return false;
    }

    const escapedPhrase = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^| )${escapedPhrase.replace(/ /g, " ")}(?= |$)`).test(text);
};

const calculatePriority = (category, title, description) => {
    const normalizedText = normalizeText(`${title || ""} ${description || ""}`);

    // Emergency language is checked first. Generic words such as "urgent" are intentionally ignored.
    if (CRITICAL_KEYWORDS.some((keyword) => containsPhrase(normalizedText, keyword))) {
        return "Critical";
    }

    // Major infrastructure phrases indicate high priority.
    if (HIGH_KEYWORDS.some((keyword) => containsPhrase(normalizedText, keyword))) {
        return "High";
    }

    // Minor maintenance phrases indicate low priority.
    if (LOW_KEYWORDS.some((keyword) => containsPhrase(normalizedText, keyword))) {
        return "Low";
    }

    // Normal but actionable issues remain medium.
    if (MEDIUM_KEYWORDS.some((keyword) => containsPhrase(normalizedText, keyword))) {
        return "Medium";
    }

    // Category alone does not determine priority; unmatched descriptions safely default to medium.
    return "Medium";
};

module.exports = {
    calculatePriority,
    CRITICAL_KEYWORDS,
    HIGH_KEYWORDS,
    MEDIUM_KEYWORDS,
    LOW_KEYWORDS
};
