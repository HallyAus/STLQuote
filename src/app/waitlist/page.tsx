import type { Metadata } from "next";
import WaitlistForm from "./waitlist-form";

export const metadata: Metadata = {
  title: "Join the Waitlist — Printforge 3D Print Cost Calculator",
  description:
    "Join the Printforge waitlist. Be first to access the free 3D print cost calculator with professional quoting, job tracking, and business management.",
  alternates: {
    canonical: "https://crm.printforge.com.au/waitlist",
  },
};

export default function WaitlistPage() {
  return <WaitlistForm />;
}
