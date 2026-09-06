import type { Route } from "./+types/home";
import { ElectionsExplorer } from "~/components/ElectionsExplorer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Election Map" },
    {
      name: "description",
      content:
        "Explore presidential and U.S. Senate election results since 2016, and make your own predictions for the 2026 Senate races.",
    },
  ];
}

export default function Home() {
  return <ElectionsExplorer />;
}
