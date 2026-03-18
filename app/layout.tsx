import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "What Should We Play?",
  description: "Find the perfect board game from your BGG collection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="pb-14">{children}</div>
        <footer className="fixed bottom-3 right-3 z-10">
          <a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/powered-by-bgg-rgb.svg"
              alt="Powered by BoardGameGeek"
              className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity"
            />
          </a>
        </footer>
      </body>
    </html>
  );
}
