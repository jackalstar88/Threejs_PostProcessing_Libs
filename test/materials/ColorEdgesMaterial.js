import test from "ava";
import { ColorEdgesMaterial } from "../../build/postprocessing.umd.js";

test("can be created", t => {

	const object = new ColorEdgesMaterial();

	t.truthy(object);

});
