import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full details of a mileage transaction by unique ID.
 *
 * This operation fetches the details of a specific mileage transaction,
 * including accrual, redemption, adjustment, or expiration events, for
 * administrative audit or user self-service purposes. All business-critical,
 * compliance, audit, and reference metadata is included as defined in the
 * schema.
 *
 * Access is restricted to administrator roles with global platform visibility.
 * If the transaction does not exist, an error is thrown. All relevant date
 * fields are formatted as ISO 8601 strings.
 *
 * @param props - Properties for the query:
 *
 *   - Admin: Authenticated administrator payload (must be system admin)
 *   - MileageTransactionId: Unique transaction UUID to retrieve
 *
 * @returns The mileage transaction (all business fields and audit fields
 *   populated)
 * @throws {Error} If no transaction exists for the specified id
 */
export async function getaiCommerceAdminMileageTransactionsMileageTransactionId(props: {
  admin: AdminPayload;
  mileageTransactionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceMileageTransaction> {
  const { mileageTransactionId } = props;

  const row = await MyGlobal.prisma.ai_commerce_mileage_transactions.findUnique(
    {
      where: { id: mileageTransactionId },
    },
  );
  if (!row) {
    throw new Error("Mileage transaction not found");
  }
  return {
    id: row.id,
    mileage_account_id: row.mileage_account_id,
    type:
      row.type === "accrual" ||
      row.type === "redemption" ||
      row.type === "adjustment" ||
      row.type === "expiration"
        ? row.type
        : ("accrual" as "accrual" | "redemption" | "adjustment" | "expiration"),
    amount: row.amount,
    status: row.status,
    reference_entity: row.reference_entity ?? undefined,
    transacted_at: toISOStringSafe(row.transacted_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  } satisfies IAiCommerceMileageTransaction;
}
