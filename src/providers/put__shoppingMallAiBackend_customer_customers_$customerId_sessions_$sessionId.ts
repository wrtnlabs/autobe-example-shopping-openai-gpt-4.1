import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update a specific customer session for security, device, or lifecycle
 * management.
 *
 * This API updates attributes of a customer session, such as session tokens,
 * expiration, IP address, or termination status. It ensures session state and
 * security can be managed efficiently for scenarios like forced logout (by
 * admin or self), session renewal, or device deactivation. Only the session
 * owner (customer) or administrators can perform this update, aligning with
 * platform security policies and audit requirements.
 *
 * The session is identified by its sessionId and cross-verified with the
 * customerId for ownership and integrity. All modifications are logged for
 * compliance. If the session is expired or belongs to a different customer, an
 * error will be returned.
 *
 * Typical use cases include user-initiated device management, admin security
 * operations, or incident response that require explicit update of session
 * information. All updates conform with business logic for audit, evidence, and
 * regulatory compliance.
 *
 * @param props - Props for the operation
 * @param props.customer - Authenticated customer (must own the session)
 * @param props.customerId - UUID of the customer whose session is to update
 * @param props.sessionId - UUID of the session to update
 * @param props.body - Session update payload (fields to update)
 * @returns Updated session details after modification
 * @throws {Error} If user does not own the session, or if session is not found,
 *   or belongs to another customer
 */
export async function put__shoppingMallAiBackend_customer_customers_$customerId_sessions_$sessionId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerSession.IUpdate;
}): Promise<IShoppingMallAiBackendCustomerSession> {
  const { customer, customerId, sessionId, body } = props;

  // Ownership enforcement (only session owner can update)
  if (customer.id !== customerId) {
    throw new Error("Forbidden: You can only update your own sessions");
  }

  // Check session existence and correct ownership
  const session =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.findFirst({
      where: { id: sessionId, customer_id: customerId },
    });
  if (!session) {
    throw new Error("Session not found");
  }

  // Prepare update data (only update provided fields)
  const updateData = {
    access_token: body.access_token ?? undefined,
    refresh_token: body.refresh_token ?? undefined,
    ip_address: body.ip_address ?? undefined,
    user_agent: body.user_agent ?? undefined,
    expires_at: body.expires_at ?? undefined,
    terminated_at: body.terminated_at ?? undefined,
  };

  // Update session
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.update({
      where: { id: sessionId },
      data: updateData,
    });

  // Convert Date fields to ISO 8601 date-time string, with type branding
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
