import type { Metadata } from "next";
import "./globals.css";
import { DatasetProvider } from "@/lib/store";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "DataSense — Web-Based Data Analysis & Cleaning Platform",
  description: "Fast, no-code data exploration, cleaning, transformation, statistical analysis, and interactive visualization in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <DatasetProvider>
          <Header />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </DatasetProvider>
      </body>
    </html>
  );
}
