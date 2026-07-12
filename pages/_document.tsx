import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // suppressHydrationWarning: next-themes stamps the .dark class on <html>
    // before hydration, which React would otherwise flag as a mismatch.
    <Html lang="en" suppressHydrationWarning>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
