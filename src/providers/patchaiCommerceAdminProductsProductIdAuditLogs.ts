import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductAuditLog";
import { IPageIAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve audit logs of a product (ai_commerce_product_audit_logs).
 *
 * Provides filtered and paginated retrieval of audit logs from the
 * ai_commerce_product_audit_logs table for a specific product. Each audit log
 * entry records the before/after state, event type, actor, and timestamp for
 * all major product state changes, giving full traceability.
 *
 * This operation allows authorized admins to review the complete audit history
 * for a product, using advanced search, filter, and pagination parameters. The
 * endpoint returns paginated IAiCommerceProductAuditLog entries, with detailed
 * event, actor, and temporal metadata.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the action
 * @param props.productId - UUID of the product whose audit logs will be
 *   retrieved
 * @param props.body - Filtering and pagination options
 *   (IAiCommerceProductAuditLog.IRequest)
 * @returns IPageIAiCommerceProductAuditLog - Paginated audit log entries for
 *   the target product
 * @throws {Error} If the product does not exist or the query fails
 */
export async function patchaiCommerceAdminProductsProductIdAuditLogs(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductAuditLog.IRequest;
}): Promise<IPageIAiCommerceProductAuditLog> {
  const { productId, body } = props;

  // Defensive normalization of page/limit (must be at least 1, safe int values)
  const page: number = body.page && body.page > 0 ? body.page : 1;
  const limit: number = body.limit && body.limit > 0 ? body.limit : 20;

  // Compute skip for pagination, guarantee positive
  const skip: number = (page - 1) * limit;

  // Build filter where clause
  const where = {
    product_id: productId,
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
  };

  // Fetch paginated audit logs and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_audit_logs.count({ where }),
  ]);

  // Map results to IAiCommerceProductAuditLog
  const data: IAiCommerceProductAuditLog[] = rows.map((row) => {
    return {
      id: row.id,
      product_id: row.product_id,
      event_type: row.event_type,
      actor_id: row.actor_id,
      before_json: row.before_json === undefined ? undefined : row.before_json,
      after_json: row.after_json === undefined ? undefined : row.after_json,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  // Compute pages as integer, avoiding division by zero
  const pages: number = limit > 0 ? Math.ceil(total / limit) : 1;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
