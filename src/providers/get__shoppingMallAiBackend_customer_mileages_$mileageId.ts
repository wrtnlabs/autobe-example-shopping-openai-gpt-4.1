import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Get mileage ledger details by ID (full audit context).
 *
 * Retrieves all business and audit fields for a specific mileage/point ledger,
 * ensuring that only the ledger owner (customer) can access sensitive records.
 * All date fields are returned as ISO8601 string. Unauthorized or deleted
 * ledgers are not returned for security/audit compliance.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making this request
 * @param props.mileageId - UUID of the mileage ledger to retrieve
 * @returns Detailed business information for the mileage ledger, including
 *   balances and owner references
 * @throws {Error} If the mileage ledger is not found or not owned by the
 *   authenticated customer
 */
export async function get__shoppingMallAiBackend_customer_mileages_$mileageId(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendMileage> {
  const { customer, mileageId } = props;
  const mileage =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileages.findFirst({
      where: {
        id: mileageId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!mileage)
    throw new Error("Mileage ledger not found or not owned by this customer");
  return {
    id: mileage.id,
    shopping_mall_ai_backend_customer_id:
      mileage.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_seller_id:
      mileage.shopping_mall_ai_backend_seller_id,
    total_accrued: mileage.total_accrued,
    usable_mileage: mileage.usable_mileage,
    expired_mileage: mileage.expired_mileage,
    on_hold_mileage: mileage.on_hold_mileage,
    created_at: toISOStringSafe(mileage.created_at),
    updated_at: toISOStringSafe(mileage.updated_at),
    deleted_at: mileage.deleted_at ? toISOStringSafe(mileage.deleted_at) : null,
  };
}
