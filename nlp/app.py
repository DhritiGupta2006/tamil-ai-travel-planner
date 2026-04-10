"""
app.py — Flask application for the Tamil AI Travel Planner NLP service.
"""

from flask import Flask, request, jsonify
from main import process_text

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/nlp")
def nlp():
    data = request.get_json(silent=True)
    if not data or "text" not in data:
        return jsonify({"error": "Request body must be JSON with a 'text' field"}), 400

    text = data["text"]
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "'text' must be a non-empty string"}), 400

    result = process_text(text.strip())
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
