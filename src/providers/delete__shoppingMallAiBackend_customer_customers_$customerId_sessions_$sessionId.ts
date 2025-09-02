import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Logically terminate (logout) a specific customer session for security/audit
 * purposes.
 *
 * This API performs logical deletion (termination) of a user session identified
 * by sessionId for a specific customer. It is used for explicit log-out, forced
 * device deactivation, or security event-driven session termination.
 *
 * By setting terminated_at instead of removing the record, auditability and
 * session traceability are preserved for business compliance. The operation
 * ensures only the session owner (customer) or authorized administrators can
 * destroy the session, and all actions are logged for regulatory requirements.
 *
 * After successful termination, the session cannot be reused for API
 * authentication. Error responses are provided if the session or customer does
 * not exist or is already terminated.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer performing the session
 *   termination
 * @param props.customerId - Unique identifier (UUID) of the target customer
 * @param props.sessionId - Unique identifier (UUID) for the session being
 *   terminated
 * @returns Void
 * @throws {Error} If the session does not exist, is already terminated, or the
 *   user is unauthorized
 */
export async function delete__shoppingMallAiBackend_customer_customers_$customerId_sessions_$sessionId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, customerId, sessionId } = props;
  // Only allow the session owner to terminate their session
  if (customer.id !== customerId) {
    throw new Error(
      "Unauthorized: cannot terminate sessions for another customer",
    );
  }
  const session =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.findFirst({
      where: {
        id: sessionId,
        customer_id: customerId,
      },
    });
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.terminated_at) {
    throw new Error("Session already terminated");
  }
  await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.update({
    where: { id: sessionId },
    data: {
      terminated_at: toISOStringSafe(new Date()),
    },
  });
}
