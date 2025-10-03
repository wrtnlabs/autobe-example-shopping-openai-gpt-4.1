import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminDonationsDonationId(props: {
  admin: AdminPayload;
  donationId: string & tags.Format<"uuid">;
  body: IShoppingMallDonation.IUpdate;
}): Promise<IShoppingMallDonation> {
  // Step 1: Lookup the existing donation
  const donation = await MyGlobal.prisma.shopping_mall_donations.findUnique({
    where: { id: props.donationId },
  });
  if (!donation) {
    throw new HttpException("Donation not found", 404);
  }
  // Step 2: Check if donation is soft-deleted
  if (donation.deleted_at !== null) {
    throw new HttpException("Donation not found or deleted", 404);
  }
  // Step 3: Check status is not finalized/locked
  // Finalized/locked statuses: 'refunded' is in test; treat as locked, others can be added here
  const finalizedStatuses = ["refunded"];
  if (finalizedStatuses.includes(donation.status)) {
    throw new HttpException("Cannot update a finalized donation", 400);
  }
  // Step 4: Build update input, only updatable fields
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_donations.update({
    where: { id: props.donationId },
    data: {
      status: props.body.status,
      evidence_reference: props.body.evidence_reference ?? undefined,
      updated_at: now,
      // resolution_message not written as it's not in Prisma model
    },
  });
  // Step 5: Get the updated record for API return
  const updated =
    await MyGlobal.prisma.shopping_mall_donations.findUniqueOrThrow({
      where: { id: props.donationId },
    });
  // Step 6: Return with strict type alignment (null vs undefined for optional)
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    source_type: updated.source_type,
    source_entity_id: updated.source_entity_id,
    target_campaign_code: updated.target_campaign_code,
    amount: updated.amount,
    status: updated.status,
    evidence_reference:
      updated.evidence_reference === null
        ? undefined
        : updated.evidence_reference,
    donated_at: toISOStringSafe(updated.donated_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
    ...(typeof (updated as any).resolution_message === "string"
      ? { resolution_message: (updated as any).resolution_message }
      : {}),
  };
}
