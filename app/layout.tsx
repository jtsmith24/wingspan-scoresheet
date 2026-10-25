import type { Metadata } from "next";
import { Josefin_Sans, Patrick_Hand, Patrick_Hand_SC } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Wingspan Scoresheet",
  description: "An app to help you sum up your Wingspan scores",
};

// Sets the saved palette before first paint so returning players don't see
// the base game's blue flash into their expansion's colours.
const paletteScript = `try{var p=localStorage.getItem("wingspan-palette");if(p)document.documentElement.dataset.edition=p}catch(e){}`;

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
