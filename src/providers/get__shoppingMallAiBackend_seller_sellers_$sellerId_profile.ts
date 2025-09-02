import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerProfile";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve the full, detailed seller profile for a specific seller by their
 * unique identifier.
 *
 * This endpoint fetches all fields from the seller profile, including display
 * name, contact info, address, and introduction. Only the authenticated seller
 * themselves may access their own profile via this endpoint; cross-access is
 * forbidden. Throws if no profile exists for the given sellerId, or if
 * authorization is violated.
 *
 * @param props - Input props including the authenticated seller and the
 *   requested sellerId
 * @param props.seller - Authenticated SellerPayload (only this seller can view
 *   their profile)
 * @param props.sellerId - The UUID of the seller whose profile is being
 *   requested
 * @returns Complete seller profile object for editing or dashboard display
 * @throws {Error} If attempted to access another seller's profile
 * @throws {Error} If profile record does not exist for this sellerId
 */
export async function get__shoppingMallAiBackend_seller_sellers_$sellerId_profile(props: {
  seller: SellerPayload;
  sellerId: string & import("typia").tags.Format<"uuid">;
}): Promise<
  import("../api/structures/IShoppingMallAiBackendSellerProfile").IShoppingMallAiBackendSellerProfile
> {
  const { seller, sellerId } = props;
  if (seller.id !== sellerId) {
    throw new Error("Forbidden: Cannot access another seller's profile");
  }
  const profile =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_profiles.findFirstOrThrow(
      {
        where: { seller_id: sellerId },
      },
    );
  return {
    id: profile.id,
    seller_id: profile.seller_id,
    display_name: profile.display_name ?? null,
    contact_phone: profile.contact_phone ?? null,
    contact_email: profile.contact_email ?? null,
    address: profile.address ?? null,
    description: profile.description ?? null,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
  };
}
