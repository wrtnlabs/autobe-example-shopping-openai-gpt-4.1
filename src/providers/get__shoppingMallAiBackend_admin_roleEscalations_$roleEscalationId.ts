import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendRoleEscalation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific role escalation event.
 *
 * This API operation enables administrators to fetch comprehensive details for
 * a given role escalation event identified by roleEscalationId. Includes
 * context of role change, admin responsible, event type (promotion, demotion,
 * etc.), and explicit rationale.
 *
 * Essential for regulatory audits, compliance investigations, and management of
 * business-critical privilege changes. It provides historical transparency,
 * evidence for dispute resolution, and traces original intent/policy for
 * lifecycle management.
 *
 * Results are strictly limited to admin users. Throws an error if no such event
 * is found.
 *
 * @param props - Object containing admin authentication and escalation ID
 * @param props.admin - Authenticated admin context (must be an active system
 *   admin)
 * @param props.roleEscalationId - Unique identifier of the role escalation
 *   event to retrieve
 * @returns Full detail on the specified role escalation event, including admin,
 *   rationale, and timestamps
 * @throws {Error} If the role escalation event does not exist
 */
export async function get__shoppingMallAiBackend_admin_roleEscalations_$roleEscalationId(props: {
  admin: AdminPayload;
  roleEscalationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendRoleEscalation> {
  const { roleEscalationId } = props;

  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_role_escalations.findUnique({
      where: { id: roleEscalationId },
    });

  if (!found) {
    throw new Error("Role escalation event not found");
  }

  return {
    id: found.id,
    user_id: found.user_id,
    admin_id: found.admin_id ?? null,
    from_role: found.from_role,
    to_role: found.to_role,
    escalation_type: found.escalation_type,
    reason: found.reason ?? null,
    created_at: toISOStringSafe(found.created_at),
  };
}
