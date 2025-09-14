import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update seller onboarding application information or status
 * (ai_commerce_seller_onboarding table).
 *
 * Allows an administrator to update details or workflow status of a seller
 * onboarding application within ai_commerce_seller_onboarding. Fields updated
 * may include application_data, onboarding_status, current_stage, notes, or
 * store_id, according to business workflow rules. All updates are subject to
 * audit and workflow compliance. Strictly enforces that only existing, active
 * onboarding applications can be updated. Updates the updated_at timestamp for
 * audit compliance. Returns the updated record as per the
 * IAiCommerceSellerOnboarding schema, with all date fields provided as branded
 * ISO strings.
 *
 * @param props Object containing the authenticated admin, onboarding record ID,
 *   and update fields
 * @param props.admin Authenticated admin user performing the update
 * @param props.sellerOnboardingId UUID of the onboarding record being updated
 * @param props.body Fields to update (partial allowed: application_data,
 *   onboarding_status, current_stage, notes, store_id)
 * @returns The updated seller onboarding application record
 * @throws Error if the onboarding record does not exist or has been deleted
 */
export async function putaiCommerceAdminSellerOnboardingsSellerOnboardingId(props: {
  admin: AdminPayload;
  sellerOnboardingId: string & tags.Format<"uuid">;
  body: IAiCommerceSellerOnboarding.IUpdate;
}): Promise<IAiCommerceSellerOnboarding> {
  const { sellerOnboardingId, body } = props;

  // Fetch the seller onboarding record and check active status
  const existing =
    await MyGlobal.prisma.ai_commerce_seller_onboarding.findFirst({
      where: { id: sellerOnboardingId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Onboarding application not found");
  }

  // Prepare update data: only the provided fields are included
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData = {
    ...(body.application_data !== undefined && {
      application_data: body.application_data,
    }),
    ...(body.onboarding_status !== undefined && {
      onboarding_status: body.onboarding_status,
    }),
    ...(body.current_stage !== undefined && {
      current_stage: body.current_stage,
    }),
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.store_id !== undefined && { store_id: body.store_id }),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.ai_commerce_seller_onboarding.update({
    where: { id: sellerOnboardingId },
    data: updateData,
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    store_id: updated.store_id ?? undefined,
    application_data: updated.application_data,
    onboarding_status: updated.onboarding_status,
    current_stage: updated.current_stage ?? undefined,
    notes: updated.notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
