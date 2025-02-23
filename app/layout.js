import { Inter } from "next/font/google";
import "./globals.css";
import PomodoroTimer from "./components/PomodoroTimer";
import { DarkModeProvider } from "./contexts/DarkModeContext";
import Header from "./components/Header";
import { UserProvider } from './contexts/UserContext'

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Study",
  description: "A platform for effective studying",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <UserProvider>
          <DarkModeProvider>
            <main className="">
              {children}
            </main>
            <PomodoroTimer />
          </DarkModeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
