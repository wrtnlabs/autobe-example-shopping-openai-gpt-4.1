import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderFulfillments";
import { IPageIAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderFulfillments";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * List and search fulfillment actions (ai_commerce_order_fulfillments) for an
 * order.
 *
 * This operation lists the fulfillment actions for a specific order, supporting
 * advanced filtering, search, and pagination for cases of staged, split, or
 * partial deliveries. Queries the ai_commerce_order_fulfillments table,
 * presenting events such as shipping, delivery, returns, or failed attempts.
 * The endpoint supports filters for sub-order, carrier, fulfillment status, and
 * date/time. Pagination is implemented for efficiency on large/long-running
 * orders. Access is granted only to sellers who own the sub-orders for the
 * specified order.
 *
 * @param props - Handler input
 * @param props.seller - Authenticated seller payload
 * @param props.orderId - Target order's UUID
 * @param props.body - Filter and pagination parameters
 * @returns Paginated list of fulfillment records for the order accessible to
 *   seller
 * @throws {Error} If seller/account or order access is invalid
 */
export async function patchaiCommerceSellerOrdersOrderIdFulfillments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderFulfillments.IRequest;
}): Promise<IPageIAiCommerceOrderFulfillments> {
  const { seller, orderId, body } = props;

  // Step 1: Resolve seller's actual seller_id via buyer_id
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: seller.id },
    select: { id: true },
  });
  if (!sellerRow) {
    throw new Error("Seller account not found");
  }

  // Step 2: List suborder/item IDs the seller owns for this order
  const orderItems = await MyGlobal.prisma.ai_commerce_order_items.findMany({
    where: {
      order_id: orderId,
      seller_id: sellerRow.id,
    },
    select: { id: true },
  });
  if (orderItems.length === 0) {
    // Seller has no rights to any items for this order
    return {
      pagination: {
        current: Number(body.page ?? 1) as number,
        limit: Number(body.limit ?? 20) as number,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const allowedSuborderIds = orderItems.map((i) => i.id);

  // Step 3: Build Prisma where clause for fulfillments
  const where: Record<string, unknown> = {
    order_id: orderId,
    suborder_id: { in: allowedSuborderIds },
  };
  if (body.suborder_id) {
    where.suborder_id = body.suborder_id;
  }
  if (body.status) {
    where.status = body.status;
  }
  if (body.carrier) {
    where.carrier = body.carrier;
  }
  if (body.from_date || body.to_date) {
    where.fulfilled_at = {
      ...(body.from_date && { gte: body.from_date }),
      ...(body.to_date && { lte: body.to_date }),
    };
  }
  if (body.search) {
    where.fulfillment_code = { contains: body.search };
  }

  // Step 4: Pagination (enforce int32, minimum 0)
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Step 5: Query paginated results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_fulfillments.findMany({
      where,
      orderBy: { fulfilled_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_fulfillments.count({ where }),
  ]);

  // Step 6: Transform results to DTO structure
  const data: IAiCommerceOrderFulfillments[] = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    // suborder_id: nullable, use undefined if null
    suborder_id: row.suborder_id ?? undefined,
    fulfillment_code: row.fulfillment_code,
    status: row.status,
    carrier: row.carrier,
    // carrier_contact: nullable, use undefined if null
    carrier_contact: row.carrier_contact ?? undefined,
    fulfilled_at: toISOStringSafe(row.fulfilled_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Step 7: Return paginated response with branded types
  return {
    pagination: {
      current: Number(page) as number,
      limit: Number(limit) as number,
      records: Number(total) as number,
      pages: Math.ceil(total / limit) as number,
    },
    data,
  };
}
