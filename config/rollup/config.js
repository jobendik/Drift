import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/main.ts',
	output: [
		{
			format: 'umd',
			name: 'DIVE',
			file: 'build/bundle.js'
		}
	],
	plugins: [
		resolve(),
		typescript({
			tsconfig: './tsconfig.json',
			sourceMap: false
		})
	]
};
