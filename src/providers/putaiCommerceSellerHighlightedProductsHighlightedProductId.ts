import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a specific highlighted product entry in the discovery business table.
 *
 * Modifies an existing highlighted product record, enabling authorized sellers
 * to update the highlight time window, reason, and campaign context. Enforces
 * strict ownership rules, allowing only the creator seller to update their own
 * highlight. All date and time values are handled as strings in ISO8601 format
 * with typia tags. Ensures type safety and functional consistency at every
 * step.
 *
 * @param props - Object containing seller authentication payload, highlight
 *   record ID, and partial update body.
 * @param props.seller - The authenticated seller performing the update (must be
 *   the highlight owner).
 * @param props.highlightedProductId - Unique UUID of the highlighted product
 *   record being updated.
 * @param props.body - Request body with updatable fields: highlight_start_at,
 *   highlight_end_at, reason, ai_commerce_product_id, highlighted_by.
 * @returns The updated highlighted product record matching
 *   IAiCommerceHighlightedProduct.
 * @throws {Error} If the highlighted product is not found or the seller is not
 *   authorized to update it.
 */
export async function putaiCommerceSellerHighlightedProductsHighlightedProductId(props: {
  seller: SellerPayload;
  highlightedProductId: string & tags.Format<"uuid">;
  body: IAiCommerceHighlightedProduct.IUpdate;
}): Promise<IAiCommerceHighlightedProduct> {
  const { seller, highlightedProductId, body } = props;

  // 1. Fetch the highlighted product, enforce seller ownership
  const record =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findFirst({
      where: {
        id: highlightedProductId,
        // deleted_at removed per type error
      },
    });
  if (!record) {
    throw new Error("Highlighted product not found");
  }
  if (record.highlighted_by !== seller.id) {
    throw new Error("Unauthorized: Not the owner of this highlight");
  }

  // 2. Update allowed fields strictly according to IAiCommerceHighlightedProduct.IUpdate
  const updated = await MyGlobal.prisma.ai_commerce_highlighted_products.update(
    {
      where: { id: highlightedProductId },
      data: {
        highlight_start_at: body.highlight_start_at ?? undefined,
        highlight_end_at:
          body.highlight_end_at === undefined
            ? undefined
            : body.highlight_end_at,
        reason: body.reason === undefined ? undefined : body.reason,
        ai_commerce_product_id: body.ai_commerce_product_id ?? undefined,
        highlighted_by: body.highlighted_by ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // 3. Return properly structured and type-safe IAiCommerceHighlightedProduct
  return {
    id: updated.id,
    ai_commerce_product_id: updated.ai_commerce_product_id,
    highlighted_by: updated.highlighted_by,
    highlight_start_at: toISOStringSafe(updated.highlight_start_at),
    highlight_end_at:
      updated.highlight_end_at !== null &&
      updated.highlight_end_at !== undefined
        ? toISOStringSafe(updated.highlight_end_at)
        : updated.highlight_end_at,
    reason: updated.reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
