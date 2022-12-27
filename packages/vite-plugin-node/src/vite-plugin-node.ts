import type { Plugin, UserConfig } from 'vite';

import type { VitePluginNodeConfig } from './index.js';
import { PLUGIN_NAME } from './index.js';
import { RollupPluginSwc } from './rollup-plugin-swc.js';
import { createMiddleware } from './server/index.js';
import mergeDeep from './utils.js';


export function VitePluginNode(cfg: VitePluginNodeConfig): Plugin[] {
	const swcOptions = mergeDeep({
		module: {
			type: 'es6',
		},
		jsc: {
			target: 'es2019',
			parser: {
				syntax:     'typescript',
				decorators: true,
			},
			transform: {
				legacyDecorator:   true,
				decoratorMetadata: true,
			},
		},
	}, cfg.swcOptions ?? {});

	const config: VitePluginNodeConfig = {
		appPath:    cfg.appPath,
		adapter:    cfg.adapter,
		appName:    cfg.appName ?? 'app',
		tsCompiler: cfg.tsCompiler ?? 'esbuild',
		exportName: cfg.exportName ?? 'viteNodeApp',
		swcOptions,
	};

	const plugins: Plugin[] = [
		{
			name:   PLUGIN_NAME,
			config: () => {
				const plugincConfig: UserConfig & { VitePluginNodeConfig: VitePluginNodeConfig } = {
					build: {
						ssr:           config.appPath,
						rollupOptions: {
							input: config.appPath,
						},
					},
					server: {
						hmr: false,
					},
					optimizeDeps: {
						// Vite does not work well with optionnal dependencies,
						// mark them as ignored for now
						exclude: [ '@swc/core' ],
					},
					VitePluginNodeConfig: config,
				};

				if (config.tsCompiler === 'swc')
					plugincConfig.esbuild = false;

				return plugincConfig;
			},
			configureServer: (server) => {
				server.middlewares.use(createMiddleware(server));
			},
		},
	];

	if (config.tsCompiler === 'swc') {
		plugins.push({
			...RollupPluginSwc(config.swcOptions!),
		});
	}

	return plugins;
}
