// Scene switches the page can set: the airflow and the see-through view.


// Scene switches the page can set; the page begins with all of them off
// `seeThrough`: the engine's see-through parts (the head, the block, the pipes, the housings) as they are, or all solid,
// a plain engine; it begins see-through
// `hd`: the engine drawn at twice the screen's resolution each way and brought down to it (supersampling): smooth edges,
// the fine textures and the small parts sharp and still. On when the page loads, on every screen (the same on the server and
// in the browser, so the page hydrates cleanly); the HD button turns it off
// `accessories`: the accessory drive at the front (the belt, its pulleys, the alternator, the water pump, the power steering
// pump, the tensioner), shown, or taken away to see the front of the engine (the View panel)
// `intercoolers`: the two intercoolers (their cores, fans and tanks), shown, or taken away (the View panel)
// `airIntake`: the air filters and their pipes into the turbocharger, shown, or taken away (the View panel)
// `plenum`: the red intake plenum on top of the V, its throttle and the two cooled pipes into it, shown (on the solid engine),
// or taken away (the View panel)
export const SCENE_OPTIONS = { airflow: false, seeThrough: true, hd: true, accessories: true, intercoolers: true, airIntake: true, plenum: true };
