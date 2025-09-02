import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Remove/unlink a specific external identity from a customer profile. (Hard
 * delete)
 *
 * This operation removes a linked external identity (social sign-in, OAuth,
 * etc.) from a user's profile. Used on user request (unlink a social account)
 * or by admin for identity/data management and privacy compliance. The schema
 * has no soft delete field, so the linked identity is physically removed from
 * the database.
 *
 * Only the customer owner or authorized platform admins may perform this
 * deletion. Actions are audit-logged. Attempting to delete a non-owned or
 * already-deleted mapping will result in error.
 *
 * @param props - Request properties.
 * @param props.customer - The authenticated customer payload (must match
 *   customerId).
 * @param props.customerId - The UUID of the customer in whose profile the
 *   external identity will be deleted. Must match customer.id for safety.
 * @param props.externalIdentityId - The UUID of the external identity to delete
 *   from customer profile.
 * @returns Void
 * @throws {Error} If URL customerId does not match signed in customer, or if
 *   the record is not found, or if ownership check fails.
 */
export async function delete__shoppingMallAiBackend_customer_customers_$customerId_externalIdentities_$externalIdentityId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  externalIdentityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, customerId, externalIdentityId } = props;

  // Authorization: Prevent tampering with the URL/customerId
  if (customerId !== customer.id) {
    throw new Error(
      "Forbidden: Authenticated customer and URL customerId mismatch",
    );
  }
  // Fetch the external identity record by primary key
  const record =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findUnique(
      {
        where: { id: externalIdentityId },
      },
    );
  if (!record) {
    throw new Error("External identity not found");
  }
  // Enforce ownership (customer must own the external identity)
  if (record.customer_id !== customer.id) {
    throw new Error(
      "Forbidden: Cannot delete external identity of another customer",
    );
  }
  // Perform hard delete
  await MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.delete(
    {
      where: { id: externalIdentityId },
    },
  );
}
