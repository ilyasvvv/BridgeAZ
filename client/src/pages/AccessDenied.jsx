import { Link } from "react-router-dom";

export default function AccessDenied() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 text-center">
      <h1 className="font-display text-3xl text-sand">Access denied</h1>
      <p className="text-sm text-mist">
        You do not have permission to view this page.
      </p>
      <Link
        to="/fyp"
        className="mx-auto rounded-full bg-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
      >
        Back to For You
      </Link>
    </div>
  );
}
