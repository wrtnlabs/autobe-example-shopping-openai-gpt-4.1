import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import { IPageIShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerWithdrawal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve paginated withdrawal history for a customer account.
 *
 * This API lists all withdrawal snapshots (account deactivations or removals)
 * performed on a user account, with full audit evidence (reason, withdrawn_at,
 * created_at). Useful for reviewing past deactivation events, onboarding
 * audits, or regulatory requests. The user (or admin) may filter by dates,
 * reason, or other criteria provided by
 * IShoppingMallAiBackendCustomerWithdrawal.IRequest.
 *
 * Typical use includes customer self-review, admin compliance checks, or
 * processing data export/archival requests after withdrawal. All records are
 * returned in chronological order and paginated for large event history.
 *
 * @param props - Request parameter object
 * @param props.customer - Authenticated customer payload (must match
 *   customerId)
 * @param props.customerId - Customer UUID whose withdrawal records are being
 *   retrieved
 * @param props.body - Filter criteria and pagination info for withdrawal
 *   history search
 * @returns Paginated withdrawal history summary for customer account
 * @throws {Error} Unauthorized if customer attempts to access another
 *   customer's history
 */
export async function patch__shoppingMallAiBackend_customer_customers_$customerId_withdrawals(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerWithdrawal.IRequest;
}): Promise<IPageIShoppingMallAiBackendCustomerWithdrawal.ISummary> {
  const { customer, customerId, body } = props;

  // Authorization: only allow user to view self
  if (customer.id !== customerId) {
    throw new Error(
      "Unauthorized: customers can only access their own withdrawal records",
    );
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Prisma query WHERE clause: inline, only allowed fields
  const where = {
    customer_id: customerId,
    // Filter by reason (exact match), only if value is non-empty string
    ...(body.reason !== undefined &&
      body.reason !== null &&
      body.reason !== "" && {
        reason: body.reason,
      }),
    // Filter by withdrawn_at range
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
              body.withdrawn_at_to !== null && {
                lte: body.withdrawn_at_to,
              }),
          },
        }
      : {}),
  };

  // Execute queries in parallel: paginated data and total record count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_customer_withdrawals.findMany({
      where,
      orderBy: { withdrawn_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_customer_withdrawals.count({
      where,
    }),
  ]);

  // Format results per ISummary contract (convert Date to ISO string)
  const result: IPageIShoppingMallAiBackendCustomerWithdrawal.ISummary = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data: items.map((item) => ({
      id: item.id,
      customer_id: item.customer_id,
      withdrawn_at: toISOStringSafe(item.withdrawn_at),
      reason: typeof item.reason === "string" ? item.reason : null,
    })),
  };

  return result;
}
