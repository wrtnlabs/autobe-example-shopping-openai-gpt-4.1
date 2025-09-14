import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get full details for a specific seller onboarding application
 * (ai_commerce_seller_onboarding table).
 *
 * This endpoint retrieves detailed information about a seller onboarding
 * application using its unique onboarding ID. Only accessible to administrators
 * due to the sensitive nature of KYC, compliance, and business application
 * data. Returns all application, status, stage, notes, and audit fields for
 * compliance review or workflow processing.
 *
 * @param props - Object containing the admin authentication and onboarding
 *   application ID
 * @param props.admin - The authenticated administrator performing the operation
 * @param props.sellerOnboardingId - Unique identifier for the seller onboarding
 *   application
 * @returns The complete seller onboarding application details, including all
 *   business and compliance fields
 * @throws {Error} Throws if no matching onboarding application is found or
 *   access is forbidden
 */
export async function getaiCommerceAdminSellerOnboardingsSellerOnboardingId(props: {
  admin: AdminPayload;
  sellerOnboardingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerOnboarding> {
  const record =
    await MyGlobal.prisma.ai_commerce_seller_onboarding.findUniqueOrThrow({
      where: { id: props.sellerOnboardingId },
    });
  return {
    id: record.id,
    user_id: record.user_id,
    store_id: record.store_id ?? undefined,
    application_data: record.application_data,
    onboarding_status: record.onboarding_status,
    current_stage: record.current_stage ?? undefined,
    notes: record.notes ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
