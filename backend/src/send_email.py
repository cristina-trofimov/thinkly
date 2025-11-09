import os
import requests
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from email_validator import validate_email, EmailNotValidError
from dotenv import load_dotenv



# Load environment variables
load_dotenv()
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
DEFAULT_SENDER_EMAIL = os.getenv("DEFAULT_SENDER_EMAIL")
DEFAULT_SENDER_NAME  = os.getenv("DEFAULT_SENDER_NAME", "My App")

if not BREVO_API_KEY or not DEFAULT_SENDER_EMAIL:
    raise SystemExit("Missing BREVO_API_KEY or DEFAULT_SENDER_EMAIL in environment.")

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"

app = Flask(__name__)

#Ensure recipients is a non-empty list
def validate_recipients(recipients):
    if not isinstance(recipients, list) or not recipients:
        return "Field 'to' must be a non-empty list of recipient emails."
    for r in recipients:
        try:
            validate_email(r)
        except EmailNotValidError as e:
            return f"Invalid recipient '{r}': {e}"
    return None

# Normalize ISO8601 timestamp to UTC with 'Z' suffix
def normalize_iso_utc(iso_str):
    if not iso_str:
        return None
    try:
        s = iso_str.strip()
        if s.endswith("Z"):
            s = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except Exception:
        return None

# --------------------------
# Routes
# --------------------------


ALLOWED_ORIGINS = {"http://localhost:5173","http://127.0.0.1:5173","http://localhost:5173/app/dashboard"}
@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return resp

@app.before_request
def _log_req():
    print(">>", request.method, request.path, "Origin:", request.headers.get("Origin"))
    
    
@app.post("/send-email")
def send_email():

    data = request.get_json(silent=True) or {}
    to_list = data.get("to")
    subject = (data.get("subject") or "").strip()
    text = (data.get("text") or "").strip()
    sender_email = DEFAULT_SENDER_EMAIL
    sender_name  = DEFAULT_SENDER_NAME
    send_at_raw  = data.get("sendAt")

    # Input Validation
    err = validate_recipients(to_list)
    if err:
        return jsonify({"error": err}), 400
    if not subject:
        return jsonify({"error": "Field 'subject' is required."}), 400
    if not text:
        return jsonify({"error": "Provide at least one of 'text'."}), 400
    try:
        validate_email(sender_email)
    except EmailNotValidError as e:
        return jsonify({"error": f"Invalid senderEmail: {e}"}), 400

    scheduledAt = normalize_iso_utc(send_at_raw)
    if send_at_raw and not scheduledAt:
        return jsonify({"error": "Field 'sendAt' must be a valid ISO8601 timestamp (e.g., 2025-10-26T20:00:00Z)."}), 400

    #JSON payload for Brevo
    payload = {
        "sender": {"email": sender_email, "name": sender_name},
        "to": [{"email": r} for r in to_list],
        "subject": subject,
    }

    if text:
        payload["textContent"] = text
    if scheduledAt:
        payload["scheduledAt"] = scheduledAt

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY
    }

    try:
        resp = requests.post(BREVO_SEND_URL, headers=headers, json=payload, timeout=20)
    except requests.RequestException as e:
        return jsonify({"error": "Network error calling Brevo", "detail": str(e)}), 502

    if resp.status_code >= 400:
        detail = None
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        return jsonify({
            "error": "Brevo API error",
            "status": resp.status_code,
            "detail": detail
        }), 502

    return jsonify({"ok": True, "brevo": resp.json(), "scheduledAt": scheduledAt}), 200


@app.get("/health")
def health():
    return {"ok": True}

@app.get("/")
def index():
    return {"ok": True, "endpoints": ["/health", "/send-email"]}



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
