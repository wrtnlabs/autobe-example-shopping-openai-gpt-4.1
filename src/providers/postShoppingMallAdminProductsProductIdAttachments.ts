import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttachmentLink";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdAttachments(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttachmentLink.ICreate;
}): Promise<IShoppingMallProductAttachmentLink> {
  // 1. Product existence check (not deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Attachment existence check (not deleted)
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findFirst({
    where: {
      id: props.body.attachment_id,
      deleted_at: null,
    },
  });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // 3. Create link (catch duplicate error)
  try {
    const created =
      await MyGlobal.prisma.shopping_mall_product_attachment_links.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_product_id: props.productId,
          attachment_id: props.body.attachment_id,
          purpose: props.body.purpose,
          position: props.body.position,
        },
      });

    // 4. Return DTO - optional expansion
    return {
      id: created.id,
      shopping_mall_product_id: created.shopping_mall_product_id,
      attachment_id: created.attachment_id,
      purpose: created.purpose,
      position: created.position,
      product: undefined,
      attachment: undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate attachment link for this product and purpose/position",
        409,
      );
    }
    throw err;
  }
}
