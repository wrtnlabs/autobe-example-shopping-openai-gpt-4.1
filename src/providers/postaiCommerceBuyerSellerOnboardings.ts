import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create new seller onboarding application (ai_commerce_seller_onboarding
 * table).
 *
 * This operation initiates a new seller onboarding application in the commerce
 * system by inserting a record into the ai_commerce_seller_onboarding table. It
 * is used by authenticated buyers aspiring to become sellers, encompassing
 * business and compliance onboarding, KYC, and disclosure submission. The
 * function validates, generates identifiers and timestamps, and stores all
 * provided information for review by admin/compliance teams.
 *
 * @param props - The request context and creation parameters
 * @param props.buyer - The authenticated buyer submitting the onboarding
 *   application
 * @param props.body - Application data for onboarding, including user_id,
 *   application_data, onboarding_status, and optional fields
 * @returns The newly created onboarding application record, including generated
 *   identifiers, timestamps, and all workflow information
 * @throws Error if database operation fails.
 */
export async function postaiCommerceBuyerSellerOnboardings(props: {
  buyer: BuyerPayload;
  body: IAiCommerceSellerOnboarding.ICreate;
}): Promise<IAiCommerceSellerOnboarding> {
  const { buyer, body } = props;

  // Generate new UUID and ISO timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const onboardingId: string & tags.Format<"uuid"> = v4();

  // Prepare creation fields, strictly no Date, no as; follow schema exactly
  const created = await MyGlobal.prisma.ai_commerce_seller_onboarding.create({
    data: {
      id: onboardingId,
      user_id: body.user_id,
      store_id:
        typeof body.store_id === "string"
          ? body.store_id
          : body.store_id === null
            ? null
            : undefined,
      application_data: body.application_data,
      onboarding_status: body.onboarding_status,
      current_stage: body.current_stage ?? undefined,
      notes: body.notes ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Return all required/optional fields as IAiCommerceSellerOnboarding, strictly typed
  return {
    id: created.id,
    user_id: created.user_id,
    store_id: created.store_id ?? undefined,
    application_data: created.application_data,
    onboarding_status: created.onboarding_status,
    current_stage: created.current_stage ?? undefined,
    notes: created.notes ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
