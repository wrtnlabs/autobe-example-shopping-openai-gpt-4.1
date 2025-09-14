import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new store banking/payout record for a seller’s store
 * (ai_commerce_store_banking).
 *
 * This endpoint registers new banking details for a seller's store, ensuring
 * all compliance-required fields are provided. The banking record is stored
 * pending verification and can only be created by the authenticated store
 * owner.
 *
 * Authorization is enforced by verifying ownership of the target store before
 * banking info is registered. The function strictly serializes all dates as
 * string & tags.Format<'date-time'>. ID fields are generated using v4() to
 * guarantee uniqueness. Sensitive and system fields are mapped precisely,
 * following type-safe conversions with no native Date usage, type assertions,
 * or unsafe casting.
 *
 * @param props - The request properties
 * @param props.seller - The authenticated SellerPayload role (must own the
 *   store to register banking)
 * @param props.body - The store banking details (see
 *   IAiCommerceStoreBanking.ICreate)
 * @returns The newly created IAiCommerceStoreBanking resource with all current
 *   fields
 * @throws {Error} If the store does not exist, is deleted, or is not owned by
 *   the seller
 */
export async function postaiCommerceSellerStoreBanking(props: {
  seller: SellerPayload;
  body: IAiCommerceStoreBanking.ICreate;
}): Promise<IAiCommerceStoreBanking> {
  const { seller, body } = props;

  // Step 1: Authorization
  const store = await MyGlobal.prisma.ai_commerce_stores.findFirst({
    where: {
      id: body.store_id,
      owner_user_id: seller.id,
      deleted_at: null,
    },
  });
  if (!store) {
    throw new Error("Store not found or permission denied");
  }

  // Step 2: Prepare fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4();

  // Step 3: Create the banking record
  const created = await MyGlobal.prisma.ai_commerce_store_banking.create({
    data: {
      id: newId,
      store_id: body.store_id,
      bank_name: body.bank_name,
      account_number: body.account_number,
      account_holder_name: body.account_holder_name,
      routing_code: body.routing_code ?? undefined,
      banking_metadata: body.banking_metadata ?? undefined,
      verified: false,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 4: Map DB result to DTO type
  return {
    id: created.id,
    store_id: created.store_id,
    bank_name: created.bank_name,
    account_number: created.account_number,
    account_holder_name: created.account_holder_name,
    routing_code: created.routing_code ?? undefined,
    banking_metadata: created.banking_metadata ?? undefined,
    verified: created.verified,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
