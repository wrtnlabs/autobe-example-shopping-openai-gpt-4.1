import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTrendingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTrendingProduct";

/**
 * Get detailed information for a specific trending product
 * (ai_commerce_trending_products).
 *
 * Fetches the complete detail for a single trending product entry given its
 * UUID. Returns analytics score, manual override flag, relevant product
 * reference, and created/updated timestamps. Throws if the trending product
 * does not exist.
 *
 * There is no authentication or authorization in this endpoint, but appropriate
 * conversion and schema rules are strictly enforced. All date/datetime fields
 * are provided as ISO string & tags.Format<'date-time'>. The operation supports
 * usage in both user-facing and administrative product discovery scenarios.
 *
 * @param props - Object containing the trendingProductId for the trending
 *   product record to retrieve
 * @param props.trendingProductId - The UUID of the trending product entry
 * @returns The full detail of the trending product as an
 *   IAiCommerceTrendingProduct
 * @throws {Error} If the trending product with the given id does not exist
 */
export async function getaiCommerceTrendingProductsTrendingProductId(props: {
  trendingProductId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceTrendingProduct> {
  const { trendingProductId } = props;
  const trendingProduct =
    await MyGlobal.prisma.ai_commerce_trending_products.findUniqueOrThrow({
      where: { id: trendingProductId },
      select: {
        id: true,
        ai_commerce_product_id: true,
        analytics_score: true,
        is_manual_override: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    id: trendingProduct.id,
    ai_commerce_product_id: trendingProduct.ai_commerce_product_id,
    analytics_score: trendingProduct.analytics_score,
    is_manual_override: trendingProduct.is_manual_override,
    created_at: toISOStringSafe(trendingProduct.created_at),
    updated_at: toISOStringSafe(trendingProduct.updated_at),
  };
}
