import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import { IPageIShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerWithdrawal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve paginated withdrawal history for a customer account.
 *
 * Search and filter historical customer withdrawal (account deactivation)
 * events for a given customer. Returns all (or filtered) withdrawal snapshots
 * including reason, withdrawal timestamp, and any regulatory evidence for
 * withdrawal events. Used by users to review withdrawal history or by admins
 * for compliance, evidence audits, and legal reporting.
 *
 * The underlying table is shopping_mall_ai_backend_customer_withdrawals, with
 * customerId as required path parameter. The request body is of type
 * IShoppingMallAiBackendCustomerWithdrawal.IRequest (supports filters, date
 * ranges, and pagination).
 *
 * @param props - Endpoint props
 * @param props.admin - Admin authentication payload (must be present)
 * @param props.customerId - Target customer UUID
 * @param props.body - Filter and pagination criteria ({ page, limit, reason,
 *   withdrawn_at_from, withdrawn_at_to })
 * @returns Paginated list of withdrawal events for the specified customer
 *   account
 * @throws {Error} If database query fails
 */
export async function patch__shoppingMallAiBackend_admin_customers_$customerId_withdrawals(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerWithdrawal.IRequest;
}): Promise<IPageIShoppingMallAiBackendCustomerWithdrawal.ISummary> {
  const { customerId, body } = props;
  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Build where condition with strict project rules
  const where = {
    customer_id: customerId,
    ...(body.reason !== undefined &&
      body.reason !== null && { reason: body.reason }),
    ...((body.withdrawn_at_from !== undefined &&
      body.withdrawn_at_from !== null) ||
    (body.withdrawn_at_to !== undefined && body.withdrawn_at_to !== null)
      ? {
          withdrawn_at: {
            ...(body.withdrawn_at_from !== undefined &&
              body.withdrawn_at_from !== null && {
                gte: body.withdrawn_at_from,
              }),
            ...(body.withdrawn_at_to !== undefined &&
              body.withdrawn_at_to !== null && { lte: body.withdrawn_at_to }),
          },
        }
      : {}),
  };
  // Query result rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_customer_withdrawals.findMany({
      where,
      orderBy: { withdrawn_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_customer_withdrawals.count({
      where,
    }),
  ]);
  // Map to DTO, ensuring proper ISO string conversion for date fields
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      customer_id: row.customer_id,
      withdrawn_at: toISOStringSafe(row.withdrawn_at),
      reason: row.reason ?? null,
    })),
  };
}
