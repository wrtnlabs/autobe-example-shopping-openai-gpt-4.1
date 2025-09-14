import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTrendingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTrendingProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new trending product entry in ai_commerce_trending_products.
 *
 * Only system administrators (admins) can access this endpoint. This operation
 * promotes a product to trending status, either by analytics score or manual
 * override.
 *
 * Input validation ensures:
 *
 * - The referenced product exists, is active, and not deleted
 * - A trending entry does not already exist for the given product
 * - Analytics score is provided
 * - Optional manual override flag is handled (defaults to false)
 *
 * All date-related values are managed as string & tags.Format<'date-time'>.
 *
 * @param props - Request props. Must include:
 *
 *   - Admin: Authenticated AdminPayload
 *   - Body: IAiCommerceTrendingProduct.ICreate
 *
 * @returns The created trending product record
 * @throws {Error} If the product does not exist, is not active, has been
 *   deleted, or a trending entry already exists
 */
export async function postaiCommerceAdminTrendingProducts(props: {
  admin: AdminPayload;
  body: IAiCommerceTrendingProduct.ICreate;
}): Promise<IAiCommerceTrendingProduct> {
  const { admin, body } = props;

  // Validate product exists, is active, and not deleted
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: body.ai_commerce_product_id,
      status: "active",
      deleted_at: null,
    },
  });
  if (!product) {
    throw new Error(
      "Product does not exist, is not active, or has been deleted",
    );
  }

  // Enforce uniqueness: only one trending entry per product allowed
  const duplicate =
    await MyGlobal.prisma.ai_commerce_trending_products.findFirst({
      where: { ai_commerce_product_id: body.ai_commerce_product_id },
    });
  if (duplicate) {
    throw new Error("A trending entry already exists for this product");
  }

  // Timestamp (ISO 8601 string)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new trending product entry
  const record = await MyGlobal.prisma.ai_commerce_trending_products.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ai_commerce_product_id: body.ai_commerce_product_id,
      analytics_score: body.analytics_score,
      is_manual_override: body.is_manual_override ?? false,
      created_at: now,
      updated_at: now,
    },
  });

  // Return result as IAiCommerceTrendingProduct
  return {
    id: record.id,
    ai_commerce_product_id: record.ai_commerce_product_id,
    analytics_score: record.analytics_score,
    is_manual_override: record.is_manual_override,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}
