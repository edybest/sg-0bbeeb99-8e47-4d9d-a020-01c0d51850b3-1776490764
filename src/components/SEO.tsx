import Head from "next/head";

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
  author?: string;
  keywords?: string[];
}

const defaultSEO: Required<SEOProps> = {
  title: "AMBC Club - Bowling Community & Member Portal",
  description: "AMBC Club adalah komuniti bowling yang aktif dengan portal ahli, galeri foto, chat rooms, sistem couple, dan banyak lagi. Join kami untuk pengalaman bowling yang best!",
  image: "/og-image.png",
  url: "https://ambc-club.vercel.app",
  type: "website",
  publishedTime: "",
  author: "AMBC Club Team",
  keywords: [
    "AMBC Club",
    "bowling club",
    "bowling community",
    "bowling Malaysia",
    "sports club",
    "member portal",
    "bowling gallery",
    "bowling events",
    "bowling scores",
    "couple bowling",
    "bowling chat",
    "bowling training"
  ],
};

export function SEOElements({
  title = defaultSEO.title,
  description = defaultSEO.description,
  image = defaultSEO.image,
  url = defaultSEO.url,
  type = defaultSEO.type,
  publishedTime = defaultSEO.publishedTime,
  author = defaultSEO.author,
  keywords = defaultSEO.keywords,
}: SEOProps = {}) {
  const fullTitle = title === defaultSEO.title ? title : `${title} | AMBC Club`;
  const fullUrl = url.startsWith('http') ? url : `${defaultSEO.url}${url}`;
  const fullImage = image.startsWith('http') ? image : `${defaultSEO.url}${image}`;

  return (
    <>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />
      <meta name="author" content={author} />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="AMBC Club" />
      <meta property="og:locale" content="en_MY" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={fullTitle} />
      <meta name="twitter:creator" content="@ambcclub" />

      {/* WhatsApp Optimization */}
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:secure_url" content={fullImage} />

      {/* Additional Meta Tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-title" content="AMBC Club" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
    </>
  );
}

export function SEO(props: SEOProps = {}) {
  return (
    <Head>
      <SEOElements {...props} />
    </Head>
  );
}