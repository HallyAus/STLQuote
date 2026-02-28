import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign In to Printforge — 3D Print Cost Calculator",
  description:
    "Sign in to your Printforge account. Manage 3D print costs, generate quotes, track jobs, and invoice clients.",
  alternates: {
    canonical: "https://crm.printforge.com.au/login",
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
