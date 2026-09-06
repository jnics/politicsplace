# PoliticsPlace

A TypeScript + React Router (framework mode) site, styled with Tailwind CSS.

## Features

- Server-side rendering
- Hot Module Replacement (HMR)
- Data loading and mutations via React Router loaders/actions
- TypeScript by default
- Tailwind CSS for styling

## Getting Started

### Installation

Install dependencies with pnpm:

```bash
pnpm install
```

### Development

Start the dev server with HMR:

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

```bash
pnpm build
```

## Deployment

### Docker

```bash
docker build -t politicsplace .
docker run -p 3000:3000 politicsplace
```

### DIY Deployment

The built-in app server is production-ready. Deploy the output of `pnpm build`:

```
├── package.json
├── pnpm-lock.yaml
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

Tailwind CSS is already configured. Global styles live in `app/app.css`; routes live under `app/routes/`.
