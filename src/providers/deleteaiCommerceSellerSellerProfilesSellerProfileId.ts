import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently delete (hard remove) a seller profile for the specified
 * sellerProfileId.
 *
 * This function enforces that only the owning seller can delete their profile.
 * It performs a hard delete (removing the record from the database), after
 * confirming ownership. The function defers referential integrity checks (e.g.,
 * stores, appeals) to the database. No soft delete is used, even though the
 * model contains deleted_at, per API specification. If dependent child records
 * exist, deletion will fail with a FK constraint error.
 *
 * @param props - The props object containing authentication and parameter info
 * @param props.seller - The authenticated seller (payload)
 * @param props.sellerProfileId - UUID of the seller profile to delete
 * @returns Void
 * @throws {Error} If the seller profile does not exist, the seller does not own
 *   the profile, or deletion is prevented by dependent records.
 */
export async function deleteaiCommerceSellerSellerProfilesSellerProfileId(props: {
  seller: SellerPayload;
  sellerProfileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, sellerProfileId } = props;
  // 1. Fetch profile or fail
  const profile =
    await MyGlobal.prisma.ai_commerce_seller_profiles.findUniqueOrThrow({
      where: { id: sellerProfileId },
    });
  // 2. Only the owning seller may delete
  if (profile.user_id !== seller.id) {
    throw new Error(
      "Unauthorized: Only the owner seller can delete their profile",
    );
  }
  // 3. Attempt hard delete. If there are dependent (e.g. store) FK records, this will error.
  await MyGlobal.prisma.ai_commerce_seller_profiles.delete({
    where: { id: sellerProfileId },
  });
  // (Optional: Write audit log. Not implemented for simplicity, as audit log model is not specified in DTO context.)
}
