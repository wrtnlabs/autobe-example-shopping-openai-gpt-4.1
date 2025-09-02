import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve details of a specific customer withdrawal record for audit or
 * evidence.
 *
 * This function fetches all evidence and fields for a single customer account
 * withdrawal (deactivation/removal) event. Only the authenticated customer may
 * view their own withdrawal record (enforced by customerId path param). Returns
 * all attributes for the withdrawal: reason (optional), withdrawn_at datetime,
 * and evidence creation timestamp. Throws error if withdrawal does not exist or
 * does not belong to the requesting customer.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer JWT payload (must match path
 *   customerId)
 * @param props.customerId - UUID of the customer whose withdrawal record is
 *   being retrieved
 * @param props.withdrawalId - UUID of the specific withdrawal record
 * @returns All withdrawal details as IShoppingMallAiBackendCustomerWithdrawal,
 *   or throws error if not found/unauthorized
 * @throws {Error} If the requester is not the owner of the withdrawal
 *   (forbidden)
 * @throws {Error} If the withdrawal record does not exist (not found)
 */
export async function get__shoppingMallAiBackend_customer_customers_$customerId_withdrawals_$withdrawalId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  withdrawalId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCustomerWithdrawal> {
  const { customer, customerId, withdrawalId } = props;

  // Authorization: Only the owner customer can fetch their withdrawal evidence
  if (customer.id !== customerId) {
    throw new Error(
      "Forbidden: You may only access your own withdrawal evidence.",
    );
  }

  // Fetch withdrawal record (guaranteed to belong to this customer)
  const withdrawal =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_withdrawals.findFirstOrThrow(
      {
        where: {
          id: withdrawalId,
          customer_id: customerId,
        },
      },
    );

  // Return mapped/converted fields to API DTO (no Date type, every timestamp as string)
  return {
    id: withdrawal.id,
    customer_id: withdrawal.customer_id,
    reason: withdrawal.reason ?? null,
    withdrawn_at: toISOStringSafe(withdrawal.withdrawn_at),
    created_at: toISOStringSafe(withdrawal.created_at),
  };
}
