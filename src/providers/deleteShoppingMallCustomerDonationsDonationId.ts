import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerDonationsDonationId(props: {
  customer: CustomerPayload;
  donationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const donation = await MyGlobal.prisma.shopping_mall_donations.findFirst({
    where: {
      id: props.donationId,
      deleted_at: null,
    },
  });

  if (!donation) {
    throw new HttpException("Donation not found or already deleted", 404);
  }

  if (donation.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You are not authorized to delete this donation",
      403,
    );
  }

  // The business logic for finalization will only allow deletion of non-finalized donations.
  // If donation is settled, refunded or otherwise finalized, prohibit deletion.
  const finalizedStatuses = [
    "confirmed",
    "refunded",
    "failed",
    "completed",
    "cancelled",
  ];
  if (finalizedStatuses.includes(donation.status)) {
    throw new HttpException(
      "Cannot delete a finalized or settled donation",
      409,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_donations.update({
    where: { id: props.donationId },
    data: {
      deleted_at: now,
    },
  });
}
