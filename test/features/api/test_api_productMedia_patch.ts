import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductMedia";
import { IProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductMedia";

export async function test_api_productMedia_patch(connection: api.IConnection) {
  const output: IPageIProductMedia = await api.functional.productMedia.patch(
    connection,
    {
      body: typia.random<IProductMedia.IRequest>(),
    },
  );
  typia.assert(output);
}
