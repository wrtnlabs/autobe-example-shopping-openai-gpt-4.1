import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerProfile";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update seller profile information for a given sellerId.
 *
 * This endpoint allows an authenticated seller to update their own seller
 * profile information, including display name, contact phone, email, address,
 * and description. The profile is identified by sellerId (must match
 * authenticated seller's id). All updates are logged for audit purposes;
 * contact and sensitive information changes may require re-verification
 * according to business policy (enforced elsewhere). Returns the complete
 * updated profile information.
 *
 * @param props - Route properties
 * @param props.seller - Injected seller authentication payload
 * @param props.sellerId - The UUID for the seller whose profile will be
 *   modified (path parameter)
 * @param props.body - Profile fields to update for the seller
 * @returns The full, updated seller profile (all fields)
 * @throws {Error} If the profile doesn't exist, or the authenticated seller
 *   does not match
 */
export async function put__shoppingMallAiBackend_seller_sellers_$sellerId_profile(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendSellerProfile.IUpdate;
}): Promise<IShoppingMallAiBackendSellerProfile> {
  const { seller, sellerId, body } = props;

  // Fetch the seller profile for the given sellerId
  const profile =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_profiles.findUnique({
      where: {
        seller_id: sellerId,
      },
    });
  if (!profile) {
    throw new Error("Seller profile not found");
  }

  // Authorization: Only the authenticated seller may update their profile
  if (seller.id !== sellerId) {
    throw new Error(
      "Unauthorized: You may only update your own seller profile",
    );
  }

  // Perform the update: update only provided fields and touch updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_profiles.update({
      where: { seller_id: sellerId },
      data: {
        display_name: body.display_name ?? undefined,
        contact_phone: body.contact_phone ?? undefined,
        contact_email: body.contact_email ?? undefined,
        address: body.address ?? undefined,
        description: body.description ?? undefined,
        updated_at: now,
      },
    });

  // Return the updated seller profile in the API structure type
  return {
    id: updated.id,
    seller_id: updated.seller_id,
    display_name: updated.display_name,
    contact_phone: updated.contact_phone,
    contact_email: updated.contact_email,
    address: updated.address,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
