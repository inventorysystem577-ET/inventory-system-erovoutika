// app/layout.jsx
import "./globals.css";
import AuthErrorHandler from "./components/AuthErrorHandler";

// ✅ Force entire app to be dynamic
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inventory System",
  description: "Track your assets. Manage your workflow. Optimize results.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
      </head>
      <body className="antialiased">
        <AuthErrorHandler />
        {children}
      </body>
    </html>
  );
}
