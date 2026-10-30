import type { Metadata } from "next";
import { Container, PageBand } from "../../components/layout";
import AdminApp from "./AdminApp";

// The admin page is for the site owner. It is kept out of search engines, the sitemap and the navigation.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <PageBand title="Admin" description="Sign in with a GitHub token to edit the site's workbook. Changes are saved as commits in your repository." />
      <Container className="py-10">
        <AdminApp defaultRepo={process.env.NEXT_PUBLIC_GITHUB_REPO ?? ""} defaultBranch={process.env.NEXT_PUBLIC_GITHUB_BRANCH ?? "main"} />
      </Container>
    </>
  );
}
