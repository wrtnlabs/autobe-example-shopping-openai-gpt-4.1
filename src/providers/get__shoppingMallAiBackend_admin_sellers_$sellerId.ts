import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information for a seller merchant account by their UUID
 * (admin access required, soft-delete aware).
 *
 * Returns full legal and business profile information required for
 * compliance/audit, including id, email, business registration number, name,
 * verification and activation status, and timestamps. Only accessible by
 * authenticated admin users.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin (AdminPayload) making the
 *   request
 * @param props.sellerId - UUID of the seller merchant account to retrieve
 * @returns Complete seller account profile (IShoppingMallAiBackendSeller)
 * @throws {Error} When the specified seller does not exist or is soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_sellers_$sellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendSeller> {
  const { admin, sellerId } = props;
  const seller =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
      where: {
        id: sellerId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        business_registration_number: true,
        name: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!seller) {
    throw new Error("Seller not found");
  }
  return {
    id: seller.id,
    email: seller.email,
    business_registration_number: seller.business_registration_number,
    name: seller.name,
    is_verified: seller.is_verified,
    is_active: seller.is_active,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at !== null && seller.deleted_at !== undefined
        ? toISOStringSafe(seller.deleted_at)
        : undefined,
  };
}
