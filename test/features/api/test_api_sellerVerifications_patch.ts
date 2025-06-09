import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISellerVerification";
import { ISellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerVerification";

export async function test_api_sellerVerifications_patch(
  connection: api.IConnection,
) {
  const output: IPageISellerVerification =
    await api.functional.sellerVerifications.patch(connection, {
      body: typia.random<ISellerVerification.IRequest>(),
    });
  typia.assert(output);
}
