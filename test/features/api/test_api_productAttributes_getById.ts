import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductAttribute";

export async function test_api_productAttributes_getById(
  connection: api.IConnection,
) {
  const output: IProductAttribute =
    await api.functional.productAttributes.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
