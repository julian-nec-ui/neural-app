// Scene switches the page can set: the airflow and the see-through view.


// Scene switches the page can set; the page begins with all of them off
// `seeThrough`: the engine's see-through parts (the head, the block, the pipes, the housings) as they are, or all solid,
// a plain engine; it begins see-through
// `hd`: the engine drawn at twice the screen's resolution each way and brought down to it (supersampling): smooth edges,
// the fine textures and the small parts sharp and still. It begins off, as the server renders the page; once the page is
// in the browser, a computer turns it on (`hdSet`: that first choice made, so that a remount keeps whatever was chosen since)
export const SCENE_OPTIONS = { airflow: false, seeThrough: true, hd: false, hdSet: false };
