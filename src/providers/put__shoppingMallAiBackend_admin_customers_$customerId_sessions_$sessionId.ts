import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing customer session identified by sessionId for a particular
 * customer.
 *
 * This operation allows administrators to update session attributes (such as
 * tokens, expiration, device info, and termination status) for audit, security,
 * or device management. The session is cross-verified with customerId and all
 * date fields are normalized to string & tags.Format<'date-time'> using
 * toISOStringSafe. Authorization is enforced by decorator, and errors are
 * thrown for missing or mismatched records.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.customerId - Target customer UUID
 * @param props.sessionId - Target session UUID
 * @param props.body - Updatable fields for the session (tokens, ip, agent,
 *   etc.)
 * @returns Updated session record, with normalized date fields
 * @throws {Error} When session is not found for given customerId/sessionId, or
 *   on database errors
 */
export async function put__shoppingMallAiBackend_admin_customers_$customerId_sessions_$sessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerSession.IUpdate;
}): Promise<IShoppingMallAiBackendCustomerSession> {
  const { admin, customerId, sessionId, body } = props;

  const session =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.findFirst({
      where: {
        id: sessionId,
        customer_id: customerId,
      },
    });
  if (!session) throw new Error("Session not found for this customer");

  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.update({
      where: { id: sessionId },
      data: {
        access_token: body.access_token ?? undefined,
        refresh_token: body.refresh_token ?? undefined,
        ip_address: body.ip_address ?? undefined,
        user_agent: body.user_agent ?? undefined,
        expires_at: body.expires_at ?? undefined,
        terminated_at: body.terminated_at ?? undefined,
      },
    });
  return {
    id: updated.id,
    customer_id: updated.customer_id,
    access_token: updated.access_token,
    refresh_token: updated.refresh_token ?? null,
    ip_address: updated.ip_address,
    user_agent: updated.user_agent,
    expires_at: toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    terminated_at: updated.terminated_at
      ? toISOStringSafe(updated.terminated_at)
      : null,
  };
}
