import type { Route } from "./+types/chase.export";
import { cloudflareContext } from "~/lib/context.server";
import { SUPPORTERS, SUPPORT_LABELS, CHASE_LOCATIONS } from "~/data/supporters";
import { readChase } from "~/lib/chase.server";

/** CSV walk/call sheet of the current chase list. Resource route (no UI). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const location =
    url.searchParams.get("location") || CHASE_LOCATIONS[0]?.id || "";
  const precinct = url.searchParams.get("precinct") || null;
  const maxSupport = Math.min(5, Math.max(1, Number(url.searchParams.get("support")) || 2));

  const store = await readChase(context.get(cloudflareContext).env.DB);
  const rows = SUPPORTERS.filter(
    (s) =>
      s.location === location &&
      (!precinct || s.precinct === precinct) &&
      s.support <= maxSupport &&
      !s.earlyVoted &&
      !store.voted[s.id]
  ).sort(
    (a, b) => a.precinct.localeCompare(b.precinct) || a.name.localeCompare(b.name)
  );

  const header = [
    "Name", "Address", "City", "ZIP", "Phone", "Email", "Precinct", "Support", "Contacted?",
  ];
  const body = rows.map((r) =>
    [
      r.name, r.address, r.city, r.zip, r.phone ?? "", r.email ?? "",
      r.precinct, SUPPORT_LABELS[r.support], "",
    ].map(csvCell).join(",")
  );
  const csv = [header.join(","), ...body].join("\r\n") + "\r\n";

  const slug = `${location}${precinct ? "-" + precinct.replace(/\W+/g, "_") : ""}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chase-${slug}.csv"`,
    },
  });
}

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
