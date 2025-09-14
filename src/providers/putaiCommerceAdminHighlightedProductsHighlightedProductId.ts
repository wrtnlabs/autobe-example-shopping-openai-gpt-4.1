import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a specific highlighted product entry in the discovery business table
 *
 * This operation modifies an existing highlighted product within the
 * ai_commerce_highlighted_products table, allowing an admin to update the
 * highlight scheduling window, campaign reason, and related product metadata.
 * Only users with admin authentication may perform this update. If the
 * specified highlight does not exist, an error is thrown. Updates are
 * restricted to the fields defined by IAiCommerceHighlightedProduct.IUpdate,
 * and the operation enforces full date/time type branding and null/undefined
 * compatibility.
 *
 * All date and time values are handled as ISO 8601 branded strings; the
 * function never uses the native Date type, conforms to strict null vs
 * undefined rules, and does not use any unsafe type assertion. The updated_at
 * timestamp is set to the current time.
 *
 * @param props - The operation payload
 * @param props.admin - Authenticated admin user (authorization checked by
 *   AdminAuth decorator)
 * @param props.highlightedProductId - The UUID identifying the highlighted
 *   product entry
 * @param props.body - The patch/update data for the highlighted product
 * @returns The updated IAiCommerceHighlightedProduct record with correct
 *   date/time and null/undefined semantics
 * @throws {Error} If the highlighted product record does not exist
 */
export async function putaiCommerceAdminHighlightedProductsHighlightedProductId(props: {
  admin: AdminPayload;
  highlightedProductId: string & tags.Format<"uuid">;
  body: IAiCommerceHighlightedProduct.IUpdate;
}): Promise<IAiCommerceHighlightedProduct> {
  const { admin, highlightedProductId, body } = props;

  // Fetch the highlighted product, ensure it exists
  const existing =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findUnique({
      where: { id: highlightedProductId },
    });
  if (!existing) {
    throw new Error("Highlighted product not found");
  }

  // Prepare updated_at timestamp (reused for both db and return)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Prepare data object directly for clear property-level errors
  const updated = await MyGlobal.prisma.ai_commerce_highlighted_products.update(
    {
      where: { id: highlightedProductId },
      data: {
        // Only apply field if present in request body
        ...(body.highlight_start_at !== undefined && {
          highlight_start_at: toISOStringSafe(body.highlight_start_at),
        }),
        ...(body.highlight_end_at !== undefined && {
          // Accepts ISO date string or null; do not convert null
          highlight_end_at:
            body.highlight_end_at === null
              ? null
              : toISOStringSafe(body.highlight_end_at),
        }),
        ...(body.reason !== undefined && {
          reason: body.reason,
        }),
        ...(body.ai_commerce_product_id !== undefined && {
          ai_commerce_product_id: body.ai_commerce_product_id,
        }),
        ...(body.highlighted_by !== undefined && {
          highlighted_by: body.highlighted_by,
        }),
        updated_at: now,
      },
    },
  );

  // Build return value, applying toISOStringSafe to every date property and honoring Brand/null/undefined rules
  return {
    id: updated.id,
    ai_commerce_product_id: updated.ai_commerce_product_id,
    highlighted_by: updated.highlighted_by,
    highlight_start_at: toISOStringSafe(updated.highlight_start_at),
    // highlight_end_at is optional/nullable: only provide if present, preserve null as-is, else undefined
    ...(updated.highlight_end_at !== undefined && {
      highlight_end_at:
        updated.highlight_end_at === null
          ? null
          : toISOStringSafe(updated.highlight_end_at),
    }),
    // reason is optional/nullable: only provide if present, preserve null as-is, else undefined
    ...(updated.reason !== undefined && {
      reason: updated.reason === null ? null : updated.reason,
    }),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
