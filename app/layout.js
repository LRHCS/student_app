import "./globals.css";
import PomodoroTimer from './components/PomodoroTimer'

export const metadata = {
  title: "Student App",
  description: "..",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>
          {children}
      </body>
    </html>
  );
}
