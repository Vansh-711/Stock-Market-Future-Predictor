# Signal Chain frontend

React 18 frontend for the Signal Chain Django REST API.

## Run locally

```bash
npm install
npm run dev
```

The API base URL is fixed to `http://localhost:8000/api/v1` in `src/shared/config/env.ts`. All API requests are routed through `src/shared/api/client.ts` with `credentials: "include"` for cookie/session authentication.

## Build

```bash
npm run build
```

## Implemented routes

- `/login`
- `/signup`
- `/`
- `/patterns`
- `/explorer`
- `/chains`
- `/chains/:id`
- `/companies/:symbol`

## Stack

- React 18 functional components
- React Router
- Tailwind CSS custom dark theme tokens
- Recharts
- react-force-graph-2d
- lucide-react icons only
