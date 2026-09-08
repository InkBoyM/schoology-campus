import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Static SPA build served by the FastAPI backend (same origin, no CORS issues).
		// Dynamic routes (e.g. /grades/[index]) fall back to index.html; all grade
		// data lives in the browser (localStorage), so no SSR is needed.
		adapter: adapterStatic({
			fallback: 'index.html'
		})
	}
};

export default config;
