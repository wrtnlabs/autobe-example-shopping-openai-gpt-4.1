import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShipment";
import { IShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShipment";

export async function test_api_shipments_patch(connection: api.IConnection) {
  const output: IPageIShipment = await api.functional.shipments.patch(
    connection,
    {
      body: typia.random<IShipment.IRequest>(),
    },
  );
  typia.assert(output);
}
