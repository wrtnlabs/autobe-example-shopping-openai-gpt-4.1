import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderSnapshotLog";
import { IPageIAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderSnapshotLog";
import { SellerPayload } from "../decorators/payload/SellerPayload";

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
 * @param props - Parameters for this operation, including seller payload,
 *   orderId as a UUID, and filter/pagination options in the body
 * @param props.seller - Authenticated seller role payload (must be the seller
 *   of at least one item in the order)
 * @param props.orderId - UUID of the order to retrieve snapshots for
 * @param props.body - Filters, search criteria, and pagination options matching
 *   IAiCommerceOrderSnapshotLog.IRequest
 * @returns Paginated list of order snapshot logs
 *   (IPageIAiCommerceOrderSnapshotLog)
 * @throws {Error} If the seller does not have any items in the target order or
 *   if access is not permitted
 */
export async function patchaiCommerceSellerOrdersOrderIdSnapshots(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderSnapshotLog.IRequest;
}): Promise<IPageIAiCommerceOrderSnapshotLog> {
  const { seller, orderId, body } = props;

  // Authorization: ensure seller has at least one item in target order
  const authorized = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      order_id: orderId,
      seller_id: seller.id,
    },
    select: { id: true },
  });
  if (!authorized) {
    throw new Error("Forbidden: seller has no items in this order");
  }

  // Safe pagination fields
  const pageRaw = body.page;
  const limitRaw = body.limit;
  const page = typeof pageRaw === "number" && pageRaw > 0 ? pageRaw : 1;
  const limit = typeof limitRaw === "number" && limitRaw > 0 ? limitRaw : 20;
  const skip = (page - 1) * limit;

  // Build where condition strictly by schema (handle null/undefined)
  const where: Record<string, unknown> = {
    order_id: orderId,
    ...(body.snapshotType !== undefined &&
      body.snapshotType !== null && {
        capture_type: body.snapshotType,
      }),
    ...(body.actorId !== undefined &&
      body.actorId !== null && {
        actor_id: body.actorId,
      }),
    ...((body.fromDate !== undefined && body.fromDate !== null) ||
    (body.toDate !== undefined && body.toDate !== null)
      ? {
          captured_at: {
            ...(body.fromDate !== undefined &&
              body.fromDate !== null && {
                gte: body.fromDate,
              }),
            ...(body.toDate !== undefined &&
              body.toDate !== null && {
                lte: body.toDate,
              }),
          },
        }
      : {}),
  };

  // Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_snapshot_logs.findMany({
      where,
      orderBy: { captured_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_snapshot_logs.count({ where }),
  ]);

  // Map each row to IAiCommerceOrderSnapshotLog structure
  const data: IAiCommerceOrderSnapshotLog[] = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    capture_type: row.capture_type,
    actor_id: row.actor_id,
    captured_at: toISOStringSafe(row.captured_at),
    entity_json: row.entity_json,
  }));

  // Correct type mapping for pagination fields
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 1,
  };

  return {
    pagination,
    data,
  };
}
