import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSeo } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSeo";

/**
 * Retrieve SEO/search meta-information for a specific product.
 *
 * This API retrieves all SEO and search metadata for a product (using
 * ai_commerce_product_seo), including title, description, canonical URL,
 * keywords, and social image. The endpoint is public, requires no
 * authentication, and produces either a complete SEO record or a not-found
 * error if the product does not have SEO metadata configured. It is commonly
 * used by detail pages, marketing integrations, and analytics dashboards.
 *
 * @param props - Request parameters.
 * @param props.productId - The product UUID for which to retrieve SEO metadata.
 * @returns IAiCommerceProductSeo entity for the specified product.
 * @throws {Error} If SEO metadata for this product could not be found.
 */
export async function getaiCommerceProductsProductIdSeo(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductSeo> {
  const { productId } = props;
  const seo = await MyGlobal.prisma.ai_commerce_product_seo.findUnique({
    where: { product_id: productId },
    select: {
      id: true,
      product_id: true,
      seo_title: true,
      seo_description: true,
      canonical_url: true,
      seo_keywords: true,
      og_image_url: true,
    },
  });
  if (!seo) throw new Error("SEO 정보가 없습니다.");
  return {
    id: seo.id,
    product_id: seo.product_id,
    ...(seo.seo_title !== undefined && { seo_title: seo.seo_title }),
    ...(seo.seo_description !== undefined && {
      seo_description: seo.seo_description,
    }),
    ...(seo.canonical_url !== undefined && {
      canonical_url: seo.canonical_url,
    }),
    ...(seo.seo_keywords !== undefined && { seo_keywords: seo.seo_keywords }),
    ...(seo.og_image_url !== undefined && { og_image_url: seo.og_image_url }),
  };
}
