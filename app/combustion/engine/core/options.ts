// Scene switches the page can set: the airflow and the see-through view.


// Scene switches the page can set; the page begins with all of them off
// `seeThrough`: the engine's see-through parts (the head, the block, the pipes, the housings) as they are, or all solid,
// a plain engine; it begins see-through
// `hd`: the engine drawn at twice the screen's resolution each way and brought down to it (supersampling): smooth edges,
// the fine textures and the small parts sharp and still; on from the start on a computer, off on a phone or a tablet
export const SCENE_OPTIONS = {
  airflow: false,
  seeThrough: true,
  hd: typeof window !== "undefined" && !window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches,
};
