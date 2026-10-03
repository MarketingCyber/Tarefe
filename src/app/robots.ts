import type { MetadataRoute } from "next";

const SITE_URL = "https://tarefe.de";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/", // customer portal — private
          "/*/login",
          "/*/register",
          "/*/consultation/success",
        ],
      },
      {
        userAgent: "*",
        disallow: "/ops/", // internal operations — never indexed
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
