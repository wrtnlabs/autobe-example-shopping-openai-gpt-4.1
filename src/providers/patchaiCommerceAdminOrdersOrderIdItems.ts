import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { IPageIAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated, filtered list of order items for a specific
 * order (ai_commerce_order_items).
 *
 * This endpoint allows an authenticated admin to query all items associated
 * with an order, supporting rich filtering and pagination. Queries are
 * restricted to items where order_id matches the provided parameter; admin
 * global access is enforced via authentication.
 *
 * - Supports dynamic query parameters (product name, delivery status, seller,
 *   quantity/min/max, creation date range).
 * - Paginates results and provides total record count for UI display.
 * - All date fields are string & tags.Format<'date-time'>; all UUIDs as string &
 *   tags.Format<'uuid'>.
 * - Does not modify or mutate items; strictly a search/read operation.
 *
 * @param props - Function parameters
 * @param props.admin - Authenticated admin payload (global access required)
 * @param props.orderId - The unique order UUID for which to search order items
 * @param props.body - Filtering/pagination request parameters (see
 *   IAiCommerceOrderItem.IRequest)
 * @returns Paginated list of order items for given orderId
 * @throws {Error} If an unexpected database error occurs
 */
export async function patchaiCommerceAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderItem.IRequest;
}): Promise<IPageIAiCommerceOrderItem> {
  const { admin, orderId, body } = props;
  // Extract page & limit if provided, otherwise default
  const page =
    typeof (body as any).page === "number" && (body as any).page > 0
      ? Number((body as any).page)
      : 1;
  const limit =
    typeof (body as any).limit === "number" && (body as any).limit > 0
      ? Number((body as any).limit)
      : 20;
  const skip = (page - 1) * limit;

  // Build where clause (all conditions inline for type safety)
  const where = {
    order_id: orderId,
    deleted_at: null,
    ...(body.product_name !== undefined &&
      body.product_name !== null &&
      body.product_name.length > 0 && {
        name: { contains: body.product_name },
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null &&
      body.delivery_status.length > 0 && {
        delivery_status: body.delivery_status,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        seller_id: body.seller_id,
      }),
    ...(body.min_quantity !== undefined &&
      body.min_quantity !== null && {
        quantity: { gte: body.min_quantity },
      }),
    ...(body.max_quantity !== undefined &&
      body.max_quantity !== null && {
        quantity: {
          ...(body.min_quantity !== undefined &&
            body.min_quantity !== null && { gte: body.min_quantity }),
          lte: body.max_quantity,
        },
      }),
    ...(body.created_start !== undefined &&
      body.created_start !== null && {
        created_at: { gte: toISOStringSafe(body.created_start) },
      }),
    ...(body.created_end !== undefined &&
      body.created_end !== null && {
        created_at: {
          ...(body.created_start !== undefined &&
            body.created_start !== null && {
              gte: toISOStringSafe(body.created_start),
            }),
          lte: toISOStringSafe(body.created_end),
        },
      }),
  };
  // Query DB for records and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.ai_commerce_order_items.count({ where }),
  ]);
  // Map all results to DTO, handling branding & nullable fields
  const data = records.map((item) => ({
    id: item.id,
    order_id: item.order_id,
    product_variant_id: item.product_variant_id,
    seller_id: item.seller_id === null ? undefined : item.seller_id,
    item_code: item.item_code,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    delivery_status: item.delivery_status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at === null ? undefined : toISOStringSafe(item.deleted_at),
  }));
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
