import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { IPageIAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderAfterSales";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and list after-sales service events (ai_commerce_order_after_sales)
 * linked to an order.
 *
 * Provides paginated, filterable access to all after-sales (return, exchange,
 * dispute, warranty, etc.) cases linked to a single order from the seller view.
 * Supports advanced search by type, status, actor, time range, and free-form
 * query. Every result contains full after-sales context and proper date
 * handling. Seller authentication enforced via SellerPayload
 * (decorator/authorize).
 *
 * @param props - Provider props including SellerPayload, target order UUID, and
 *   filter/search inputs
 * @param props.seller - The authenticated seller (top-level user/B2C identity)
 * @param props.orderId - UUID of the order whose after-sales are being listed
 * @param props.body - Filter/search/pagination input
 * @returns Paginated page of after-sales event summaries with proper type
 *   branding
 * @throws {Error} If Prisma query fails or database is unavailable
 */
export async function patchaiCommerceSellerOrdersOrderIdAfterSales(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.IRequest;
}): Promise<IPageIAiCommerceOrderAfterSales> {
  const { seller, orderId, body } = props;

  // Defensive defaulting for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Only number for skip/take
  const skip = (page - 1) * limit;

  // Defensive filter construction for required/optional fields
  const where = {
    order_id: orderId,
    deleted_at: null,
    ...(body.type !== undefined && body.type !== null && { type: body.type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.order_item_id !== undefined &&
      body.order_item_id !== null && { order_item_id: body.order_item_id }),
    // Free-form search in 'note' field
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        note: { contains: body.search }, // No mode property - SQLite safe
      }),
    // Date range for opened_at
    ...((body.from_opened_at !== undefined && body.from_opened_at !== null) ||
    (body.to_opened_at !== undefined && body.to_opened_at !== null)
      ? {
          opened_at: {
            ...(body.from_opened_at !== undefined &&
              body.from_opened_at !== null && { gte: body.from_opened_at }),
            ...(body.to_opened_at !== undefined &&
              body.to_opened_at !== null && { lte: body.to_opened_at }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_after_sales.findMany({
      where,
      orderBy: { opened_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_after_sales.count({ where }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      order_id: row.order_id,
      actor_id: row.actor_id,
      type: row.type,
      status: row.status,
      opened_at: toISOStringSafe(row.opened_at),
      closed_at: row.closed_at ? toISOStringSafe(row.closed_at) : undefined,
      order_item_id: row.order_item_id ?? undefined,
      note: row.note ?? undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
