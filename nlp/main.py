"""
main.py — NLP logic for Tamil AI Travel Planner.
Provides keyword-based intent detection and regex entity extraction.
"""

import re

# ─── Intent keywords ──────────────────────────────────────────────────────────

INTENT_KEYWORDS = {
    "plan_trip": [
        "திட்டமிடு", "பயணம்", "travel", "trip", "plan",
        "செல்ல", "போக", "வர", "பயண திட்டம்",
    ],
    "get_routes": [
        "வழி", "route", "path", "எப்படி போவது", "எந்த வழி",
        "ரூட்", "வழிகள்",
    ],
    "get_budget_trip": [
        "பட்ஜெட்", "budget", "குறைந்த விலை", "cheap", "affordable",
        "சேமிப்பு", "கம்மி", "மலிவான",
    ],
    "get_places": [
        "இடங்கள்", "places", "tourist", "சுற்றுலா இடங்கள்", "பார்க்க",
        "attractions", "sight", "மணிமண்டபம்", "கோவில்",
    ],
}

# ─── Entity extraction ────────────────────────────────────────────────────────

# Known Tamil Nadu cities / places for entity tagging
TAMIL_PLACES = [
    "Chennai", "சென்னை",
    "Madurai", "மதுரை",
    "Coimbatore", "கோயம்புத்தூர்", "கோவை",
    "Trichy", "திருச்சி", "திருச்சிராப்பள்ளி",
    "Salem", "சேலம்",
    "Ooty", "ஊட்டி",
    "Rameswaram", "ராமேஸ்வரம்",
    "Kanyakumari", "கன்னியாகுமரி",
    "Tanjore", "Thanjavur", "தஞ்சாவூர்",
    "Vellore", "வேலூர்",
    "Tiruvallur", "திருவள்ளூர்",
    "Kumbakonam", "கும்பகோணம்",
    "Tiruppur", "திருப்பூர்",
    "Erode", "ஈரோடு",
    "Tirunelveli", "திருநெல்வேலி",
    "Tuticorin", "தூத்துக்குடி",
    "Nagercoil", "நாகர்கோவில்",
    "Dindigul", "திண்டுக்கல்",
    "Cuddalore", "கடலூர்",
    "Pondicherry", "Puducherry", "புதுச்சேரி",
]

# Regex patterns for source city
# Tamil word order: "CITY இருந்து" — city comes BEFORE the postposition
# English word order: "from CITY" — city comes AFTER the preposition
SOURCE_PATTERNS = [
    r"([\w\u0B80-\u0BFF]+)\s+(?:இருந்து|லிருந்து|நகரிலிருந்து)",  # Chennai இருந்து
    r"(?:from)\s+([\w\u0B80-\u0BFF]+)",                              # from Chennai
]

# Regex patterns for destination city
# Tamil word order: "CITY க்கு" — city comes BEFORE the postposition
# English word order: "to CITY" — city comes AFTER the preposition
DEST_PATTERNS = [
    r"([\w\u0B80-\u0BFF]+)\s+(?:க்கு|வரை)",        # Madurai க்கு
    r"(?:to|towards)\s+([\w\u0B80-\u0BFF]+)",        # to Madurai
    r"([\w\u0B80-\u0BFF]+)\s+(?:செல்ல|போக)",        # கோவை செல்ல
]

# Date patterns
DATE_PATTERNS = [
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
    r"\b(\d{4}-\d{2}-\d{2})\b",
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December"
    r"|ஜனவரி|பிப்ரவரி|மார்ச்|ஏப்ரல்|மே|ஜூன்|ஜூலை|ஆகஸ்ட்|செப்டம்பர்|அக்டோபர்|நவம்பர்|டிசம்பர்)"
    r"\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?\b",
    r"\b(tomorrow|today|next week|next month)\b",
]

# Budget patterns
BUDGET_PATTERNS = [
    r"\b(budget|குறைந்த|cheap|affordable|மலிவான|கம்மி)\b",
    r"(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)",
    r"\b(\d+(?:,\d{3})*)\s*(?:rs|rupees|ரூபாய்|ரூ)",
]


def detect_intent(text: str) -> str:
    """
    Returns the best-matching intent for the given text.
    Falls back to 'plan_trip' if nothing matches.
    """
    text_lower = text.lower()
    scores = {intent: 0 for intent in INTENT_KEYWORDS}
    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                scores[intent] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "plan_trip"


def _find_place_in_text(text: str, patterns: list[str]) -> str:
    """
    Tries each pattern; returns the captured group only if it is a known place.
    Falls back to the first captured group if no known-place match is found.
    """
    first_match = ""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            if any(candidate.lower() == p.lower() for p in TAMIL_PLACES):
                return candidate
            if not first_match:
                first_match = candidate
    return ""  # Don't use non-place fallback; rely on _find_known_places instead


def _find_known_places(text: str) -> list[str]:
    """Returns all known Tamil places found in the text (preserving order)."""
    found = []
    text_lower = text.lower()
    for place in TAMIL_PLACES:
        if place.lower() in text_lower and place not in found:
            found.append(place)
    return found


def extract_entities(text: str) -> dict:
    """
    Extracts source, destination, date, and budget from text.
    """
    source = _find_place_in_text(text, SOURCE_PATTERNS)
    destination = _find_place_in_text(text, DEST_PATTERNS)

    # If pattern-based extraction failed, use known-places fallback
    if not source or not destination:
        known = _find_known_places(text)
        if not source and not destination:
            # No places from patterns — assign positionally; a single place defaults
            # to destination (most queries are "go to CITY" with no stated origin)
            if len(known) >= 2:
                source = known[0]
                destination = known[1]
            elif len(known) == 1:
                destination = known[0]
        elif not source:
            for place in known:
                if place != destination:
                    source = place
                    break
        elif not destination:
            for place in known:
                if place != source:
                    destination = place
                    break

    # Date
    date = ""
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            date = m.group(0).strip()
            break

    # Budget
    budget = ""
    for pattern in BUDGET_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            budget = m.group(0).strip()
            break

    return {
        "source": source,
        "destination": destination,
        "date": date,
        "budget": budget,
    }


def process_text(text: str) -> dict:
    """
    Main entry: returns intent + entities for the given text.
    """
    intent = detect_intent(text)
    entities = extract_entities(text)
    return {"intent": intent, "entities": entities}
