import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

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
 * @param props.admin - The authenticated admin performing this action
 * @param props.customerId - Unique identifier (UUID) of the target customer
 * @param props.sessionId - Unique identifier (UUID) for the customer session
 *   being terminated
 * @returns Void
 * @throws {Error} When the session does not exist, does not belong to the
 *   customer, or is already terminated
 */
export async function delete__shoppingMallAiBackend_admin_customers_$customerId_sessions_$sessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customerId, sessionId } = props;

  // Fetch the session to ensure existence, correct ownership and status
  const session =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.findUnique(
      {
        where: { id: sessionId },
        select: { id: true, customer_id: true, terminated_at: true },
      },
    );
  if (!session || session.customer_id !== customerId) {
    throw new Error("Session not found");
  }
  if (session.terminated_at !== null && session.terminated_at !== undefined) {
    throw new Error("Session is already terminated");
  }
  // Set terminated_at to the current time (ISO8601 string)
  await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.update({
    where: { id: sessionId },
    data: { terminated_at: toISOStringSafe(new Date()) },
  });
}
