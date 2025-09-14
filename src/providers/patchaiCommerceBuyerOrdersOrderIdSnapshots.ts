import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderSnapshotLog";
import { IPageIAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderSnapshotLog";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and list all historical snapshot logs for a specific order from
 * ai_commerce_order_snapshot_logs.
 *
 * Retrieve historical order state snapshots for a given orderId, supporting
 * compliance, audit, and advanced troubleshooting. This endpoint allows for
 * search, filter, sort, and pagination through POST body query parameters as
 * defined in IAiCommerceOrderSnapshotLog.IRequest. The output matches
 * IPageIAiCommerceOrderSnapshotLog structure, including all required order
 * snapshot data.
 *
 * Historical snapshots are used for forensics, compliance review, order
 * recovery, dispute investigation, and business analytics. Only authorized
 * stakeholders (buyer, seller, or admin) can access the snapshot log. All
 * accesses are audit-logged. Error conditions—such as non-existent orders or
 * unauthorized access—produce appropriate error codes and descriptive messages,
 * with no exposure of sensitive snapshot content to unauthenticated or
 * unauthorized users.
 *
 * @param props - Contains the authenticated buyer, the orderId from the path
 *   parameter, and body with filter/pagination controls.
 * @param props.buyer - The authenticated buyer making the request.
 * @param props.orderId - UUID string referencing the ai_commerce_orders.id
 *   being queried for snapshots.
 * @param props.body - The request body, matching
 *   IAiCommerceOrderSnapshotLog.IRequest.
 * @returns Paginated list of historical order snapshot logs for the target
 *   order, matching IPageIAiCommerceOrderSnapshotLog schema.
 * @throws {Error} If the order does not exist, or the buyer is not authorized
 *   to view it.
 */
export async function patchaiCommerceBuyerOrdersOrderIdSnapshots(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderSnapshotLog.IRequest;
}): Promise<IPageIAiCommerceOrderSnapshotLog> {
  const { buyer, orderId, body } = props;
  // 1. Verify order exists and the buyer is the owner
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: { id: true, buyer_id: true },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error(
      "Order not found or you are not authorized to view this order",
    );
  }

  // 2. Setup pagination
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  const skip = (page - 1) * limit;

  // 3. Build where clause functionally for all filters, ensuring only present fields are included
  const capturedAtRange =
    body.fromDate !== undefined || body.toDate !== undefined
      ? {
          ...(body.fromDate !== undefined && { gte: body.fromDate }),
          ...(body.toDate !== undefined && { lte: body.toDate }),
        }
      : undefined;
  const where = {
    order_id: orderId,
    ...(body.snapshotType !== undefined &&
      body.snapshotType !== null && { capture_type: body.snapshotType }),
    ...(body.actorId !== undefined &&
      body.actorId !== null && { actor_id: body.actorId }),
    ...(capturedAtRange !== undefined && { captured_at: capturedAtRange }),
  };

  // 4. Query snapshots and total count
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_snapshot_logs.count({ where }),
    MyGlobal.prisma.ai_commerce_order_snapshot_logs.findMany({
      where,
      orderBy: { captured_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  // 5. Map rows to IAiCommerceOrderSnapshotLog[], brand date fields properly
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    capture_type: row.capture_type,
    actor_id: row.actor_id,
    captured_at: toISOStringSafe(row.captured_at),
    entity_json: row.entity_json,
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
