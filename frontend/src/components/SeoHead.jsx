import { Helmet } from "react-helmet-async";

const SITE_NAME = "ARGUS — Shadow AI Scanner";

/**
 * Per-page SEO metadata component.
 * @param {{
 *   title: string,
 *   description?: string,
 *   canonical?: string,
 *   noIndex?: boolean
 * }} props
 */
export default function SeoHead({ title, description, canonical, noIndex }) {
  const fullTitle = `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta property="og:title" content={fullTitle} />
      <meta name="twitter:title" content={fullTitle} />
      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
