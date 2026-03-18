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
        {children}
        <footer className="flex justify-center py-4">
          <a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/powered-by-bgg-rgb.svg"
              alt="Powered by BoardGameGeek"
              className="h-8 w-auto opacity-60 hover:opacity-100 transition-opacity"
            />
          </a>
        </footer>
      </body>
    </html>
  );
}
