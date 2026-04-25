"""
Simple local server to run the generate.py API.
Usage: python3 server.py
"""
import http.server
import socketserver
import json
import os
import importlib.util
import ssl
import certifi

PORT = 5002

os.environ["APP_URL"] = "http://localhost:5002"

ssl_context = ssl.create_default_context(cafile=certifi.where())

spec = importlib.util.spec_from_file_location("generate", "api/generate.py")
generate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate)

spec_health = importlib.util.spec_from_file_location("health", "api/health.py")
health = importlib.util.module_from_spec(spec_health)
spec_health.loader.exec_module(health)

class APIHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            self._handle_api()
        else:
            self._serve_static()

    def _handle_api(self):
        if self.path == "/api/health":
            import ssl
            import urllib.request
            from urllib.request import urlopen, Request
            from urllib.error import HTTPError, URLError
            import json as json_module

            API_URL = "https://openrouter.ai/api/v1/auth/key"
            api_key = os.environ.get("OPENROUTER_API_KEY")
            app_url = os.environ.get("APP_URL", "http://localhost:5002")

            if not api_key:
                self._json({
                    "status": "unhealthy",
                    "api_key_set": False,
                    "error": "OPENROUTER_API_KEY not configured"
                }, 200)
                return

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
                with urlopen(request, context=ssl_context) as resp:
                    response_data = json_module.loads(resp.read())

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
                    error_data = json_module.loads(e.read())
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
            return
        else:
            self.send_response(404)
            self.end_headers()

    def _json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _serve_static(self):
        path = self.path.split("?")[0]
        
        if path.startswith("/api/"):
            self.send_response(404)
            self.end_headers()
            return
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        if path == "/" or path == "":
            file_path = os.path.join(base_dir, "dist", "index.html")
        else:
            file_path = os.path.join(base_dir, "dist", path.lstrip("/"))
            if not os.path.isfile(file_path):
                file_path = os.path.join(base_dir, "dist", "index.html")
        
        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1]
            content_type = {
                ".html": "text/html",
                ".js": "application/javascript",
                ".css": "text/css",
                ".json": "application/json",
                ".svg": "image/svg+xml",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".woff": "font/woff",
                ".woff2": "font/woff2",
            }.get(ext, "application/octet-stream")
            
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "public, max-age=31536000")
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        if self.path == "/api/generate":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode()

            try:
                data = json.loads(body)
                prompt = generate.build_prompt(data)

                from urllib.request import urlopen, Request

                api_key = os.environ.get("OPENROUTER_API_KEY")
                request = Request(
                    generate.API_URL,
                    data=json.dumps({
                        "model": generate.MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 3000,
                        "temperature": 0.7,
                    }).encode(),
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "HTTP-Referer": "http://localhost:5002",
                        "X-Title": "BX Discovery App",
                    },
                    method="POST",
                )

                with urlopen(request, context=ssl_context) as resp:
                    response_data = json.loads(resp.read())

                text = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"content": [{"text": text}]}).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        if self.path == "/api/health" or self.path == "/api/generate":
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        print(f"[API] {args[0]}")

from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True

with ThreadedHTTPServer(("", PORT), APIHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    httpd.serve_forever()
