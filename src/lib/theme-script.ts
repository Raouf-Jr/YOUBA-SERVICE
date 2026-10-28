/** Storage key for the light / dark choice (shared by the inline script and the toggle). */
export const THEME_KEY = "youba:theme";

/** Runs in <head> before the first paint, so a saved choice never flashes. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
