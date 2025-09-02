import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemAuditTrail";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves full details of a specific system audit trail entry by
 * auditTrailId.
 *
 * This endpoint is used for regulatory, compliance, and security reviews to
 * inspect significant platform events. Requires admin authentication and
 * provides immutable evidence for legal and audit traceability.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated AdminPayload for authorization (must be
 *   active admin)
 * @param props.auditTrailId - UUID of the audit trail entry to retrieve
 * @returns The full details of the specified audit trail entry, including event
 *   type, actor, description, metadata, and timestamp
 * @throws {Error} When the audit trail entry does not exist (404 error)
 */
export async function get__shoppingMallAiBackend_admin_systemAuditTrails_$auditTrailId(props: {
  admin: AdminPayload;
  auditTrailId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendSystemAuditTrail> {
  const { admin, auditTrailId } = props;

  // Admin authentication is guaranteed by the AdminPayload decorator; no further checks required.

  const auditTrail =
    await MyGlobal.prisma.shopping_mall_ai_backend_system_audit_trails.findUniqueOrThrow(
      {
        where: { id: auditTrailId },
        select: {
          id: true,
          event_type: true,
          actor_id: true,
          description: true,
          metadata: true,
          created_at: true,
        },
      },
    );

  return {
    id: auditTrail.id,
    event_type: auditTrail.event_type,
    actor_id: auditTrail.actor_id,
    description: auditTrail.description,
    metadata: auditTrail.metadata ?? null,
    created_at: toISOStringSafe(auditTrail.created_at),
  };
}
