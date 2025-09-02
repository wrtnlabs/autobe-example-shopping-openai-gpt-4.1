import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific admin audit log entry for a given
 * administrator.
 *
 * Allows an authenticated admin to fetch the detailed information of a
 * particular admin audit log event—including operation, target, rationale, and
 * evidence timestamps—strictly for their own admin account.
 *
 * Only the admin who performed the action may access the corresponding log.
 * Access is denied if an admin attempts to fetch another admin's logs.
 *
 * @param props - The input properties for the request
 * @param props.admin - The authenticated admin payload (authorization required)
 * @param props.adminId - Unique identifier (UUID) of the admin whose audit log
 *   is to be retrieved (must match the authenticated admin)
 * @param props.auditLogId - Unique identifier (UUID) of the audit log entry to
 *   retrieve
 * @returns The complete admin audit log entry with operation, context,
 *   rationale, and metadata for evidence/compliance
 * @throws {Error} If the authenticated admin tries to access another admin's
 *   audit log entry
 * @throws {Error} If the audit log entry does not exist or does not belong to
 *   the specified admin
 */
export async function get__shoppingMallAiBackend_admin_admins_$adminId_auditLogs_$auditLogId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendAdminAuditLog> {
  const { admin, adminId, auditLogId } = props;
  // Enforcement: Only allow admins to view their own logs
  if (admin.id !== adminId) {
    throw new Error("Forbidden: Admins may only access their own audit logs.");
  }
  const log =
    await MyGlobal.prisma.shopping_mall_ai_backend_admin_audit_logs.findFirst({
      where: {
        id: auditLogId,
        admin_id: adminId,
      },
    });
  if (!log) {
    throw new Error("Audit log not found.");
  }
  return {
    id: log.id,
    admin_id: log.admin_id,
    operation: log.operation,
    target_id: log.target_id,
    target_type: log.target_type,
    description: log.description ?? null,
    created_at: toISOStringSafe(log.created_at),
  };
}
