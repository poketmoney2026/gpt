import "./globals.css";

export const metadata = {
  title: "GPT Order Panel",
  description: "Simple order panel with Mongoose database",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
