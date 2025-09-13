export const metadata = {
  title: "Next.js App",
  description: "App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
