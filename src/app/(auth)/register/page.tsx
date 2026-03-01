import type { Metadata } from "next";
import RegisterForm from "./register-form";

export const metadata: Metadata = {
  title: "Create Account — Printforge 3D Print Cost Calculator",
  description:
    "Create your free Printforge account. Start calculating 3D print costs, generating professional quotes, and managing your print business. 14-day Scale trial included.",
  alternates: {
    canonical: "https://crm.printforge.com.au/register",
  },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
