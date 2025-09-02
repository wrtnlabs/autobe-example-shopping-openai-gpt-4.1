import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update (admin/system) attributes of mileage ledger.
 *
 * Modifies a specific mileage ledger identified by mileageId. Allows system or
 * administrator-driven updates to balances, status, rationale, or ownership.
 * For use in correcting errors, handling operational incidents, or applying
 * business policy (e.g., manual balance adjustment after dispute resolution).
 *
 * Validation ensures only authorized role or automated system logic invokes
 * this. Audits all changes for compliance. Typical errors: not found,
 * forbidden, bad request due to invalid updates, or business rules violations.
 * Returns updated mileage ledger in response.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user making the request. Must
 *   have system-level privileges
 * @param props.mileageId - UUID of the mileage ledger to update
 * @param props.body - Fields and values for updating the targeted mileage
 *   ledger (status, balances, etc)
 * @returns The updated and detailed mileage ledger object
 * @throws {Error} When the ledger does not exist, already deleted, or ID is
 *   invalid; or if the admin lacks privilege
 */
export async function put__shoppingMallAiBackend_admin_mileages_$mileageId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendMileage.IUpdate;
}): Promise<IShoppingMallAiBackendMileage> {
  const { admin, mileageId, body } = props;

  // Lookup mileage record, respect soft delete
  const ledger =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileages.findFirst({
      where: {
        id: mileageId,
        deleted_at: null,
      },
    });
  if (!ledger) {
    throw new Error("Mileage ledger not found or already deleted");
  }

  // Only update provided fields (partial update) - assign inline, no temp variables
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileages.update({
      where: { id: mileageId },
      data: {
        total_accrued: body.total_accrued ?? undefined,
        usable_mileage: body.usable_mileage ?? undefined,
        expired_mileage: body.expired_mileage ?? undefined,
        on_hold_mileage: body.on_hold_mileage ?? undefined,
        deleted_at:
          body.deleted_at !== undefined ? (body.deleted_at ?? null) : undefined,
        updated_at: body.updated_at !== undefined ? body.updated_at : undefined,
      },
    });

  return {
    id: updated.id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      updated.shopping_mall_ai_backend_seller_id ?? null,
    total_accrued: updated.total_accrued,
    usable_mileage: updated.usable_mileage,
    expired_mileage: updated.expired_mileage,
    on_hold_mileage: updated.on_hold_mileage,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
