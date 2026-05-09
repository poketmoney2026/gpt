import "./globals.css";

export const metadata = {
  title: "GPT Order Panel",
  description: "Simple GPT order panel with Mongoose database",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
