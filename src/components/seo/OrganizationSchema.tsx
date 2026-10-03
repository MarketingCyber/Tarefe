export function OrganizationSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tarefe",
    url: "https://tarefe.de",
    logo: "https://tarefe.de/logo.png",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Kesselstraße 3",
      postalCode: "40221",
      addressLocality: "Düsseldorf",
      addressCountry: "DE",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+49-211-5421-8000",
      contactType: "customer service",
      availableLanguage: ["Persian", "German", "Russian"],
    },
    sameAs: ["https://www.instagram.com/tarefe_de/", "https://www.youtube.com/@eshaghi."],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
