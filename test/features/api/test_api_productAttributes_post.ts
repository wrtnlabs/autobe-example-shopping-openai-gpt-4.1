import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductAttribute";

export async function test_api_productAttributes_post(
  connection: api.IConnection,
) {
  const output: IProductAttribute = await api.functional.productAttributes.post(
    connection,
    {
      body: typia.random<IProductAttribute.ICreate>(),
    },
  );
  typia.assert(output);
}
