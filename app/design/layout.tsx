import { notFound } from "next/navigation";

export default function DesignPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
