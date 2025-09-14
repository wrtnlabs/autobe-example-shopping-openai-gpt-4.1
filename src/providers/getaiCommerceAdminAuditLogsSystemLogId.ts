import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAuditLogsSystem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAuditLogsSystem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details for a single system audit log (ai_commerce_audit_logs_system).
 *
 * Retrieves the full details of the system audit log entry identified by logId,
 * including event type, actor, before/after snapshots, and timestamp. This is
 * used by administrators for forensic review, compliance reporting, or legal
 * evidence of configuration changes.
 *
 * Authorization: Only accessible by authenticated admins.
 *
 * @param props - The props containing:
 *
 *   - Admin: The authenticated admin making the request (authorization enforced at
 *       controller/decorator)
 *   - LogId: The UUID for the audit log entry to retrieve
 *
 * @returns IAiCommerceAuditLogsSystem - The full audit log object as stored in
 *   the database
 * @throws Error if logId is not valid or the audit log does not exist
 */
export async function getaiCommerceAdminAuditLogsSystemLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceAuditLogsSystem> {
  const { logId } = props;
  const log =
    await MyGlobal.prisma.ai_commerce_audit_logs_system.findUniqueOrThrow({
      where: { id: logId },
      select: {
        id: true,
        event_type: true,
        actor_id: true,
        target_table: true,
        target_id: true,
        before: true,
        after: true,
        created_at: true,
      },
    });
  return {
    id: log.id,
    event_type: log.event_type,
    actor_id: log.actor_id,
    target_table: log.target_table,
    target_id: log.target_id,
    before: log.before === null ? undefined : log.before,
    after: log.after === null ? undefined : log.after,
    created_at: toISOStringSafe(log.created_at),
  };
}
