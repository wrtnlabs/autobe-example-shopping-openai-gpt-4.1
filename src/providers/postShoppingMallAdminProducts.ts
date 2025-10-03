import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProducts(props: {
  admin: AdminPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  try {
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.shopping_mall_products.create({
      data: {
        id: v4(),
        shopping_mall_seller_id: props.body.shopping_mall_seller_id,
        shopping_mall_channel_id: props.body.shopping_mall_channel_id,
        shopping_mall_section_id: props.body.shopping_mall_section_id,
        shopping_mall_category_id: props.body.shopping_mall_category_id,
        code: props.body.code,
        name: props.body.name,
        status: props.body.status,
        business_status: props.body.business_status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_channel_id: true,
        shopping_mall_section_id: true,
        shopping_mall_category_id: true,
        code: true,
        name: true,
        status: true,
        business_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return {
      id: created.id,
      shopping_mall_seller_id: created.shopping_mall_seller_id,
      shopping_mall_channel_id: created.shopping_mall_channel_id,
      shopping_mall_section_id: created.shopping_mall_section_id,
      shopping_mall_category_id: created.shopping_mall_category_id,
      code: created.code,
      name: created.name,
      status: created.status,
      business_status: created.business_status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Product code already exists for this seller.",
        409,
      );
    }
    const errorMessage =
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof (err as any).message === "string"
        ? (err as any).message
        : "Unknown error";
    throw new HttpException("Failed to create product: " + errorMessage, 500);
  }
}
