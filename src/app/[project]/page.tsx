import { notFound } from "next/navigation";
import ProjectApp from "@/components/ProjectApp";
import { PRODUCTS } from "@/lib/config";
import { getProject, PROJECTS, toPublic } from "@/lib/projects";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ project: p.slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const p = getProject(project);
  if (!p) notFound();
  const prices = {
    pass: PRODUCTS.pass.cents, pdf: PRODUCTS.pdf.cents,
    call_one: PRODUCTS.call_one.cents, call_five: PRODUCTS.call_five.cents, call_month: PRODUCTS.call_month.cents
  };
  return <ProjectApp project={toPublic(p)} prices={prices} />;
}
