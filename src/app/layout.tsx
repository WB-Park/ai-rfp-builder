import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI PRD 빌더 | 위시켓",
  description: "AI가 대화 몇 번으로 완성하는 전문 기획서(PRD). 아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다.",
  keywords: ["PRD", "기획서", "소프트웨어 외주", "AI", "위시켓", "제품 요구사항"],
  openGraph: {
    title: "AI PRD 빌더 — 대화만으로 완성하는 전문 기획서",
    description: "아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다",
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
