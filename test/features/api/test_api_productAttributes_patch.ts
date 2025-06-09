import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductAttribute";
import { IProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductAttribute";

export async function test_api_productAttributes_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductAttribute =
    await api.functional.productAttributes.patch(connection, {
      body: typia.random<IProductAttribute.IRequest>(),
    });
  typia.assert(output);
}
