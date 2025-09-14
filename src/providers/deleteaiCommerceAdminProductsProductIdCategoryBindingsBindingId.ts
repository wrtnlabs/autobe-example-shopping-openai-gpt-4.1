import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a category binding between a product and a category.
 *
 * This operation allows an admin user to remove the association between a
 * product and a category. It validates the binding's existence and ensures it
 * belongs to the specified product. Upon successful validation, the binding is
 * permanently deleted from the database (hard delete). Only admins may perform
 * this action. If the binding does not exist or is not associated with the
 * given product, an error is thrown. No body or content is returned upon
 * success.
 *
 * @param props - Operation parameters
 * @param props.admin - Authenticated admin user (authorization performed
 *   upstream)
 * @param props.productId - UUID of the target product
 * @param props.bindingId - UUID of the category binding to remove
 * @returns Void
 * @throws {Error} If binding does not exist or does not match product
 */
export async function deleteaiCommerceAdminProductsProductIdCategoryBindingsBindingId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { productId, bindingId } = props;

  // Step 1: Confirm the binding exists and is for this product
  const binding =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.findFirst({
      where: { id: bindingId },
    });
  if (!binding || binding.product_id !== productId) {
    throw new Error("Binding not found or does not match specified product");
  }

  // Step 2: Delete the binding (hard delete)
  await MyGlobal.prisma.ai_commerce_product_category_bindings.delete({
    where: { id: bindingId },
  });
  // Success: no content returned
}
