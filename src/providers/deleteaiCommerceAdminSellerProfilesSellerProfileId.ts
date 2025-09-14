import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete (hard remove) a seller profile for the specified
 * sellerProfileId.
 *
 * This operation irreversibly deletes a seller profile from the
 * ai_commerce_seller_profiles table. Only an authenticated admin can perform
 * this operation. Before deletion, the function checks for child references in
 * ai_commerce_stores, ai_commerce_seller_status_history,
 * ai_commerce_seller_appeals, and ai_commerce_seller_disputes. If any
 * references exist, the deletion is blocked and an error is thrown. Each delete
 * operation is audit logged in ai_commerce_audit_logs_seller with a complete
 * snapshot of the deleted entity for compliance.
 *
 * @param props - The operation properties
 * @param props.admin - The authenticated admin initiating the deletion
 * @param props.sellerProfileId - The unique identifier of the seller profile to
 *   delete
 * @returns Void
 * @throws {Error} If the seller profile does not exist, if child records
 *   prevent deletion, or if another error occurs
 */
export async function deleteaiCommerceAdminSellerProfilesSellerProfileId(props: {
  admin: AdminPayload;
  sellerProfileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, sellerProfileId } = props;

  // Step 1: Fetch profile
  const profile = await MyGlobal.prisma.ai_commerce_seller_profiles.findUnique({
    where: { id: sellerProfileId },
  });
  if (profile == null) throw new Error("Seller profile not found");

  // Step 2: Check for referential integrity (block if any dependent children exist)
  const [stores, statusHistory, appeals, disputes] = await Promise.all([
    MyGlobal.prisma.ai_commerce_stores.count({
      where: { seller_profile_id: sellerProfileId },
    }),
    MyGlobal.prisma.ai_commerce_seller_status_history.count({
      where: { seller_profile_id: sellerProfileId },
    }),
    MyGlobal.prisma.ai_commerce_seller_appeals.count({
      where: { seller_profile_id: sellerProfileId },
    }),
    MyGlobal.prisma.ai_commerce_seller_disputes.count({
      where: { seller_profile_id: sellerProfileId },
    }),
  ]);
  if (stores > 0)
    throw new Error("Cannot delete seller profile: Linked stores exist");
  if (statusHistory > 0)
    throw new Error(
      "Cannot delete seller profile: Linked status history exists",
    );
  if (appeals > 0)
    throw new Error("Cannot delete seller profile: Linked appeals exist");
  if (disputes > 0)
    throw new Error("Cannot delete seller profile: Linked disputes exist");

  // Step 3: Hard delete of seller profile
  await MyGlobal.prisma.ai_commerce_seller_profiles.delete({
    where: { id: sellerProfileId },
  });

  // Step 4: Audit log snapshot for compliance
  await MyGlobal.prisma.ai_commerce_audit_logs_seller.create({
    data: {
      seller_profile_id: sellerProfileId,
      event_type: "profile_delete",
      event_data: JSON.stringify(profile),
      actor: admin.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
