import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific customer withdrawal record for audit or
 * evidence.
 *
 * This operation retrieves all details for a single customer withdrawal event
 * (account deactivation) identified by withdrawalId, scoped to a customer
 * (customerId). Only accessible by an authenticated admin. Ensures PK/FK
 * association and returns all DTO fields (reason, withdrawn_at, created_at,
 * etc), enforcing correct types and security.
 *
 * @param props - The input parameters.
 * @param props.admin - The authenticated admin user (authorization required).
 * @param props.customerId - UUID of the customer whose withdrawal record is
 *   fetched.
 * @param props.withdrawalId - UUID of the withdrawal record to retrieve.
 * @returns The complete withdrawal/deactivation record for compliance or audit
 *   usage.
 * @throws {Error} If no such withdrawal exists, or if it does not belong to the
 *   specified customer.
 */
export async function get__shoppingMallAiBackend_admin_customers_$customerId_withdrawals_$withdrawalId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  withdrawalId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCustomerWithdrawal> {
  const { customerId, withdrawalId } = props;
  const withdrawal =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_withdrawals.findUnique(
      {
        where: { id: withdrawalId },
      },
    );
  if (!withdrawal || withdrawal.customer_id !== customerId) {
    throw new Error("Withdrawal not found for this customer");
  }
  return {
    id: withdrawal.id,
    customer_id: withdrawal.customer_id,
    reason: withdrawal.reason ?? null,
    withdrawn_at: toISOStringSafe(withdrawal.withdrawn_at),
    created_at: toISOStringSafe(withdrawal.created_at),
  };
}
