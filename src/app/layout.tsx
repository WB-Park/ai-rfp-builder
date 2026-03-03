import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const SITE_URL = "https://wishket-prd.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI PRD 빌더 | 위시켓",
    template: "%s | 위시켓 AI PRD 빌더",
  },
  description:
    "AI가 대화 몇 번으로 완성하는 전문 기획서(PRD). 아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다.",
  keywords: [
    "PRD",
    "기획서",
    "소프트웨어 외주",
    "AI 기획서",
    "위시켓",
    "제품 요구사항",
    "프로젝트 기획",
    "RFP",
    "개발 외주",
    "IT 아웃소싱",
    "AI PRD",
    "기획서 작성",
    "기획서 자동화",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "AI PRD 빌더 — 대화만으로 완성하는 전문 기획서",
    description:
      "아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다. 무료로 시작하세요.",
    type: "website",
    url: SITE_URL,
    siteName: "위시켓 AI PRD 빌더",
    locale: "ko_KR",
    images: [
      {
        url: `${SITE_URL}/api/og`,
        width: 1200,
        height: 630,
        alt: "AI PRD 빌더 — 대화만으로 완성하는 전문 기획서 | 위시켓",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI PRD 빌더 — 대화만으로 완성하는 전문 기획서",
    description:
      "아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다",
    images: [`${SITE_URL}/api/og`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Google Search Console 등록 후 추가
    // google: 'verification-code',
  },
};

// JSON-LD 구조화 데이터
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AI PRD 빌더",
  description:
    "AI가 대화 몇 번으로 완성하는 전문 기획서(PRD). 아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다.",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  creator: {
    "@type": "Organization",
    name: "위시켓",
    url: "https://www.wishket.com",
  },
  inLanguage: "ko",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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

        {/* Google Analytics (GA4) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-TVBPL9CWCM"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TVBPL9CWCM');
          `}
        </Script>

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '785746597924945');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=785746597924945&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
