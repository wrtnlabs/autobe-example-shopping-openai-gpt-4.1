import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Withdraw (delete) a pending seller appeal (ai_commerce_seller_appeals) by ID.
 *
 * This operation allows an authenticated seller to withdraw their own appeal
 * record if it is unresolved (status: 'open' or 'reviewable'). If the schema
 * does not support soft delete via `deleted_at`, it performs a hard delete.
 * Appeals in finalized, resolved, or locked status cannot be withdrawn by the
 * seller and require admin intervention.
 *
 * The operation checks ownership by traversing from seller_appeal to
 * seller_profile to the authenticated seller. Attempts to withdraw appeals not
 * owned by the caller or already deleted will throw errors. All date fields are
 * handled as ISO8601 strings without the Date type.
 *
 * @param props - Object containing the seller authentication payload and the
 *   appeal ID to withdraw
 * @param props.seller - The authenticated seller making the request (must own
 *   the appeal via seller_profile)
 * @param props.sellerAppealId - The unique seller appeal ID to withdraw (UUID
 *   format)
 * @returns Void
 * @throws {Error} If the appeal does not exist, is already deleted, is not
 *   owned by the seller, or is not in a modifiable state (open/reviewable)
 */
export async function deleteaiCommerceSellerSellerAppealsSellerAppealId(props: {
  seller: SellerPayload;
  sellerAppealId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, sellerAppealId } = props;

  // Fetch appeal by id
  const appeal = await MyGlobal.prisma.ai_commerce_seller_appeals.findFirst({
    where: { id: sellerAppealId },
  });
  if (!appeal) {
    throw new Error("Seller appeal not found or already deleted");
  }

  // Ownership validation: fetch seller_profile and check user_id matches seller.id
  const profile = await MyGlobal.prisma.ai_commerce_seller_profiles.findFirst({
    where: { id: appeal.seller_profile_id },
  });
  if (!profile || profile.user_id !== seller.id) {
    throw new Error("Forbidden: You do not own this appeal");
  }

  // Business logic: only allow withdrawal if status is 'open' or 'reviewable'
  if (appeal.status !== "open" && appeal.status !== "reviewable") {
    throw new Error(
      "Forbidden: Only open or reviewable appeals may be withdrawn",
    );
  }

  // Since 'deleted_at' does not exist, perform hard delete
  await MyGlobal.prisma.ai_commerce_seller_appeals.delete({
    where: { id: sellerAppealId },
  });
}
