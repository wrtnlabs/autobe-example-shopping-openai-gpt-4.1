import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";

/**
 * Get details of a specific highlighted product by ID
 * (ai_commerce_highlighted_products).
 *
 * This function retrieves a single highlighted product entry from
 * ai_commerce_highlighted_products using the supplied highlightedProductId. It
 * returns all scheduling, audit, business rationale, and product linkage
 * metadata for UI or management endpoints. If the record is not found, a 404
 * error is thrown.
 *
 * @param props - Object containing required parameter highlightedProductId
 *   (UUID of the highlighted product).
 * @param props.highlightedProductId - Unique identifier of the highlighted
 *   product record
 * @returns IAiCommerceHighlightedProduct object with all metadata fields
 * @throws {Error} If the highlighted product entry does not exist (404 Not
 *   Found)
 */
export async function getaiCommerceHighlightedProductsHighlightedProductId(props: {
  highlightedProductId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceHighlightedProduct> {
  const { highlightedProductId } = props;
  const record =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findUniqueOrThrow({
      where: { id: highlightedProductId },
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
    });
  return {
    id: record.id,
    ai_commerce_product_id: record.ai_commerce_product_id,
    highlighted_by: record.highlighted_by,
    highlight_start_at: toISOStringSafe(record.highlight_start_at),
    highlight_end_at:
      record.highlight_end_at != null
        ? toISOStringSafe(record.highlight_end_at)
        : undefined,
    reason: record.reason != null ? record.reason : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
