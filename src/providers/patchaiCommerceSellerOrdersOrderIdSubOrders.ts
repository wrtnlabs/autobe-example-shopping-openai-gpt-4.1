import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import { IPageIAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSubOrder";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a paginated, filtered list of sub-orders for an order
 * (ai_commerce_sub_orders).
 *
 * Retrieves a paginated and filtered list of sub-orders that belong to the
 * order specified by {@link props.orderId}, where each sub-order is strictly
 * scoped to the authenticated seller and not accessible to other sellers.
 * Supports flexible filtering by status, shipping method, tracking number, and
 * creation date range, and always enforces seller and order authorization by
 * business rules.
 *
 * @param props - Function arguments
 * @param props.seller - Authenticated SellerPayload, representing the seller's
 *   buyer_id
 * @param props.orderId - UUID of the parent order whose sub-orders to list
 * @param props.body - Filtering, search, and paging parameters as
 *   IAiCommerceSubOrder.IRequest
 * @returns A paginated and filtered list of sub-orders matching the request for
 *   this seller's order
 * @throws {Error} If the authenticated seller account is not found or not
 *   active
 */
export async function patchaiCommerceSellerOrdersOrderIdSubOrders(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceSubOrder.IRequest;
}): Promise<IPageIAiCommerceSubOrder> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;

  // Lookup the seller account using buyer_id from authenticated payload
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: props.seller.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
    select: { id: true },
  });
  if (!sellerRow) {
    throw new Error(
      "Seller account not found or inactive—it is not permitted to access sub-orders.",
    );
  }

  // Build query filter for sub-orders (ignore any seller_id filter in body: only allow authenticated seller)
  const where = {
    deleted_at: null,
    order_id: props.orderId,
    seller_id: sellerRow.id,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.shipping_method !== undefined &&
      props.body.shipping_method !== null && {
        shipping_method: props.body.shipping_method,
      }),
    ...(props.body.tracking_number !== undefined &&
      props.body.tracking_number !== null && {
        tracking_number: props.body.tracking_number,
      }),
    ...((props.body.from_date !== undefined && props.body.from_date !== null) ||
    (props.body.to_date !== undefined && props.body.to_date !== null)
      ? {
          created_at: {
            ...(props.body.from_date !== undefined &&
              props.body.from_date !== null && { gte: props.body.from_date }),
            ...(props.body.to_date !== undefined &&
              props.body.to_date !== null && { lte: props.body.to_date }),
          },
        }
      : {}),
  };

  // Query paginated result and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_sub_orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_sub_orders.count({ where }),
  ]);

  // Map DB rows to API DTO with correct date branding
  const data = rows.map(
    (row): IAiCommerceSubOrder => ({
      id: row.id,
      order_id: row.order_id,
      seller_id: row.seller_id,
      suborder_code: row.suborder_code,
      status: row.status,
      shipping_method: row.shipping_method ?? undefined,
      tracking_number: row.tracking_number ?? undefined,
      total_price: row.total_price,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
