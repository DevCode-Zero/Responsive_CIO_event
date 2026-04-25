
  # CIO Event Check-In App

  This is a code bundle for CIO Event Check-In App. The original project is available at https://www.figma.com/design/tvYTWCQCTt6KD3meRWS6uP/CIO-Event-Check-In-App.

  ## Running the code

Run `npm i` to install the dependencies.

Run `npm run build` to build the frontend (required before running server).

## Python Server

1. Install Python dependencies: `pip3 install certifi`
2. Set environment variable:
   ```bash
   export OPENROUTER_API_KEY="your-api-key"
   ```
3. Run: `python3 server.py`
4. Open http://localhost:5002 in browser

The server handles both frontend (static files) and API (generate endpoint) with threading support for 50+ concurrent users.
  