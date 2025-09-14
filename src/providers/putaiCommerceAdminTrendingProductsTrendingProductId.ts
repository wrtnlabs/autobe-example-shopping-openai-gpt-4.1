import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTrendingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTrendingProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update details of an existing trending product
 * (ai_commerce_trending_products).
 *
 * This endpoint allows an administrator to update the analytics score and/or
 * manual override status on a trending product entry. The operation is strictly
 * restricted to admins, and is intended for precise business control over
 * product discoverability beyond what raw analytics alone would drive. The
 * function verifies the existence of the trending record, applies allowed
 * updates, and returns the freshly updated entry, ensuring all date fields are
 * RFC3339 ISO strings as required by API DTO.
 *
 * @param props - Admin: The authenticated admin user performing the update
 *   trendingProductId: The UUID of the trending product record to update body:
 *   Optional fields to patch (analytics_score, is_manual_override)
 * @returns The updated IAiCommerceTrendingProduct object reflecting new values
 * @throws {Error} If the trending product is not found by id
 */
export async function putaiCommerceAdminTrendingProductsTrendingProductId(props: {
  admin: AdminPayload;
  trendingProductId: string & tags.Format<"uuid">;
  body: IAiCommerceTrendingProduct.IUpdate;
}): Promise<IAiCommerceTrendingProduct> {
  const { trendingProductId, body } = props;
  const trendingProduct =
    await MyGlobal.prisma.ai_commerce_trending_products.findUnique({
      where: { id: trendingProductId },
    });
  if (trendingProduct === null) {
    throw new Error("Trending product not found");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_trending_products.update({
    where: { id: trendingProductId },
    data: {
      ...(body.analytics_score !== undefined && {
        analytics_score: body.analytics_score,
      }),
      ...(body.is_manual_override !== undefined && {
        is_manual_override: body.is_manual_override,
      }),
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    ai_commerce_product_id: updated.ai_commerce_product_id,
    analytics_score: updated.analytics_score,
    is_manual_override: updated.is_manual_override,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
