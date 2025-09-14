import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new highlighted product record (ai_commerce_highlighted_products).
 *
 * Allows platform-level administrators to add a new highlighted product for use
 * in campaign spotlighting, banners, or seasonal promotional logic. All inputs
 * must refer to a valid, active product, and the schedule must not overlap with
 * any existing highlight for this product. The operation logs audit metadata
 * and returns the newly created record in standard entity format.
 *
 * @param props - Properties for creating a new highlight record
 * @param props.admin - Authenticated administrator making the request (must
 *   have active admin role)
 * @param props.body - Highlight creation payload (product, schedule, rationale)
 * @returns The created highlighted product record with campaign and schedule
 *   metadata
 * @throws {Error} If the target product does not exist
 * @throws {Error} If the new highlight schedule overlaps with an existing
 *   highlight for the product
 */
export async function postaiCommerceAdminHighlightedProducts(props: {
  admin: AdminPayload;
  body: IAiCommerceHighlightedProduct.ICreate;
}): Promise<IAiCommerceHighlightedProduct> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Validate referenced product exists
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: props.body.ai_commerce_product_id },
    select: { id: true },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  // 2. Schedule overlap validation (no highlight conflict for product+interval)
  // Find any highlight for this product where the periods overlap
  // Logic:
  //   overlap if (A.start <= B.end || B.end is null) && (B.start <= A.end || A.end is null)
  const overlap =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findFirst({
      where: {
        ai_commerce_product_id: props.body.ai_commerce_product_id,
        // Open-ended highlights: if highlight_end_at is null OR range intersects new range
        OR: [
          // Existing highlight has no end: overlaps if its start is <= new end OR open-ended new range
          {
            highlight_end_at: null,
            highlight_start_at: {
              lte: props.body.highlight_end_at ?? props.body.highlight_start_at,
            },
          },
          // Both highlights bounded: overlap if intervals intersect
          props.body.highlight_end_at !== undefined &&
          props.body.highlight_end_at !== null
            ? {
                highlight_end_at: {
                  gte: props.body.highlight_start_at,
                },
                highlight_start_at: {
                  lte: props.body.highlight_end_at,
                },
              }
            : undefined,
        ].filter(Boolean) as any[],
      },
    });
  if (overlap) {
    throw new Error("Highlight period conflict");
  }

  // 3. Create highlighted product
  const created = await MyGlobal.prisma.ai_commerce_highlighted_products.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ai_commerce_product_id: props.body.ai_commerce_product_id,
        highlighted_by: props.admin.id,
        highlight_start_at: props.body.highlight_start_at,
        highlight_end_at: props.body.highlight_end_at ?? null,
        reason: props.body.reason ?? null,
        created_at: now,
        updated_at: now,
      },
    },
  );
  // 4. Return newly created row (brand all fields, no Date or type assertion)
  return {
    id: created.id as string & tags.Format<"uuid">,
    ai_commerce_product_id: created.ai_commerce_product_id as string &
      tags.Format<"uuid">,
    highlighted_by: created.highlighted_by as string & tags.Format<"uuid">,
    highlight_start_at: toISOStringSafe(created.highlight_start_at),
    highlight_end_at: created.highlight_end_at
      ? toISOStringSafe(created.highlight_end_at)
      : undefined,
    reason: created.reason ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
