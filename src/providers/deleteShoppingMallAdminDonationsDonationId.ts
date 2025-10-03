import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminDonationsDonationId(props: {
  admin: AdminPayload;
  donationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Lookup (not already deleted)
  const donation = await MyGlobal.prisma.shopping_mall_donations.findFirst({
    where: {
      id: props.donationId,
      deleted_at: null,
    },
  });
  if (!donation) {
    throw new HttpException("Donation not found or already deleted.", 404);
  }
  // Step 2: Check if status is finalized/protected
  const protectedStatuses = ["confirmed", "refunded", "failed"]; // adjust as per business logic
  if (protectedStatuses.includes(donation.status)) {
    throw new HttpException(
      "Cannot delete a finalized or protected donation.",
      409,
    );
  }

  // Step 3: Soft delete (set deleted_at)
  await MyGlobal.prisma.shopping_mall_donations.update({
    where: { id: props.donationId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
