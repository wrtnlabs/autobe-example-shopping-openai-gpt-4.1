import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSeo } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSeo";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates or creates the SEO metadata for a specific product in
 * ai_commerce_product_seo (upsert behavior).
 *
 * This endpoint allows administrators to set or update all SEO fields for a
 * given product. If SEO metadata does not exist for the product, it is created;
 * otherwise, the record is updated in-place. Only a single SEO record per
 * product is allowed. Business logic ensures the product exists, and all
 * responses conform to the IAiCommerceProductSeo DTO. Fields not provided in
 * the request body are explicitly set to null in storage but mapped as
 * 'undefined' in the output type when omitted. Audit logging is omitted as no
 * audit model is described in the schema context.
 *
 * @param props - Parameters for the update operation
 * @param props.admin - Authenticated admin making the request
 * @param props.productId - UUID of the product to update SEO metadata for
 * @param props.body - SEO metadata to update or insert (all fields optional or
 *   nullable)
 * @returns The updated or created SEO metadata record for the product
 * @throws {Error} If the product does not exist, or update fails
 */
export async function putaiCommerceAdminProductsProductIdSeo(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSeo.IUpdate;
}): Promise<IAiCommerceProductSeo> {
  // 1. Ensure product with specified ID exists
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new Error("Product not found");
  }
  // 2. Upsert SEO metadata for the product
  const upserted = await MyGlobal.prisma.ai_commerce_product_seo.upsert({
    where: { product_id: props.productId },
    create: {
      id: v4(),
      product_id: props.productId,
      seo_title: props.body.seo_title ?? null,
      seo_description: props.body.seo_description ?? null,
      canonical_url: props.body.canonical_url ?? null,
      seo_keywords: props.body.seo_keywords ?? null,
      og_image_url: props.body.og_image_url ?? null,
    },
    update: {
      seo_title: props.body.seo_title ?? null,
      seo_description: props.body.seo_description ?? null,
      canonical_url: props.body.canonical_url ?? null,
      seo_keywords: props.body.seo_keywords ?? null,
      og_image_url: props.body.og_image_url ?? null,
    },
  });
  // 3. Return IAiCommerceProductSeo DTO conforming object
  return {
    id: upserted.id,
    product_id: upserted.product_id,
    seo_title: upserted.seo_title ?? undefined,
    seo_description: upserted.seo_description ?? undefined,
    canonical_url: upserted.canonical_url ?? undefined,
    seo_keywords: upserted.seo_keywords ?? undefined,
    og_image_url: upserted.og_image_url ?? undefined,
  };
}
