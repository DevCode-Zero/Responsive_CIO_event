"""
Simple local server to run the generate.py API.
Usage: python3 server.py
"""
import http.server
import socketserver
import json
import os
import ssl
import importlib.util

PORT = 5002

os.environ["OPENROUTER_API_KEY"] = "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"
os.environ["APP_URL"] = "http://localhost:5002"

spec = importlib.util.spec_from_file_location("generate", "api/generate.py")
generate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate)

class APIHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/generate":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode()

            try:
                data = json.loads(body)
                prompt = generate.build_prompt(data)

                from urllib.request import urlopen, Request

                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE

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

                with urlopen(request, context=ctx) as resp:
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
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[API] {args[0]}")

with socketserver.TCPServer(("", PORT), APIHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    httpd.serve_forever()
