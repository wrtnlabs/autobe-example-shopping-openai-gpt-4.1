import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve full details of a mileage transaction by unique ID.
 *
 * Fetches all attributes for a specific mileage transaction event (accrual,
 * redemption, adjustment, expiration), restricted so that only the transaction
 * owner (seller) may access their transaction records. Ensures type-safe
 * handling and compliance with privacy requirements. Dates are converted to
 * ISO8601 strings, and all nullable/optional fields are mapped in a
 * DTO-compliant way. Throws error if transaction not found or access
 * forbidden.
 *
 * @param props - Request context and query parameters
 * @param props.seller - Authenticated seller payload; only allows querying the
 *   seller's own transactions
 * @param props.mileageTransactionId - Unique identifier for the mileage
 *   transaction
 * @returns The mileage transaction details in IAiCommerceMileageTransaction
 *   format
 * @throws {Error} If transaction not found or user is not the owner
 */
export async function getaiCommerceSellerMileageTransactionsMileageTransactionId(props: {
  seller: SellerPayload;
  mileageTransactionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceMileageTransaction> {
  const { seller, mileageTransactionId } = props;
  // Fetch transaction row
  const transaction =
    await MyGlobal.prisma.ai_commerce_mileage_transactions.findFirst({
      where: { id: mileageTransactionId },
    });
  if (!transaction) {
    throw new Error("Mileage transaction not found");
  }
  // Fetch related account and check user ownership
  const account = await MyGlobal.prisma.ai_commerce_mileage_accounts.findFirst({
    where: { id: transaction.mileage_account_id },
  });
  if (!account || account.user_id !== seller.id) {
    throw new Error("Forbidden: You are not the owner of this transaction");
  }
  // Compose and return DTO; map dates and nullable/optional fields precisely
  return {
    id: transaction.id,
    mileage_account_id: transaction.mileage_account_id,
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    reference_entity:
      typeof transaction.reference_entity === "string"
        ? transaction.reference_entity
        : transaction.reference_entity === null
          ? null
          : undefined,
    transacted_at: toISOStringSafe(transaction.transacted_at),
    created_at: toISOStringSafe(transaction.created_at),
    updated_at: toISOStringSafe(transaction.updated_at),
    deleted_at:
      transaction.deleted_at == null
        ? undefined
        : toISOStringSafe(transaction.deleted_at),
  };
}
