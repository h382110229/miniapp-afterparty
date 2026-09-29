import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

function patchPluginNames(plugins: any[]): any[] {
  for (let i = 0; i < plugins.length; i++) {
    const p = plugins[i];
    if (!p) continue;
    if (typeof p === 'function') {
      try {
        Object.defineProperty(p, 'name', {
          value: p.name || `uni-plugin-func-${i}`,
          writable: true,
          configurable: true,
        });
      } catch {}
    } else if (Array.isArray(p)) {
      patchPluginNames(p);
    } else if (typeof p === 'object' && !p.name) {
      p.name = `uni-plugin-obj-${i}`;
    }
  }
  return plugins;
}

export default defineConfig(() => {
  const uniPlugins = (uni as any).default ? (uni as any).default() : uni();
  const plugins = patchPluginNames(Array.isArray(uniPlugins) ? uniPlugins : [uniPlugins]);

  return {
    plugins,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
