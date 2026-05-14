import type { MetadataRoute } from 'next'

const baseUrl = 'https://mitsne.site'

async function getReviewUrls() {
  // TODO: thay bằng query DB/API thật của bạn
  // Nên trả về slug nếu có, fallback id cũng được
  const reviews: Array<{ id: string; slug?: string; updatedAt?: string | Date }> = []

  return reviews.map((review) => ({
    url: `${baseUrl}/reviews/${review.slug ?? review.id}`,
    lastModified: review.updatedAt ? new Date(review.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reviewUrls = await getReviewUrls()

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/reviews`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/profile/mitsne`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/shelf`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/stats`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...reviewUrls,
  ]
}
