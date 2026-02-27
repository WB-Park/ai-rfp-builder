import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI RFP Builder | 위시켓",
  description: "AI가 5분 만에 완성하는 소프트웨어 외주 기획서(RFP). 대화만 하면 개발사에 바로 전달 가능한 기획서가 완성됩니다.",
  keywords: ["RFP", "기획서", "소프트웨어 외주", "AI", "위시켓"],
  openGraph: {
    title: "AI RFP Builder — 5분 만에 완성하는 외주 기획서",
    description: "대화만 하면 개발사에 바로 전달 가능한 기획서가 완성됩니다",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard Variable — B2C DNA primary font */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Inter — English fallback */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
