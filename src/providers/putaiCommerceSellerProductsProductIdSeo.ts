import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSeo } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSeo";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update or create the SEO metadata for a specific product in
 * ai_commerce_product_seo (upsert behavior).
 *
 * This endpoint allows a seller to upsert SEO and search meta fields for a
 * product. Only the product owner (seller) or an admin may update SEO metadata.
 * It guarantees a unique SEO record per product and records all changes to an
 * audit log for compliance and legal traceability.
 *
 * - If a SEO record exists for the product, it is updated. Otherwise, a new
 *   record is created.
 * - Requires that the seller owns the referenced product.
 * - Logs before and after state to ai_commerce_product_audit_logs.
 * - All values conform to required string/date/uuid branding.
 * - No use of native Date type; all datetimes as `string &
 *   tags.Format<'date-time'>`.
 *
 * @param props - Operation parameters
 * @param props.seller - Authenticated seller payload (must own the product)
 * @param props.productId - UUID of product to update SEO for
 * @param props.body - New SEO field values to upsert
 * @returns The updated or created SEO metadata for the product
 * @throws {Error} If product does not exist or is not owned by seller
 */
export async function putaiCommerceSellerProductsProductIdSeo(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSeo.IUpdate;
}): Promise<IAiCommerceProductSeo> {
  const { seller, productId, body } = props;

  // Validate product existence and ownership
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId, seller_id: seller.id },
  });
  if (!product) {
    throw new Error("Product not found or not owned by seller");
  }

  // Retrieve existing SEO record if it exists
  const oldSeo = await MyGlobal.prisma.ai_commerce_product_seo.findUnique({
    where: { product_id: productId },
  });

  let result: IAiCommerceProductSeo;
  if (!oldSeo) {
    // Create new SEO
    const created = await MyGlobal.prisma.ai_commerce_product_seo.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_id: productId,
        seo_title: body.seo_title ?? null,
        seo_description: body.seo_description ?? null,
        canonical_url: body.canonical_url ?? null,
        seo_keywords: body.seo_keywords ?? null,
        og_image_url: body.og_image_url ?? null,
      },
    });

    result = {
      id: created.id,
      product_id: created.product_id,
      seo_title: created.seo_title ?? undefined,
      seo_description: created.seo_description ?? undefined,
      canonical_url: created.canonical_url ?? undefined,
      seo_keywords: created.seo_keywords ?? undefined,
      og_image_url: created.og_image_url ?? undefined,
    };

    // Audit log for creation
    await MyGlobal.prisma.ai_commerce_product_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_id: productId,
        event_type: "SEO_CREATE",
        actor_id: seller.id,
        before_json: null,
        after_json: JSON.stringify(result),
        created_at: toISOStringSafe(new Date()),
      },
    });
  } else {
    // Prepare updated fields (only supply fields from body; others remain unchanged)
    const updated = await MyGlobal.prisma.ai_commerce_product_seo.update({
      where: { product_id: productId },
      data: {
        seo_title: body.seo_title ?? null,
        seo_description: body.seo_description ?? null,
        canonical_url: body.canonical_url ?? null,
        seo_keywords: body.seo_keywords ?? null,
        og_image_url: body.og_image_url ?? null,
      },
    });
    result = {
      id: updated.id,
      product_id: updated.product_id,
      seo_title: updated.seo_title ?? undefined,
      seo_description: updated.seo_description ?? undefined,
      canonical_url: updated.canonical_url ?? undefined,
      seo_keywords: updated.seo_keywords ?? undefined,
      og_image_url: updated.og_image_url ?? undefined,
    };

    // Audit log for update
    await MyGlobal.prisma.ai_commerce_product_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_id: productId,
        event_type: "SEO_UPDATE",
        actor_id: seller.id,
        before_json: JSON.stringify({
          id: oldSeo.id,
          product_id: oldSeo.product_id,
          seo_title: oldSeo.seo_title ?? undefined,
          seo_description: oldSeo.seo_description ?? undefined,
          canonical_url: oldSeo.canonical_url ?? undefined,
          seo_keywords: oldSeo.seo_keywords ?? undefined,
          og_image_url: oldSeo.og_image_url ?? undefined,
        }),
        after_json: JSON.stringify(result),
        created_at: toISOStringSafe(new Date()),
      },
    });
  }
  return result;
}
