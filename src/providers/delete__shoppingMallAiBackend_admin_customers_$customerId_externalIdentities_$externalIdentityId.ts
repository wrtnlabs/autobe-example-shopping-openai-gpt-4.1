import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Remove/unlink a specific external identity from a customer profile. (Hard
 * delete)
 *
 * This API deletes an external identity provider connection physically from the
 * database for the specified customer. Only platform administrators can invoke
 * this operation; customer ownership is enforced by customerId parameter. If
 * the external identity does not belong to the given customer, or does not
 * exist, an error is thrown. This is a hard delete (no soft delete field in
 * schema).
 *
 * @param props - The request properties
 * @param props.admin - Authenticated admin user (must be present)
 * @param props.customerId - UUID of the target customer whose mapping is being
 *   removed
 * @param props.externalIdentityId - UUID of the external identity mapping to
 *   remove
 * @returns Void
 * @throws {Error} When the mapping does not exist for the customer
 */
export async function delete__shoppingMallAiBackend_admin_customers_$customerId_externalIdentities_$externalIdentityId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  externalIdentityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customerId, externalIdentityId } = props;

  // Confirm the mapping exists and is linked to the given customer.
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findFirst(
      {
        where: {
          id: externalIdentityId,
          customer_id: customerId,
        },
      },
    );
  if (!mapping) {
    throw new Error("External identity mapping not found for this customer");
  }

  // Remove the external identity mapping from the database (hard delete).
  await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.delete(
    {
      where: {
        id: externalIdentityId,
      },
    },
  );
}
