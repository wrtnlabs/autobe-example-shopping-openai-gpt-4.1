import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detail information for a specific customer session, strictly for
 * admin/audit forensics.
 *
 * This operation provides administrative insights into a shopping mall customer
 * session record, including lifecycle, tokens, origin device/IP, and explicit
 * linkage to the owning customer. Intended for security, diagnosis, compliance,
 * and user support analysis. Returns date/datetime fields in ISO8601 UTC format
 * as required.
 *
 * Authorization: Only admins may invoke; access is enforced outside this
 * provider (via controller/middleware).
 *
 * @param props - Properties for session lookup and authentication enforcement
 * @param props.admin - The authenticated admin making the request (must have
 *   active and valid status; injected via controller)
 * @param props.customerId - Target customer's unique UUID
 * @param props.sessionId - Target session's unique UUID for lookup
 * @returns IShoppingMallAiBackendCustomerSession (full session audit record)
 * @throws {Error} When the session does not exist for provided customer/session
 *   ID or access is unauthorized
 */
export async function get__shoppingMallAiBackend_admin_customers_$customerId_sessions_$sessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCustomerSession> {
  const { admin, customerId, sessionId } = props;
  const session =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.findFirst({
      where: {
        id: sessionId,
        customer_id: customerId,
      },
    });
  if (!session) throw new Error("Session not found");
  return {
    id: session.id,
    customer_id: session.customer_id,
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? null,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    expires_at: toISOStringSafe(session.expires_at),
    created_at: toISOStringSafe(session.created_at),
    terminated_at: session.terminated_at
      ? toISOStringSafe(session.terminated_at)
      : null,
  };
}
