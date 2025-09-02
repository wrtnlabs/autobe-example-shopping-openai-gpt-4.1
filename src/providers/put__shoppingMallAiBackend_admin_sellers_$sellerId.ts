import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update existing seller merchant account info by ID (admin-only).
 *
 * Modify the business attributes of a seller merchant account identified by
 * sellerId. Allows updating name, business registration number, email,
 * is_active, and is_verified per regulatory policy. Triggering this operation
 * logs compliance/audit events for evidence preservation.
 *
 * Only admin users hold authority to alter core seller onboarding data. Failed
 * validations (duplicate business registration or email) return business error
 * codes. Soft-deleted sellers cannot be updated.
 *
 * This operation is critical for regulatory compliance, onboarding, and ongoing
 * seller management. Changes update timestamps for data correctness.
 *
 * @param props - Object containing required properties
 * @param props.admin - Admin authentication payload (must be a valid admin)
 * @param props.sellerId - UUID of the seller to update
 * @param props.body - The update fields (name, business_registration_number,
 *   email, is_active, is_verified)
 * @returns The updated seller record with new values
 * @throws {Error} When seller is not found, has been soft-deleted, or
 *   uniqueness validation fails
 */
export async function put__shoppingMallAiBackend_admin_sellers_$sellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendSeller.IUpdate;
}): Promise<IShoppingMallAiBackendSeller> {
  const { admin, sellerId, body } = props;

  // 1. Ensure seller exists and is not soft-deleted
  const seller =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
      where: { id: sellerId, deleted_at: null },
    });
  if (!seller) {
    throw new Error("Seller not found or already deleted");
  }

  // 2. Check unique email, if email is changing
  if (body.email && body.email !== seller.email) {
    const exists =
      await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
        where: { email: body.email, id: { not: sellerId }, deleted_at: null },
      });
    if (exists) throw new Error("Email already in use by another seller");
  }
  // 3. Check unique business_registration_number, if changing
  if (
    body.business_registration_number &&
    body.business_registration_number !== seller.business_registration_number
  ) {
    const exists =
      await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
        where: {
          business_registration_number: body.business_registration_number,
          id: { not: sellerId },
          deleted_at: null,
        },
      });
    if (exists)
      throw new Error(
        "Business registration number already in use by another seller",
      );
  }

  // 4. Always update updated_at to now
  const now = toISOStringSafe(new Date());

  // 5. Perform update
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_sellers.update(
    {
      where: { id: sellerId },
      data: {
        email: body.email ?? undefined,
        business_registration_number:
          body.business_registration_number ?? undefined,
        name: body.name ?? undefined,
        is_verified: body.is_verified ?? undefined,
        is_active: body.is_active ?? undefined,
        updated_at: now,
      },
    },
  );

  // 6. Return mapped DTO with correct date branding
  return {
    id: updated.id,
    email: updated.email,
    business_registration_number: updated.business_registration_number,
    name: updated.name,
    is_verified: updated.is_verified,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
