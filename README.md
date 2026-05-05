# CIO Event Check-In App

A React-based check-in application for CIO events with AI-powered workshop generation using OpenRouter API.

## Prerequisites

- **Node.js** (v18 or higher) - [Install Node.js](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Install Python](https://python.org/)
- **npm**, **yarn**, or **pnpm** package manager

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/DevCode-Zero/Responsive_CIO_event.git
cd Responsive_CIO_event
```

### 2. Install Dependencies

**Frontend (Node.js):**
```bash
npm install
# or
pnpm install
```

**Backend (Python):**
```bash
pip3 install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# OpenRouter API Key (required for AI workshop generation)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Get API Keys:**
> - OpenRouter API: https://openrouter.ai/keys
> - Supabase: https://supabase.com/dashboard

### 4. Build the Frontend

```bash
npm run build
```

This creates the `dist/` folder with compiled assets.

### 5. Run the Server

```bash
python3 server.py
```

The server will start at **http://localhost:5002**

## Development Mode

For frontend development with hot reload:

```bash
npm run dev
```

This starts Vite dev server (usually at http://localhost:5173)

## Project Structure

```
├── api/                    # Python API endpoints
│   ├── generate.py        # Workshop generation endpoint
│   └── health.py          # Health check endpoint
├── src/                   # React frontend source
├── dist/                  # Built frontend (generated)
├── supabase/              # Supabase configuration
├── server.py              # Python HTTP server
├── requirements.txt       # Python dependencies
├── package.json           # Node.js dependencies
└── .env.local            # Environment variables (create this)
```

## API Endpoints

- **GET** `/api/health` - Check API and API key status
- **POST** `/api/generate` - Generate workshop plans using AI

## Technologies Used

**Frontend:**
- React 18 with React Router
- Material UI (MUI) & Radix UI components
- Tailwind CSS for styling
- Vite build tool
- Supabase client

**Backend:**
- Python HTTP server
- OpenRouter API (Claude 3 Haiku model)
- Supabase database

## Troubleshooting

**Python dependencies fail to install:**
```bash
pip3 install --upgrade pip
pip3 install -r requirements.txt
```

**Port 5002 already in use:**
Edit `PORT = 5002` in `server.py` to use a different port.

**OpenRouter API errors:**
- Verify your API key in `.env.local`
- Check API key status at `/api/health`

## License

This project is proprietary - all rights reserved.
