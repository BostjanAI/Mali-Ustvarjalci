import type { Config } from 'tailwindcss';
const config: Config = {
 content:{relative:true,files:['./src/pages/**/*.{js,ts,jsx,tsx,mdx}','./src/components/**/*.{js,ts,jsx,tsx,mdx}','./src/app/**/*.{js,ts,jsx,tsx,mdx}']},
 theme:{extend:{colors:{brand:{DEFAULT:'#284f43',50:'#f1f5ed',100:'#e3ecdd',200:'#cbdcc1',300:'#acc6a4',400:'#83a483',500:'#577d62',600:'#3c6350',700:'#284f43',800:'#213f36',900:'#19322b'}},fontFamily:{sans:['Arial','Helvetica','sans-serif']},keyframes:{'slide-in':{'0%':{transform:'translateX(100%)',opacity:'0'},'100%':{transform:'translateX(0)',opacity:'1'}}},animation:{'slide-in':'slide-in 0.3s ease-out'}}},plugins:[]
};export default config;
