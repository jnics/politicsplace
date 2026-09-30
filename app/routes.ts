import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("polls", "routes/polls.tsx"),
  route("polls/submit", "routes/polls.submit.tsx"),
  route("election2026", "routes/election2026.tsx"),
  route("results", "routes/results.tsx"),
  route("chase", "routes/chase.tsx"),
  route("chase/export", "routes/chase.export.tsx"),
] satisfies RouteConfig;
