import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Remove a product's section binding (ai_commerce_product_section_bindings).
 *
 * Authorized administrators can call this function to hard-delete a specific
 * product-section binding entry. This operation permanently removes the product
 * from the section's merchandising configuration. Deletion is a hard delete (no
 * soft delete field) and is strictly audited by the rest of the system.
 *
 * If the specified binding does not exist, an error is thrown. Authorization is
 * enforced via the admin parameter (validated upstream).
 *
 * @param props - Properties for the operation
 * @param props.admin - Authenticated admin payload
 * @param props.productId - UUID of the product whose section binding is to be
 *   deleted
 * @param props.bindingId - UUID of the section binding record to delete
 * @returns Void
 * @throws {Error} If the specified binding does not exist for the product
 */
export async function deleteaiCommerceAdminProductsProductIdSectionBindingsBindingId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { productId, bindingId } = props;
  const binding =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.findFirst({
      where: { id: bindingId, product_id: productId },
    });
  if (!binding) {
    throw new Error(
      "Binding not found for the specified productId and bindingId",
    );
  }
  await MyGlobal.prisma.ai_commerce_product_section_bindings.delete({
    where: { id: bindingId },
  });
}
