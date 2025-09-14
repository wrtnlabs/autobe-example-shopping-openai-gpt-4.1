import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { IPageIAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List all refunds for a specific order with search and pagination from
 * ai_commerce_order_refunds.
 *
 * This operation retrieves a paginated, filtered listing of order refund
 * records associated with a specific order. It supports advanced search,
 * filtering, and sorting while strictly enforcing type and business constraints
 * for system admins.
 *
 * @param props - The request object
 * @param props.admin - Authenticated admin user requesting the refund list
 * @param props.orderId - Order UUID whose refunds are listed
 * @param props.body - Advanced search, filter, and paging parameters
 * @returns Paginated list of IAiCommerceOrderRefund records for this order
 *   (with correct type and null policies)
 * @throws {Error} If the order does not exist
 */
export async function patchaiCommerceAdminOrdersOrderIdRefunds(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderRefund.IRequest;
}): Promise<IPageIAiCommerceOrderRefund> {
  const { admin, orderId, body } = props;

  // Verify that the order exists
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) throw new Error("Order not found");

  // Enforce page and limit bounds according to the DTO spec (page >= 1, 1 <= limit <= 100)
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 20;
  const skip = (page - 1) * limit;

  // Only allow sort_by on real keys
  const sortableFields = [
    "requested_at",
    "resolved_at",
    "amount",
    "id",
    "status",
    "refund_code",
  ]; // Material fields from schema
  const sortField = sortableFields.includes(body.sort_by || "")
    ? (body.sort_by as (typeof sortableFields)[number])
    : "requested_at";
  const sortOrder: "asc" | "desc" = body.sort_order === "asc" ? "asc" : "desc";
  const orderBy = { [sortField]: sortOrder };

  // Filtering logic
  const where: Record<string, unknown> = { order_id: orderId };
  if (Array.isArray(body.status) && body.status.length > 0) {
    where["status"] = { in: body.status };
  }
  if (typeof body.refund_code === "string" && body.refund_code.length > 0) {
    where["refund_code"] = { contains: body.refund_code };
  }
  if (typeof body.actor_id === "string" && body.actor_id.length > 0) {
    where["actor_id"] = body.actor_id;
  }
  if (
    typeof body.min_amount === "number" ||
    typeof body.max_amount === "number"
  ) {
    where["amount"] = {
      ...(typeof body.min_amount === "number" ? { gte: body.min_amount } : {}),
      ...(typeof body.max_amount === "number" ? { lte: body.max_amount } : {}),
    };
  }
  if (
    typeof body.requested_after === "string" &&
    body.requested_after.length > 0
  ) {
    if (!where["requested_at"]) where["requested_at"] = {};
    (where["requested_at"] as Record<string, string>)["gte"] =
      body.requested_after;
  }
  if (
    typeof body.requested_before === "string" &&
    body.requested_before.length > 0
  ) {
    if (!where["requested_at"]) where["requested_at"] = {};
    (where["requested_at"] as Record<string, string>)["lte"] =
      body.requested_before;
  }
  // Advanced search (search in reason or refund_code)
  if (typeof body.search === "string" && body.search.length > 0) {
    where["OR"] = [
      { reason: { contains: body.search } },
      { refund_code: { contains: body.search } },
    ];
  }

  // Query the database for results and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_refunds.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        order_id: true,
        actor_id: true,
        refund_code: true,
        reason: true,
        status: true,
        amount: true,
        currency: true,
        requested_at: true,
        resolved_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_order_refunds.count({ where }),
  ]);

  const data: IAiCommerceOrderRefund[] = records.map((refund) => ({
    id: refund.id,
    order_id: refund.order_id,
    actor_id: refund.actor_id,
    refund_code: refund.refund_code,
    reason: refund.reason ?? undefined,
    status: refund.status,
    amount: refund.amount,
    currency: refund.currency,
    requested_at: toISOStringSafe(refund.requested_at),
    resolved_at: refund.resolved_at
      ? toISOStringSafe(refund.resolved_at)
      : undefined,
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
