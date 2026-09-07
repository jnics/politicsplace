import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("polls", "routes/polls.tsx"),
  route("election2026", "routes/election2026.tsx"),
] satisfies RouteConfig;
