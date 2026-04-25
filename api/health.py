"""
Health check endpoint for OPENROUTER_API_KEY.
"""
import os
import json
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

API_URL = "https://openrouter.ai/api/v1/auth/key"


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        api_key = os.environ.get("OPENROUTER_API_KEY")
        
        if not api_key:
            self._json({
                "status": "unhealthy",
                "api_key_set": False,
                "error": "OPENROUTER_API_KEY not configured"
            }, 200)
            return

        app_url = os.environ.get("APP_URL", "https://bx-discovery.vercel.app")

        try:
            request = Request(
                API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": app_url,
                    "X-Title": "BX Discovery App",
                },
                method="GET",
            )

            with urlopen(request) as resp:
                response_data = json.loads(resp.read())

            if response_data.get("data", {}).get("disabled"):
                self._json({
                    "status": "unhealthy",
                    "api_key_set": True,
                    "error": "API key is disabled"
                }, 200)
            else:
                self._json({
                    "status": "healthy",
                    "api_key_set": True,
                    "key_id": response_data.get("data", {}).get("key_id", "unknown")[:12] + "..."
                }, 200)

        except HTTPError as e:
            try:
                error_data = json.loads(e.read())
                message = error_data.get("error", {}).get("message", "API error")
            except Exception:
                message = "API error"
            self._json({
                "status": "unhealthy",
                "api_key_set": True,
                "error": message
            }, 200)

        except URLError as e:
            self._json({
                "status": "unhealthy",
                "api_key_set": True,
                "error": f"Network error: {e.reason}"
            }, 500)

        except Exception as e:
            self._json({
                "status": "unhealthy",
                "api_key_set": True,
                "error": str(e)
            }, 500)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())