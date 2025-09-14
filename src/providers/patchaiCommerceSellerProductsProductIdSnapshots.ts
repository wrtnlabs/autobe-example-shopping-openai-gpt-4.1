import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSnapshot";
import { IPageIAiCommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductSnapshot";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search product snapshot history for a product
 * (ai_commerce_product_snapshots).
 *
 * This endpoint returns a paginated, comprehensive history of all immutable
 * snapshots for a seller's product, strictly enforcing ownership and
 * authorization. The result allows sellers to audit version history, support
 * legal compliance, or prepare for rollback scenarios. Access is forbidden for
 * non-owners, with appropriate error signaling. Supports filtering by
 * event_type and actor, as well as page/limit controls.
 *
 * @param props - Operation properties
 * @param props.seller - Authenticated seller JWT payload (identity: buyer_id)
 * @param props.productId - Product UUID being queried for snapshot history
 * @param props.body - Advanced filtering/pagination for the query (event_type,
 *   actor_id, page, limit, etc.)
 * @returns Paginated record of historical product snapshots (immutable, each
 *   with event/audit metadata)
 * @throws {Error} If the product does not exist, or the requesting seller does
 *   not own it
 */
export async function patchaiCommerceSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSnapshot.IRequest;
}): Promise<IPageIAiCommerceProductSnapshot> {
  const { seller, productId, body } = props;

  // 1. Existence check: Does the product exist?
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId },
    select: { id: true, seller_id: true },
  });
  if (!product) throw new Error("Product not found");

  // 2. Get the seller's row (maps buyer_id => pk id)
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: seller.id },
    select: { id: true },
  });
  if (!sellerRow) throw new Error("Seller not found");

  // 3. Enforce ownership: only the owning seller can view snapshots
  if (product.seller_id !== sellerRow.id) {
    throw new Error("Forbidden: Seller does not own this product");
  }

  // 4. Pagination params: default page=1, limit=20, must strip branding for Prisma numeric params
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 5. Build filters (event_type, actor_id); ignore undefined filters
  const where = {
    product_id: productId,
    ...(body.event_type !== undefined ? { event_type: body.event_type } : {}),
    ...(body.actor_id !== undefined ? { actor_id: body.actor_id } : {}),
  };

  // 6. Parallel query for paged snapshot data and result count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
      select: {
        id: true,
        product_id: true,
        event_type: true,
        actor_id: true,
        snapshot_json: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_product_snapshots.count({ where }),
  ]);

  // 7. Build paged response: ensure dates use toISOStringSafe, all values correct format
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      event_type: row.event_type,
      actor_id: row.actor_id,
      snapshot_json: row.snapshot_json,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
