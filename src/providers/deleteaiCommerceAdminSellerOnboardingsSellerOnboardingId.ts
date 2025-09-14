import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a seller onboarding record from
 * ai_commerce_seller_onboarding.
 *
 * This operation is reserved for administrators and will irreversibly remove
 * the specified seller onboarding application from the database. There is no
 * soft delete: the row is erased permanently. If the record does not exist, or
 * is already deleted, an error is thrown. No additional dispute/legal hold
 * logic is possible since the schema provides no such indicators. Audit logs
 * and compliance evidence stored in other tables are left intact.
 *
 * @param props - The request
 * @param props.admin - The authenticated administrator (authorization is
 *   enforced by contract)
 * @param props.sellerOnboardingId - The UUID of the onboarding record to
 *   permanently delete
 * @returns Void (Promise resolves when deletion is complete; errors if the
 *   record does not exist)
 * @throws {Error} If the onboarding record is not found
 */
export async function deleteaiCommerceAdminSellerOnboardingsSellerOnboardingId(props: {
  admin: AdminPayload;
  sellerOnboardingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { sellerOnboardingId } = props;

  // Ensure the onboarding record exists or throw
  await MyGlobal.prisma.ai_commerce_seller_onboarding.findUniqueOrThrow({
    where: { id: sellerOnboardingId },
  });

  // Perform a hard delete (permanent removal)
  await MyGlobal.prisma.ai_commerce_seller_onboarding.delete({
    where: { id: sellerOnboardingId },
  });

  // Function returns nothing
}
