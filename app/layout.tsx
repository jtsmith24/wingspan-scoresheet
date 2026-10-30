import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Patrick_Hand, Patrick_Hand_SC } from "next/font/google";
import "./globals.css";
import { applyPalette, PALETTE_KEY } from "@/lib/theme";

const display = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-display",
});
const label = Patrick_Hand_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-label",
});
const hand = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hand",
});

// Tints the phone browser's toolbar to the paper colour.
export const viewport: Viewport = {
  themeColor: "#f5f0e5",
};

const title = "Wingspan Score Sheet";
const description =
  "A fan-made score sheet for Wingspan: every expansion, automatic totals and tie-breaks, past games and undo. Unofficial; not affiliated with Stonemaier Games.";

// Link previews (LinkedIn, messaging apps, X). The image comes from
// app/opengraph-image.png and app/twitter-image.png.
export const metadata: Metadata = {
  metadataBase: new URL("https://wingspanscoresheet.vercel.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

// Sets the saved palette before first paint so returning players don't see
// the base game's blue flash into their expansions' colours.
const paletteScript = `try{var p=localStorage.getItem("${PALETTE_KEY}");if(p)(${applyPalette})(p)}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />
      </head>
      <body
        className={`${display.variable} ${label.variable} ${hand.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
