import type {Metadata} from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/outfit';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: 'CIF Consultant Management',
  description: 'Curatio International Foundation - Consultant Management Portal.',
  icons: {
    icon: '/Small_Logo_White.svg',
  }
};

import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <FirebaseClientProvider>
              {children}
              <Toaster />
            </FirebaseClientProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
