"""
Workshop generation endpoint - takes JSON input and generates workshop plan.
"""
import os
import json
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "anthropic/claude-3-haiku"


def build_prompt(data):
    attendee = data.get("attendee", {})
    responses = data.get("responses", [])

    profile_ctx = f"\nEXECUTIVE PROFILE: Name: {attendee.get('name', 'not specified')} | Company: {attendee.get('company', 'not specified')}"
    if attendee.get("title"):
        profile_ctx += f" | Title: {attendee.get('title')}"
    if attendee.get("location"):
        profile_ctx += f" | Location: {attendee.get('location')}"

    brief = "\n\n".join([
        f"{r.get('question', 'Question')}: {r.get('answer', 'Not specified')}"
        for r in responses
    ])

    prompt = f"""You are a world-class business strategy facilitator and executive coach at BX Consulting — a firm that uses responsible AI to deliver exceptional consulting outcomes. Based on this executive pre-discovery interview, design a detailed, executive-calibre half-day discovery workshop.
{profile_ctx}

EXECUTIVE INTERVIEW RESULTS:
{brief}

Design the workshop with these exact sections — be specific, punchy, and connect everything directly to what this executive said. No generic filler. No consulting clichés.

## 1. WORKSHOP TITLE & PURPOSE
Give it a memorable, specific title. Write 2 sharp sentences on exactly what this session exists to accomplish.

## 2. PRE-WORK (Before the Room)
List 3–4 specific things participants must prepare and bring.

## 3. HALF-DAY AGENDA
Include precise timings with 4 focused modules tied to their answers.

## 4. KEY PROVOCATIONS
Write 5 sharp, uncomfortable questions the facilitator should ask.

## 5. WORKSHOP OUTPUTS
List exactly what outputs the room must produce.

## 6. FACILITATION WATCH-OUTS
3 specific dynamics to watch for based on what was revealed.

Use **bold** for key terms. Keep every section tight and actionable."""

    return prompt


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            self._error("Missing OPENROUTER_API_KEY", 500)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode()

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._error("Invalid JSON", 400)
            return

        prompt = build_prompt(data)

        app_url = os.environ.get("APP_URL", "https://bx-discovery.vercel.app")

        try:
            request = Request(
                API_URL,
                data=json.dumps({
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 3000,
                    "temperature": 0.7,
                }).encode(),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": app_url,
                    "X-Title": "BX Discovery App",
                },
                method="POST",
            )

            with urlopen(request) as resp:
                response_data = json.loads(resp.read())

            text = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            self._json({"content": [{"text": text}]})

        except HTTPError as e:
            try:
                error_data = json.loads(e.read())
                message = error_data.get("error", {}).get("message", "API error")
            except Exception:
                message = "API error"
            self._error(message, e.code)

        except URLError as e:
            self._error(f"Network error: {e.reason}", 500)

        except Exception as e:
            self._error(f"Internal server error: {str(e)}", 500)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _error(self, message, status):
        self._json({"error": message}, status)