import {GROUND} from './logic.js';
// El guion y el mapa de los cinco actos. Cada acto es un lugar por el que se
// camina de verdad: tiene suelo, huecos, cosas que mirar y una salida.
const L=(who,text)=>({who,text});

export const LIGHTS=[
  {name:'tus noches sin dormir',color:'#ffc37a'},
  {name:'lo mucho que te esfuerzas',color:'#ffd9a0'},
  {name:'tu manera de cuidar',color:'#9fe3c8'},
  {name:'la valentía de seguir',color:'#ffb0c1'},
  {name:'las ganas que aún tienes',color:'#bcc4ff'},
];

export const ACTS=[
  {id:'room',kind:'room',act:'I · La espera',name:'La habitación de las promesas',
   width:620,spawn:196,ghost:false,goal:'Sopla la vela del pastel',
   platforms:[{x:36,y:182,w:120,kind:'cama'}],
   triggers:[
     {id:'intro',x:168,talk:[
       L('Narración','Habías imaginado esta noche de otra manera.')]},
     {id:'sillas',x:372,talk:[
       L('Narración','Pusiste sillas de más. Por si llegaban.'),
       L('Génesis','Ya se hizo tarde…'),
       L('Narración','Nadie vino. Lo que dolía era haberlos imaginado aquí.')]}],
   props:[
     {id:'ventana',x:234,prompt:'Mirar por la ventana',talk:[
       L('Génesis','La ciudad sigue encendida. Alguien más está despierto.')]},
     {id:'regalo',x:434,prompt:'Mirar el regalo',talk:[
       L('Narración','El papel lo elegiste tú. También el lazo. También el día.')]},
     {id:'pastel',x:470,prompt:'Pedir un deseo',key:true,talk:[
       L('Narración','El pastel llevaba horas esperando, con su vela encendida.'),
       L('Narración','Pide el deseo igual. Este también cuenta.'),
       L('Narración','Soplaste. Y la llama no se apagó: se soltó.'),
       L('Luz','Ven. Yo te acompaño.')]},
     {id:'foto',x:504,prompt:'Mirar la foto',talk:[
       L('Génesis','Aquí salíamos todos. Yo también sonreía.')]}],
   exit:{x:600,needs:'pastel',locked:'La puerta espera. Antes, pide tu deseo.',goal:'Sal a la calle'}},

  {id:'street',kind:'street',act:'II · La chispa',name:'La calle que seguía despierta',
   width:1180,spawn:58,ghost:true,goal:'Sigue a la lucecita',
   platforms:[{x:428,y:190,w:46,kind:'caja'},{x:492,y:164,w:42,kind:'caja'},{x:868,y:186,w:54,kind:'caja'}],
   triggers:[
     {id:'salida',x:104,talk:[
       L('Narración','La lucecita cruzó la puerta y esperó afuera.')]},
     {id:'quien',x:300,talk:[
       L('Génesis','¿Y tú de dónde saliste?'),
       L('Luz','De la parte de ti que todavía desea cosas bonitas.')]},
     {id:'delante',x:700,talk:[
       L('Narración','Delante, muy lejos, iba alguien que no llegabas a ver.'),
       L('Narración','No se dejaba alcanzar. Solo dejaba el camino encendido.')]},
     {id:'reloj',x:1040,talk:[
       L('Génesis','Hace mucho que no caminaba sin mirar el reloj.')]}],
   props:[
     {id:'buzon',x:340,prompt:'Abrir el buzón',talk:[
       L('Narración','Una carta sin sello. Alguien la escribió y no se atrevió.')]},
     {id:'banco',x:620,prompt:'Sentarte un momento',talk:[
       L('Génesis','Un momento nada más. Hoy nadie me está apurando.')]}],
   exit:{x:1148,goal:'Cruza hacia el camino'}},

  {id:'garden',kind:'garden',act:'III · La travesía',name:'El camino de las luces',
   width:1520,spawn:58,ghost:true,goal:'Recoge las cinco luces',
   gaps:[[640,684],[1148,1196]],
   platforms:[
     {x:650,y:206,w:20,kind:'piedra'},
     {x:496,y:178,w:54,kind:'roca'},{x:986,y:192,w:44,kind:'roca'},{x:1034,y:162,w:56,kind:'tabla'},
     {x:1152,y:204,w:24,kind:'piedra'},{x:1180,y:192,w:24,kind:'piedra'}],
   lights:[{x:250,y:190},{x:522,y:150},{x:790,y:188},{x:1060,y:140},{x:1300,y:190}],
   triggers:[
     {id:'nombre',x:104,talk:[
       L('Narración','Cada luz de esta noche llevaba tu nombre.')]},
     {id:'mias',lights:3,talk:[
       L('Génesis','¿Todas eran mías?'),
       L('Luz','Todas. Solo estaban esperando que las miraras.')]},
     {id:'pesan',lights:5,talk:[
       L('Narración','Las llevabas contigo y pesaban menos que la espera.')]}],
   exit:{x:1482,needs:'lights',locked:'Aún queda luz tuya en el camino.',goal:'Ve hacia la plaza'}},

  {id:'plaza',kind:'plaza',act:'IV · Los otros',name:'La plaza de los otros',
   width:1420,spawn:58,ghost:true,goal:'Reparte tu luz',
   platforms:[{x:628,y:206,w:32,kind:'escalon'},{x:664,y:184,w:112,kind:'tarima'}],
   triggers:[
     {id:'oscuras',x:104,talk:[
       L('Narración','No eras la única a oscuras esta noche.')]},
     {id:'dieron',given:4,talk:[
       L('Narración','Diste luz. Y esta vez también te dieron.')]}],
   people:[
     {id:'simon',name:'Simón',x:300,sprite:'sec04',prompt:'Dar una luz',talk:[
       L('Simón','Nadie me había mirado hoy. Gracias.')]},
     {id:'nora',name:'Nora',x:600,sprite:'sec00',prompt:'Dar una luz',talk:[
       L('Nora','Se me había olvidado cómo era. Toma, esta flor es para ti.')]},
     {id:'lia',name:'Lía',x:900,sprite:'sec08',prompt:'Dar una luz',talk:[
       L('Lía','Yo también estaba esperando a alguien. Quédate un rato.')]},
     {id:'guardian',name:'El guardián',x:1180,sprite:'sec05',prompt:'Dar una luz',talk:[
       L('El guardián','Guárdate un poco para mañana, ¿me lo prometes?'),
       L('Génesis','Lo prometo.')]}],
   exit:{x:1382,needs:'people',locked:'Todavía hay alguien a oscuras.',goal:'Camina hacia el amanecer'}},

  {id:'dawn',kind:'dawn',act:'V · El amanecer',name:'Un amanecer para Génesis',
   width:900,spawn:58,ghost:false,goal:'Alcánzalo, ya no se aleja',
   triggers:[
     {id:'cielo',x:104,talk:[
       L('Narración','El cielo empezó a cambiar de color.')]},
     {id:'verlo',x:340,talk:[
       L('Narración','El que iba delante se detuvo. Y por fin lo viste.')]}],
   props:[
     {id:'enmanuel',x:585,kind:'enmanuel',prompt:'Hablar con él',key:true,talk:[
       L('Enmanuel','Te estaba esperando aquí.'),
       L('Enmanuel','No traigo una caja. Traigo el mismo camino que hiciste.'),
       L('Génesis','No fue la noche que esperaba.'),
       L('Enmanuel','Lo sé. Lo que te dolió también cuenta.'),
       L('Enmanuel','Hay una carta para ti. Léela a tu ritmo.')]}],
   exit:null},
];

export const LETTER=[
  'Merecías que cumplieran lo que te prometieron: que se acordaran, que llegaran, que estuvieran. Si eso dolió, no tienes que hacer como si nada.',
  'Por eso quise darte una noche entera: un rato de calma, una ciudad encendida y alguien caminando cerca.',
  'El regalo nunca fue una caja. Era todo lo que llevas dentro para dar, y que hoy también vuelve hacia ti.',
  'No tienes que estar siempre bien, ni ser siempre fuerte, ni cuidar a todos para merecer que te cuiden.',
  'Feliz cumpleaños, Génesis. Que nunca te falte un cielo donde puedas ser tú.',
];

/** Alturas de referencia para colocar cosas sobre el suelo del escenario. */
export const FLOOR=GROUND;
export const ACT_IDS=ACTS.map(act=>act.id);
