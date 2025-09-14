import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSnapshot";
import { IPageIAiCommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search product snapshot history for a product
 * (ai_commerce_product_snapshots).
 *
 * Returns a paginated, filterable list of immutable product snapshots
 * representing every historical state captured for the given product. Supports
 * compliance audits, rollback, and business intelligence. Only system
 * administrators (admin role) may access this endpoint. Attempts to view
 * non-existent products will throw an error.
 *
 * @param props - Parameters for product snapshot history retrieval
 * @param props.admin - Authenticated admin payload requesting the operation
 * @param props.productId - UUID of the product whose snapshot history is being
 *   queried
 * @param props.body - Search filters and pagination options (event_type,
 *   actor_id, page, limit)
 * @returns Paginated snapshot history for the requested product
 * @throws {Error} When the product does not exist or the user is not an
 *   administrator
 */
export async function patchaiCommerceAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSnapshot.IRequest;
}): Promise<IPageIAiCommerceProductSnapshot> {
  const { admin, productId, body } = props;

  // 1. Ensure product exists
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId },
  });
  if (!product) throw new Error("Product not found");

  // 2. Filter/sanitize inputs
  const page = body?.page ?? 1;
  const limit = body?.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Construct filters
  const where = {
    product_id: productId,
    ...(body?.event_type !== undefined && { event_type: body.event_type }),
    ...(body?.actor_id !== undefined && { actor_id: body.actor_id }),
  };

  // 4. Fetch data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_snapshots.count({ where }),
  ]);

  // 5. Map database rows to IAiCommerceProductSnapshot (with branded date)
  const data = rows.map(
    (row): IAiCommerceProductSnapshot => ({
      id: row.id,
      product_id: row.product_id,
      event_type: row.event_type,
      actor_id: row.actor_id,
      snapshot_json: row.snapshot_json,
      created_at: toISOStringSafe(row.created_at),
    }),
  );

  // 6. Assemble IPage.IAiCommerceProductSnapshot response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
