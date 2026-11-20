const DEFAULT_SIMILARITY_THRESHOLD = 0.55;

const normalizeText = (text) => {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
};

const getMeaningfulTokens = (text) => {
    const stopWords = new Set([
        "a", "an", "and", "at", "for", "from", "in", "is", "near",
        "of", "on", "please", "the", "this", "to", "with"
    ]);

    return new Set(
        normalizeText(text)
            .split(/\s+/)
            .filter((token) => token.length > 2 && !stopWords.has(token))
    );
};

const calculateSimilarity = (firstTitle, firstDescription, secondTitle, secondDescription) => {
    const firstTokens = getMeaningfulTokens(`${firstTitle || ""} ${firstDescription || ""}`);
    const secondTokens = getMeaningfulTokens(`${secondTitle || ""} ${secondDescription || ""}`);

    if (firstTokens.size === 0 || secondTokens.size === 0) {
        return 0;
    }

    let intersectionSize = 0;
    for (const token of firstTokens) {
        if (secondTokens.has(token)) {
            intersectionSize += 1;
        }
    }

    const unionSize = new Set([...firstTokens, ...secondTokens]).size;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
};

const findBestDuplicate = (
    candidates,
    title,
    description,
    threshold = DEFAULT_SIMILARITY_THRESHOLD
) => {
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const candidate of candidates) {
        const similarity = calculateSimilarity(
            title,
            description,
            candidate.title,
            candidate.description
        );

        if (similarity >= threshold && similarity > bestSimilarity) {
            bestMatch = candidate;
            bestSimilarity = similarity;
        }
    }

    return bestMatch
        ? { duplicate: bestMatch, similarity: bestSimilarity }
        : null;
};

module.exports = {
    DEFAULT_SIMILARITY_THRESHOLD,
    normalizeText,
    calculateSimilarity,
    findBestDuplicate
};
