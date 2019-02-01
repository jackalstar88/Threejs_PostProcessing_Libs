import test from "ava";
import { BokehEffect } from "../../build/postprocessing.umd.js";

test("can be created and destroyed", t => {

	const object = new BokehEffect();
	object.dispose();

	t.truthy(object);

});
