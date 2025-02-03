import "./globals.css";


export const metadata = {
  title: "Student App",
  description: "..",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
          {children}

      </body>
    </html>
  );
}
