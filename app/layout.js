import { Inter } from "next/font/google";
import "./globals.css";
import PomodoroTimer from "./components/PomodoroTimer";
import { DarkModeProvider } from "./context/DarkModeContext";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Study",
  description: "A platform for effective studying",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <DarkModeProvider>
          <Header />
          <main className="pt-20">
            {children}
          </main>
          <PomodoroTimer />
        </DarkModeProvider>
      </body>
    </html>
  );
}
