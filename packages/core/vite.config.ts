import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'DeadClickRadar',
            fileName: (format) => `index.${format === 'es' ? 'js' : 'umd.cjs'}`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            external: [],
            output: {
                globals: {}
            }
        },
        target: 'es2020',
        sourcemap: true
    },
    plugins: [
        dts({
            include: ['src'],
            exclude: ['src/**/*.test.ts']
        })
    ]
});