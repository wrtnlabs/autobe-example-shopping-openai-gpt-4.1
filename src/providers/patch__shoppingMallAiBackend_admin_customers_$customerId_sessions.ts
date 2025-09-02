import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";
import { IPageIShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve all sessions for a customer with pagination and filtering.
 *
 * List all current and historical session records associated with a particular
 * customer, for administrative auditing or support. This includes login details
 * such as device, IP address, session creation and expiry times, and
 * termination events. Sessions reflect both API and UI authentications and are
 * used to trace user activity or support account recovery in case of security
 * incidents.
 *
 * Access to session details is strictly limited to admin roles due to
 * sensitivity of access tokens and personal device identifiers. Not intended
 * for customer self-service. Sessions may be further filtered or scoped in
 * business logic, and results are paginated for performance.
 *
 * @param props - Object containing all parameters for the request
 * @param props.admin - The authenticated admin user making the request
 * @param props.customerId - The customer ID whose sessions are being queried
 * @param props.body - Session search and pagination parameters (see IRequest)
 * @returns Paginated list of the customer's sessions, including all audit
 *   metadata
 * @throws {Error} If the database query fails or the parameters are invalid
 */
export async function patch__shoppingMallAiBackend_admin_customers_$customerId_sessions(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerSession.IRequest;
}): Promise<IPageIShoppingMallAiBackendCustomerSession> {
  const { admin, customerId, body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build filtering criteria
  const where = {
    customer_id: customerId,
    ...(body.ip_address ? { ip_address: body.ip_address } : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: rows.map((session) => ({
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
    })),
  };
}
