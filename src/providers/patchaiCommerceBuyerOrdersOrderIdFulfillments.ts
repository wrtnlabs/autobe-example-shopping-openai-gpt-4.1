import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderFulfillments";
import { IPageIAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderFulfillments";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * List and search fulfillment actions (ai_commerce_order_fulfillments) for an
 * order.
 *
 * Provides a paginated list and advanced search of all fulfillment actions
 * performed against a given order. Supports filtering by sub-order, fulfillment
 * status, carrier, time, and free-text tracking code. Only accessible to the
 * order's buyer. Enforces strict authorization.
 *
 * @param props -
 *
 *   - Buyer: BuyerPayload for the authenticated user
 *   - OrderId: order UUID for which to search fulfillments
 *   - Body: search/filter and pagination parameters
 *
 * @returns Paginated list of fulfillment events for the order
 * @throws {Error} If order does not exist or buyer is not authorized
 */
export async function patchaiCommerceBuyerOrdersOrderIdFulfillments(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderFulfillments.IRequest;
}): Promise<IPageIAiCommerceOrderFulfillments> {
  const { buyer, orderId, body } = props;
  // 1. Authorization: only the buyer who owns the order may access
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: { buyer_id: true },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error(
      "Unauthorized: You can only access your own order fulfillments",
    );
  }

  // 2. Pagination and filtering
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build Prisma filters
  const where = {
    order_id: orderId,
    ...(body.suborder_id !== undefined && body.suborder_id !== null
      ? { suborder_id: body.suborder_id }
      : {}),
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    ...(body.carrier !== undefined && body.carrier !== null
      ? { carrier: body.carrier }
      : {}),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          fulfilled_at: {
            ...(body.from_date !== undefined && body.from_date !== null
              ? { gte: body.from_date }
              : {}),
            ...(body.to_date !== undefined && body.to_date !== null
              ? { lte: body.to_date }
              : {}),
          },
        }
      : {}),
    ...(body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
      ? { fulfillment_code: { contains: body.search } }
      : {}),
  };

  // 4. Query DB (in parallel)
  const [fulfillments, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_fulfillments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fulfilled_at: "desc" },
      select: {
        id: true,
        order_id: true,
        suborder_id: true,
        fulfillment_code: true,
        status: true,
        carrier: true,
        carrier_contact: true,
        fulfilled_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_order_fulfillments.count({ where }),
  ]);

  // 5. Map to API DTO (convert dates to ISO string), handle undefined/null
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: fulfillments.map((row) => ({
      id: row.id,
      order_id: row.order_id,
      suborder_id: row.suborder_id === null ? undefined : row.suborder_id,
      fulfillment_code: row.fulfillment_code,
      status: row.status,
      carrier: row.carrier,
      carrier_contact:
        row.carrier_contact === null ? undefined : row.carrier_contact,
      fulfilled_at: toISOStringSafe(row.fulfilled_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
