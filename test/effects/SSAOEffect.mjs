import test from "ava";
import { SSAOEffect } from "postprocessing/module";

test("can be created and destroyed", t => {

	const object = new SSAOEffect(null);
	object.dispose();

	t.pass();

});
