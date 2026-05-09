import "./globals.css";

export const metadata = {
  title: "GPT Customer Data Center",
  description: "User and admin package dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
