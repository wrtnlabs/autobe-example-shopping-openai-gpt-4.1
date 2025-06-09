import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerVerification";

export async function test_api_sellerVerifications_getById(
  connection: api.IConnection,
) {
  const output: ISellerVerification =
    await api.functional.sellerVerifications.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
