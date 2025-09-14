import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve full details of a mileage transaction by unique ID.
 *
 * This function fetches all fields for a single
 * ai_commerce_mileage_transactions record, by id, for the authenticated buyer.
 * It verifies that the transaction belongs to the buyer's own account, and then
 * constructs a strongly-typed response according to
 * IAiCommerceMileageTransaction.
 *
 * @param props - The request properties for mileage transaction detail
 * @param props.buyer - The authenticated BuyerPayload (only the transaction
 *   owner is authorized)
 * @param props.mileageTransactionId - Unique identifier for the mileage
 *   transaction to retrieve
 * @returns The full IAiCommerceMileageTransaction object for the requested
 *   transaction
 * @throws {Error} If the transaction does not exist or is not accessible by the
 *   buyer
 */
export async function getaiCommerceBuyerMileageTransactionsMileageTransactionId(props: {
  buyer: BuyerPayload;
  mileageTransactionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceMileageTransaction> {
  const { buyer, mileageTransactionId } = props;

  // Fetch the transaction
  const tx = await MyGlobal.prisma.ai_commerce_mileage_transactions.findFirst({
    where: { id: mileageTransactionId },
  });
  if (!tx) {
    throw new Error("Mileage transaction not found");
  }

  // Fetch the associated account to verify buyer ownership
  const acc = await MyGlobal.prisma.ai_commerce_mileage_accounts.findFirst({
    where: { id: tx.mileage_account_id },
  });
  if (!acc || acc.user_id !== buyer.id) {
    throw new Error(
      "Forbidden: transaction does not belong to requesting buyer",
    );
  }

  // Map all properties strictly, never use Date or 'as', handle null/undefined correctly
  return {
    id: tx.id,
    mileage_account_id: tx.mileage_account_id,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    reference_entity:
      tx.reference_entity === null ? undefined : tx.reference_entity,
    transacted_at: toISOStringSafe(tx.transacted_at),
    created_at: toISOStringSafe(tx.created_at),
    updated_at: toISOStringSafe(tx.updated_at),
    deleted_at:
      typeof tx.deleted_at !== "undefined" && tx.deleted_at !== null
        ? toISOStringSafe(tx.deleted_at)
        : undefined,
  };
}
