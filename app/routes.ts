import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("polls", "routes/polls.tsx"),
  route("polls/submit", "routes/polls.submit.tsx"),
  route("election2026", "routes/election2026.tsx"),
  route("results", "routes/results.tsx"),
  route("chase", "routes/chase.tsx"),
  route("chase/export", "routes/chase.export.tsx"),
  route("fundraising", "routes/fundraising.tsx"),
  route("fundraising/donor-details/:candidateId", "routes/fundraising.donor-details.tsx"),
  route("ratings", "routes/ratings.tsx"),
  route("calendar", "routes/calendar.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;
