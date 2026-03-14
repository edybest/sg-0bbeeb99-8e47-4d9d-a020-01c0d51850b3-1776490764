import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-theme-footer">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-xs text-muted-foreground">
          © 2026{" "}
          <Link href="/" className="hover:text-foreground underline-offset-4 hover:underline">
            ambc.club
          </Link>{" "}
          | powered by{" "}
          <a
            href="https://binaweb.net"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            binaweb.net
          </a>
        </p>
      </div>
    </footer>
  );
}