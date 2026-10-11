import Link from "next/link";
import { PROJECTS } from "@/lib/projects";

export default function Home() {
  return (
    <section aria-labelledby="h">
      <h2 id="h">Choose your project</h2>
      <p className="sub">Each project has its own calculator, tool list and step-by-step guide.</p>
      <div className="projects">
        {PROJECTS.map((p) => (
          <Link key={p.slug} href={`/${p.slug}`} className="pcard">
            <span className="group">{p.group}</span>
            <h3>{p.label}</h3>
            <span>{p.blurb}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
