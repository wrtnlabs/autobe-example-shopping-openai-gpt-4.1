import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { IPageIAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and retrieve a paginated, filtered list of order items for a specific
 * order (ai_commerce_order_items).
 *
 * This API retrieves a paginated, filtered list of order items belonging to an
 * order and restricted to the seller's assigned fulfillment segments. It
 * supports filtering by product name (partial match), delivery status,
 * quantity, and created date range. Sellers may only retrieve the order items
 * where they are the assigned seller and cannot view or touch other sellers'
 * segments in a split order scenario.
 *
 * - Only items with seller_id matching the authenticated seller are included
 * - All date/datetime values are formatted as ISO strings and branded correctly
 * - Pagination is supported with defaults (page=1, limit=20) and a maximum cap
 * - Fields not present in schema are never accessed or mutated
 * - No use of native Date type or 'as' type assertions
 *
 * @param props - Seller: SellerPayload for authenticated seller (must match
 *   ai_commerce_buyer.id for seller) orderId: string (uuid) for the order whose
 *   items are requested body: filter/query object supporting partial and ranged
 *   search, per IAiCommerceOrderItem.IRequest
 * @returns Paginated list of IAiCommerceOrderItem and pagination meta
 * @throws {Error} If database access or internal privilege logic fails
 */
export async function patchaiCommerceSellerOrdersOrderIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderItem.IRequest;
}): Promise<IPageIAiCommerceOrderItem> {
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 50;

  // Since there are no page/limit in IRequest, use only defaults
  const page = DEFAULT_PAGE;
  const limit = DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  // Build where clause for search/filter
  const quantityRange =
    props.body.min_quantity !== undefined &&
    props.body.max_quantity !== undefined
      ? { gte: props.body.min_quantity, lte: props.body.max_quantity }
      : props.body.min_quantity !== undefined
        ? { gte: props.body.min_quantity }
        : props.body.max_quantity !== undefined
          ? { lte: props.body.max_quantity }
          : undefined;

  const createdAtRange =
    props.body.created_start !== undefined &&
    props.body.created_end !== undefined
      ? { gte: props.body.created_start, lte: props.body.created_end }
      : props.body.created_start !== undefined
        ? { gte: props.body.created_start }
        : props.body.created_end !== undefined
          ? { lte: props.body.created_end }
          : undefined;

  // Main where clause
  const where = {
    order_id: props.orderId,
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.product_name !== undefined &&
      props.body.product_name !== null && {
        name: { contains: props.body.product_name },
      }),
    ...(props.body.delivery_status !== undefined &&
      props.body.delivery_status !== null && {
        delivery_status: props.body.delivery_status,
      }),
    ...(quantityRange !== undefined && { quantity: quantityRange }),
    ...(createdAtRange !== undefined && { created_at: createdAtRange }),
  };

  // Query DB in parallel (rows and total count)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_items.count({ where }),
  ]);

  // Format results and paginate
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      order_id: row.order_id,
      product_variant_id: row.product_variant_id,
      seller_id: row.seller_id === null ? undefined : row.seller_id,
      item_code: row.item_code,
      name: row.name,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total_price: row.total_price,
      delivery_status: row.delivery_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
    })),
  };
}
