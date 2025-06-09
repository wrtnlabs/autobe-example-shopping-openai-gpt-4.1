import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariant";

export async function test_api_productVariants_eraseById(
  connection: api.IConnection,
) {
  const output: IProductVariant =
    await api.functional.productVariants.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
