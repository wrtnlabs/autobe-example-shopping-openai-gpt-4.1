import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDonation";
import { IDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDonation";

export async function test_api_donations_patch(connection: api.IConnection) {
  const output: IPageIDonation = await api.functional.donations.patch(
    connection,
    {
      body: typia.random<IDonation.IRequest>(),
    },
  );
  typia.assert(output);
}
