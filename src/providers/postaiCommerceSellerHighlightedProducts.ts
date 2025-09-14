import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new highlighted product record (ai_commerce_highlighted_products).
 *
 * This operation allows an authenticated seller to promote one of their
 * products for campaign or spotlight. It enforces seller ownership, prevents
 * highlight time window overlap, and logs creation metadata. All
 * created/updated timestamps use toISOStringSafe for ISO formatting. Errors are
 * thrown if the product does not exist or is not owned by the seller, or if
 * overlapping highlights are found.
 *
 * @param props - The request containing seller auth and highlight creation body
 * @param props.seller - Authenticated seller JWT payload
 * @param props.body - Highlight creation input (product, schedule, rationale)
 * @returns The created highlighted product record with scheduling and audit
 *   metadata
 * @throws Error if product does not exist or isn't owned by seller
 * @throws Error if an overlapping highlight exists for the same product
 */
export async function postaiCommerceSellerHighlightedProducts(props: {
  seller: SellerPayload;
  body: IAiCommerceHighlightedProduct.ICreate;
}): Promise<IAiCommerceHighlightedProduct> {
  const { seller, body } = props;

  // 1. Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: body.ai_commerce_product_id,
      seller_id: seller.id,
    },
    select: { id: true },
  });
  if (!product) {
    throw new Error(
      "Cannot highlight: Product does not exist or is not owned by seller.",
    );
  }

  // 2. Duplicate/overlapping highlight check for same product
  const start = body.highlight_start_at;
  const end = body.highlight_end_at ?? null;
  const overlapHighlight =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findFirst({
      where: {
        ai_commerce_product_id: body.ai_commerce_product_id,
        OR: [
          // Existing highlight with no end (ongoing)
          {
            highlight_end_at: null,
            highlight_start_at: {
              lte: end ?? start, // If new is open-ended, overlap if existing starts before our (end or start)
            },
          },
          // Existing highlight with defined end
          {
            highlight_end_at: { gte: start },
            highlight_start_at: { lte: end ?? start },
          },
        ],
      },
      select: { id: true },
    });
  if (overlapHighlight) {
    throw new Error(
      "Cannot highlight: Existing highlighted product for this product and time window overlaps.",
    );
  }

  const now = toISOStringSafe(new Date());
  // 3. Create the highlight record
  const created = await MyGlobal.prisma.ai_commerce_highlighted_products.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ai_commerce_product_id: body.ai_commerce_product_id,
        highlighted_by: seller.id,
        highlight_start_at: start,
        highlight_end_at: end,
        reason: body.reason ?? undefined,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        ai_commerce_product_id: true,
        highlighted_by: true,
        highlight_start_at: true,
        highlight_end_at: true,
        reason: true,
        created_at: true,
        updated_at: true,
      },
    },
  );

  // 4. Map output to satisfy IAiCommerceHighlightedProduct with correct null/undefined handling
  return {
    id: created.id,
    ai_commerce_product_id: created.ai_commerce_product_id,
    highlighted_by: created.highlighted_by,
    highlight_start_at: created.highlight_start_at,
    highlight_end_at: created.highlight_end_at ?? undefined,
    reason: created.reason ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
