import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a trending product entry by ID (ai_commerce_trending_products).
 *
 * Removes a trending product record from the database, immediately unmarking
 * the given product as trending. This operation is accessible exclusively to
 * system administrators and impacts recommendation, discovery, and business
 * analytics flows in real-time. If the trending record does not exist, the
 * function throws an error (handled as 404 by the framework). Deletion is
 * permanent, as the table does not support soft delete. Compliance logging is
 * outside scope.
 *
 * @param props - Object containing admin authentication context and the unique
 *   trendingProductId.
 * @param props.admin - Authenticated admin user, validated for authorization.
 * @param props.trendingProductId - UUID for the trending product record to
 *   delete.
 * @returns Void
 * @throws {Error} If the trending product is not found by the given ID.
 */
export async function deleteaiCommerceAdminTrendingProductsTrendingProductId(props: {
  admin: AdminPayload;
  trendingProductId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { trendingProductId } = props;
  const trending =
    await MyGlobal.prisma.ai_commerce_trending_products.findUnique({
      where: {
        id: trendingProductId,
      },
    });
  if (!trending) {
    throw new Error("Trending product entry not found");
  }
  await MyGlobal.prisma.ai_commerce_trending_products.delete({
    where: {
      id: trendingProductId,
    },
  });
}
