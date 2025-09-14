import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new product-section binding (ai_commerce_product_section_bindings).
 *
 * This operation allows an authorized seller to associate their own product
 * with a specific merchandising section, affecting how it is presented within a
 * sales channel (e.g., 'Best Sellers', 'Curated Picks'). It performs strict
 * business validation: ensuring product ownership (seller must own the
 * product), that the section exists and is active, and that no duplicate
 * binding exists for the (product, section) pair. On success, returns the
 * created binding for further workflows.
 *
 * @param props - Object containing seller authentication, path parameter, and
 *   creation body
 * @param props.seller - The authenticated seller performing the binding
 * @param props.productId - The UUID of the product to bind
 * @param props.body - The create-request body containing section_id and
 *   display_order
 * @returns The created product-section binding
 *   (IAiCommerceProductSectionBinding)
 * @throws {Error} If the product does not exist, is not owned by the seller, or
 *   is deleted
 * @throws {Error} If the section does not exist, is not active, or is deleted
 * @throws {Error} If a duplicate (product_id, section_id) binding already
 *   exists
 */
export async function postaiCommerceSellerProductsProductIdSectionBindings(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSectionBinding.ICreate;
}): Promise<IAiCommerceProductSectionBinding> {
  const { seller, productId, body } = props;

  // 1. Ensure the product exists and is owned by the seller, and not deleted.
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new Error("Product not found, unauthorized, or deleted");
  }

  // 2. Ensure the section exists, is active, and not deleted.
  const section = await MyGlobal.prisma.ai_commerce_sections.findFirst({
    where: {
      id: body.section_id,
      is_active: true,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new Error("Section not found or not active");
  }

  // 3. Ensure there is no existing (product_id, section_id) binding.
  const existing =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.findFirst({
      where: {
        product_id: productId,
        section_id: body.section_id,
      },
    });
  if (existing) {
    throw new Error(
      "A binding between this product and section already exists",
    );
  }

  // 4. Create new binding with freshly generated UUID.
  const newId = v4();

  const created =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.create({
      data: {
        id: newId,
        product_id: productId,
        section_id: body.section_id,
        display_order: body.display_order,
      },
    });

  // 5. Return fully-typed DTO (no as/type assertion, let branding flow by type checks)
  return {
    id: created.id,
    product_id: created.product_id,
    section_id: created.section_id,
    display_order: created.display_order,
  };
}
