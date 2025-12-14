# Personal Digital Twin Network

> "Your twin finds perfect people. You skip the small talk."

Privacy-first PWA for AI-powered networking at events. Digital twins match attendees based on public profile data.

## Features

- 🤖 **Digital Twin Creation**: 30-second onboard from LinkedIn URL
- 📱 **QR Event Join**: Scan QR to join event mesh
- 🎯 **AI Matching**: Top 3 matches from 50 attendees instantly
- 🔒 **Privacy-First**: All twin data on-device (IndexedDB)

## Architecture

Clean Architecture with SOLID principles:

```
src/
├── domain/           # Entities, Interfaces (Business Rules)
├── application/      # Use Cases (Application Logic)
├── infrastructure/   # Supabase, Gemini, IndexedDB
├── presentation/     # React Components, Hooks
└── app/              # Next.js App Router
```

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (events only, no profiles)
- **AI**: Google Gemini Flash
- **Storage**: IndexedDB (on-device twins)
- **Testing**: Jest + Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google AI API key

### Installation

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/personal-twin-network.git
cd personal-twin-network

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations (in Supabase dashboard)
# Copy contents of supabase/migrations/001_initial_schema.sql

# Start development server
npm run dev
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Deployment (Railway)

1. Push to GitHub
2. Connect repo to Railway
3. Set environment variables in Railway dashboard
4. Railway auto-deploys on push

## Privacy

- **Zero server profiles**: Twin data stays on device
- **Minimal database**: Only auth + event metadata
- **GDPR compliant**: Delete twin deletes all data

## Development Philosophy

- **TDD**: Tests written before implementation
- **Clean Architecture**: Uncle Bob's layers
- **SOLID**: Single responsibility, dependency inversion
- **Martin Fowler**: Refactoring patterns, clean code

## License

MIT
