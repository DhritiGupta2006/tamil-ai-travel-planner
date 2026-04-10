"""
main.py — NLP logic for Tamil AI Travel Planner.
Provides keyword-based intent detection and positional entity extraction.
"""

import re
import unicodedata

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
_SOURCE_MARKERS_TAMIL = ["இருந்து", "லிருந்து", "நகரிலிருந்து"]
_SOURCE_MARKERS_NORM = [unicodedata.normalize("NFC", m) for m in _SOURCE_MARKERS_TAMIL]

# Regex patterns for destination city
# Tamil word order: "CITY க்கு" — city comes BEFORE the postposition
# English word order: "to CITY" — city comes AFTER the preposition
_DEST_MARKERS_TAMIL = ["க்கு", "செல்ல", "போக", "வரை"]
_DEST_MARKERS_NORM = [unicodedata.normalize("NFC", m) for m in _DEST_MARKERS_TAMIL]

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


def _normalize(text: str) -> str:
    """Normalize Unicode text to NFC form for consistent Tamil string matching."""
    return unicodedata.normalize("NFC", text)


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
    """Returns all known Tamil places found in the text, ordered by position in text."""
    text_norm = _normalize(text.lower())
    matches = []
    seen: set[str] = set()
    for place in TAMIL_PLACES:
        place_norm = _normalize(place.lower())
        idx = text_norm.find(place_norm)
        if idx != -1 and place not in seen:
            matches.append((idx, place))
            seen.add(place)
    matches.sort(key=lambda x: x[0])
    return [place for _, place in matches]


def _find_source_by_marker(text: str, known_places: list[str]) -> str:
    """
    Find source city using positional markers.
    Tamil pattern: "CITY இருந்து" — the known place that appears just before a
    source marker is the source city.
    English pattern: "from CITY".
    """
    text_norm = _normalize(text)
    places_norm = [_normalize(p) for p in known_places]
    for marker_norm in _SOURCE_MARKERS_NORM:
        idx = text_norm.find(marker_norm)
        if idx != -1:
            before_marker = text_norm[:idx].rstrip()
            for place, place_norm in zip(known_places, places_norm):
                if before_marker.endswith(place_norm):
                    return place
    # English "from CITY"
    m = re.search(r"(?:from)\s+(\S+)", text, re.IGNORECASE)
    if m:
        candidate = _normalize(m.group(1).strip().lower())
        for place, place_norm in zip(known_places, places_norm):
            if _normalize(place.lower()) == candidate:
                return place
    return ""


def _find_dest_by_marker(text: str, known_places: list[str]) -> str:
    """
    Find destination city using positional markers.
    Tamil pattern: "CITY செல்ல / CITY க்கு" — the known place that appears just
    before a destination marker is the destination city.
    English pattern: "to CITY" / "towards CITY".
    """
    text_norm = _normalize(text)
    places_norm = [_normalize(p) for p in known_places]
    for marker_norm in _DEST_MARKERS_NORM:
        idx = text_norm.find(marker_norm)
        if idx != -1:
            before_marker = text_norm[:idx].rstrip()
            for place, place_norm in zip(known_places, places_norm):
                if before_marker.endswith(place_norm):
                    return place
    # English "to CITY" or "towards CITY"
    m = re.search(r"(?:to|towards)\s+(\S+)", text, re.IGNORECASE)
    if m:
        candidate = _normalize(m.group(1).strip().lower())
        for place, place_norm in zip(known_places, places_norm):
            if _normalize(place.lower()) == candidate:
                return place
    return ""


def extract_entities(text: str) -> dict:
    """
    Extracts source, destination, date, and budget from text.
    Uses positional marker logic for Tamil and English postpositions/prepositions,
    with a positional fallback when no markers are present.
    """
    known = _find_known_places(text)

    source = _find_source_by_marker(text, known)
    destination = _find_dest_by_marker(text, known)

    # Fallback: positional assignment when markers didn't resolve both places
    if not source and not destination:
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
