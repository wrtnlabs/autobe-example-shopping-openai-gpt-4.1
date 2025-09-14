import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a specific product audit log entry by auditLogId from the
 * ai_commerce_product_audit_logs table.
 *
 * Retrieves detailed information for a specific audit log associated with a
 * product, including before/after state, actor id, event type, and timestamp.
 * Only admins may access this endpoint. If the entry does not exist or does not
 * belong to the specified product, a generic error is thrown. All access is
 * strictly logged, and sensitive details are not leaked on permission
 * violations.
 *
 * @param props - Parameter object
 * @param props.admin - The authenticated admin payload (authorization enforced
 *   by decorator/controller)
 * @param props.productId - Unique identifier of the product whose audit log is
 *   retrieved
 * @param props.auditLogId - Unique identifier of the audit log entry to fetch
 * @returns The detailed audit log record matching the product/auditLogId, with
 *   all fields strictly typed
 * @throws {Error} When audit log does not exist or is not accessible for the
 *   target product
 */
export async function getaiCommerceAdminProductsProductIdAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductAuditLog> {
  const { admin, productId, auditLogId } = props;
  const auditLog =
    await MyGlobal.prisma.ai_commerce_product_audit_logs.findFirst({
      where: {
        id: auditLogId,
        product_id: productId,
      },
    });
  if (!auditLog) {
    throw new Error("Audit log not found, or not accessible");
  }
  return {
    id: auditLog.id,
    product_id: auditLog.product_id,
    event_type: auditLog.event_type,
    actor_id: auditLog.actor_id,
    before_json: auditLog.before_json ?? undefined,
    after_json: auditLog.after_json ?? undefined,
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
