import test from "ava";
import { LuminanceMaterial } from "postprocessing/module";

test("can be created", t => {

	const object = new LuminanceMaterial();
	t.pass();

});
