import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wishket-prd.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // 공유 PRD 페이지는 동적이므로 개별 URL은 제외
    // 추후 공유 PRD 인덱싱이 필요하면 Supabase에서 share_id 목록을 가져와 추가
  ];
}
