const { GoogleGenAI } = require("@google/genai");

const allowedCategories = [
    "Road",
    "Garbage",
    "Water",
    "Streetlight",
    "Other"
];

const allowedPriorities = [
    "Low",
    "Medium",
    "High",
    "Critical"
];

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const maxImageSize = 5 * 1024 * 1024;
const modelName = "gemini-3.1-flash-lite";

const ClassificationError = class extends Error {
    constructor(message, code) {
        super(message);
        this.name = "ImageClassificationError";
        this.code = code;
    }
};

const parseJsonResponse = (text) => {
    if (typeof text !== "string" || !text.trim()) {
        throw new ClassificationError(
            "The image classification response was empty",
            "MALFORMED_CLASSIFICATION_RESPONSE"
        );
    }

    const normalizedText = text.trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

    try {
        return JSON.parse(normalizedText);
    } catch (error) {
        throw new ClassificationError(
            "The image classification response was not valid JSON",
            "MALFORMED_CLASSIFICATION_RESPONSE"
        );
    }
};

const classifyCivicImage = async (imageBuffer, mimeType) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new ClassificationError(
            "A valid image buffer is required",
            "INVALID_IMAGE"
        );
    }

    if (imageBuffer.length > maxImageSize) {
        throw new ClassificationError(
            "Image size must not exceed 5 MB",
            "IMAGE_TOO_LARGE"
        );
    }

    if (!allowedMimeTypes.includes(mimeType)) {
        throw new ClassificationError(
            "Only JPEG, PNG and WebP images are supported",
            "INVALID_IMAGE_TYPE"
        );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new ClassificationError(
            "Gemini image classification is not configured",
            "CLASSIFICATION_NOT_CONFIGURED"
        );
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: [
                                "Classify this civic complaint image.",
                                "Choose exactly one category:",
                                allowedCategories.join(", "),
                                "Return a JSON object with:",
                                "- suggestedCategory: exactly one allowed category",
                                "- confidence: a number from 0 to 1",
                                "- reason: a short explanation",
                                "Do not use Markdown."
                            ].join("\n")
                        },
                        {
                            inlineData: {
                                mimeType,
                                data: imageBuffer.toString("base64")
                            }
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "object",
                    properties: {
                        suggestedCategory: {
                            type: "string",
                            enum: allowedCategories
                        },
                        confidence: {
                            type: "number",
                            minimum: 0,
                            maximum: 1
                        },
                        reason: {
                            type: "string"
                        }
                    },
                    required: ["suggestedCategory", "confidence", "reason"]
                }
            }
        });

        const parsed = parseJsonResponse(response.text);

        if (!allowedCategories.includes(parsed.suggestedCategory)) {
            throw new ClassificationError(
                "Gemini returned an invalid complaint category",
                "INVALID_CLASSIFICATION_CATEGORY"
            );
        }

        if (
            typeof parsed.confidence !== "number" ||
            !Number.isFinite(parsed.confidence) ||
            parsed.confidence < 0 ||
            parsed.confidence > 1
        ) {
            throw new ClassificationError(
                "Gemini returned an invalid confidence score",
                "INVALID_CLASSIFICATION_CONFIDENCE"
            );
        }

        if (typeof parsed.reason !== "string" || !parsed.reason.trim()) {
            throw new ClassificationError(
                "Gemini returned no valid classification reason",
                "INVALID_CLASSIFICATION_REASON"
            );
        }

        return {
            suggestedCategory: parsed.suggestedCategory,
            confidence: parsed.confidence,
            reason: parsed.reason.trim()
        };
    } catch (error) {
        if (error instanceof ClassificationError) {
            throw error;
        }

        throw new ClassificationError(
            "Unable to classify the complaint image",
            "CLASSIFICATION_API_ERROR"
        );
    }
};

const predictComplaintPriority = async (
    title,
    description,
    category,
    imageBuffer,
    mimeType
) => {
    if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !description.trim() ||
        !allowedCategories.includes(category)
    ) {
        throw new ClassificationError(
            "Valid title, description and category are required",
            "INVALID_PRIORITY_INPUT"
        );
    }

    if (imageBuffer && !Buffer.isBuffer(imageBuffer)) {
        throw new ClassificationError(
            "A valid image buffer is required",
            "INVALID_IMAGE"
        );
    }

    if (imageBuffer && imageBuffer.length === 0) {
        throw new ClassificationError(
            "A valid image buffer is required",
            "INVALID_IMAGE"
        );
    }

    if (imageBuffer && imageBuffer.length > maxImageSize) {
        throw new ClassificationError(
            "Image size must not exceed 5 MB",
            "IMAGE_TOO_LARGE"
        );
    }

    if (imageBuffer && !allowedMimeTypes.includes(mimeType)) {
        throw new ClassificationError(
            "Only JPEG, PNG and WebP images are supported",
            "INVALID_IMAGE_TYPE"
        );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new ClassificationError(
            "Gemini priority prediction is not configured",
            "PRIORITY_PREDICTION_NOT_CONFIGURED"
        );
    }

    try {
        const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
                timeout: 30000,
                retryOptions: {
                    attempts: 0
                }
            }
        });

        const parts = [
            {
                text: [
                    "Predict the urgency priority of this civic complaint.",
                    `Title: ${title.trim()}`,
                    `Description: ${description.trim()}`,
                    `Category: ${category}`,
                    "Choose exactly one priority:",
                    allowedPriorities.join(", "),
                    "Use Critical only for immediate danger or life-threatening emergencies.",
                    "Use High for major infrastructure damage or serious public safety risks.",
                    "Use Low for minor cleanliness or small maintenance issues.",
                    "Use Medium for normal actionable complaints or when uncertain.",
                    "Return JSON with suggestedPriority, confidence from 0 to 1, and a short reason.",
                    "Do not use Markdown."
                ].join("\n")
            }
        ];

        if (imageBuffer) {
            parts.push({
                inlineData: {
                    mimeType,
                    data: imageBuffer.toString("base64")
                }
            });
        }

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: "user",
                    parts
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "object",
                    properties: {
                        suggestedPriority: {
                            type: "string",
                            enum: allowedPriorities
                        },
                        confidence: {
                            type: "number",
                            minimum: 0,
                            maximum: 1
                        },
                        reason: {
                            type: "string"
                        }
                    },
                    required: ["suggestedPriority", "confidence", "reason"]
                }
            }
        });

        const parsed = parseJsonResponse(response.text);

        if (!allowedPriorities.includes(parsed.suggestedPriority)) {
            throw new ClassificationError(
                "Gemini returned an invalid priority",
                "INVALID_PRIORITY_RESPONSE"
            );
        }

        if (
            typeof parsed.confidence !== "number" ||
            !Number.isFinite(parsed.confidence) ||
            parsed.confidence < 0 ||
            parsed.confidence > 1
        ) {
            throw new ClassificationError(
                "Gemini returned an invalid confidence score",
                "INVALID_PRIORITY_CONFIDENCE"
            );
        }

        if (typeof parsed.reason !== "string" || !parsed.reason.trim()) {
            throw new ClassificationError(
                "Gemini returned no valid priority reason",
                "INVALID_PRIORITY_REASON"
            );
        }

        return {
            suggestedPriority: parsed.suggestedPriority,
            confidence: parsed.confidence,
            reason: parsed.reason.trim()
        };
    } catch (error) {
        if (error instanceof ClassificationError) {
            throw error;
        }

        throw new ClassificationError(
            "Unable to predict complaint priority",
            "PRIORITY_PREDICTION_API_ERROR"
        );
    }
};

module.exports = {
    classifyCivicImage,
    predictComplaintPriority,
    ClassificationError
};
