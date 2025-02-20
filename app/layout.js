import { Inter } from "next/font/google";
import "./globals.css";
import PomodoroTimer from "./components/PomodoroTimer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Study Platform",
  description: "A platform for effective studying",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <PomodoroTimer />
      </body>
    </html>
  );
}
