import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductMedia";

export async function test_api_productMedia_post(connection: api.IConnection) {
  const output: IProductMedia = await api.functional.productMedia.post(
    connection,
    {
      body: typia.random<IProductMedia.ICreate>(),
    },
  );
  typia.assert(output);
}
