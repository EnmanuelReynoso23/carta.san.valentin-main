import {GROUND} from './logic.js';
// El guion y el mapa de los cinco actos. Cada acto es un lugar por el que se
// camina de verdad: tiene suelo, huecos, cosas que mirar y una salida.
const L=(who,text)=>({who,text});

export const LIGHTS=[
  {name:'las noches que no duermes',color:'#ffc37a'},
  {name:'el esfuerzo que nadie te ve hacer',color:'#ffd9a0'},
  {name:'la fuerza que te fuiste haciendo',color:'#f6b98c'},
  {name:'tu manera de cuidar a los demás',color:'#9fe3c8'},
  {name:'la valentía de seguir batallando',color:'#ffb0c1'},
  {name:'ser ejemplo sin proponértelo',color:'#bcc4ff'},
  {name:'las ganas que todavía te quedan',color:'#b8e8f0'},
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
   width:1180,spawn:58,ghost:false,goal:'Sigue a la lucecita',
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
   width:1520,spawn:58,ghost:false,goal:'Recoge las siete luces',
   gaps:[[640,684],[1148,1196]],
   platforms:[
     {x:650,y:206,w:20,kind:'piedra'},
     {x:496,y:178,w:54,kind:'roca'},{x:986,y:192,w:44,kind:'roca'},{x:1034,y:162,w:56,kind:'tabla'},
     {x:1152,y:204,w:24,kind:'piedra'},{x:1180,y:192,w:24,kind:'piedra'}],
   lights:[{x:150,y:188},{x:250,y:190},{x:522,y:150},{x:790,y:188},{x:900,y:186},{x:1060,y:140},{x:1300,y:190}],
   triggers:[
     {id:'nombre',x:104,talk:[
       L('Narración','Cada luz de esta noche llevaba tu nombre.')]},
     {id:'mias',lights:3,talk:[
       L('Génesis','¿Todas eran mías?'),
       L('Luz','Todas. Solo estaban esperando que las miraras.')]},
     {id:'pesan',lights:7,talk:[
       L('Narración','Las llevabas contigo y pesaban menos que la espera.')]}],
   exit:{x:1482,needs:'lights',locked:'Aún queda luz tuya en el camino.',goal:'Ve hacia la plaza'}},

  {id:'plaza',kind:'plaza',act:'IV · Los otros',name:'La plaza de los otros',
   width:1420,spawn:58,ghost:false,goal:'Reparte tu luz',
   platforms:[{x:628,y:206,w:32,kind:'escalon'},{x:664,y:184,w:112,kind:'tarima'}],
   triggers:[
     {id:'oscuras',x:104,talk:[
       L('Narración','No eras la única a oscuras esta noche.')]},
     {id:'dieron',given:4,talk:[
       L('Narración','Diste luz. Y esta vez también te dieron.')]}],
   people:[
     {id:'simon',name:'Simón',x:300,look:'simon',prompt:'Dar una luz',talk:[
       L('Simón','Nadie me había mirado hoy. Gracias.')]},
     {id:'nora',name:'Nora',x:600,look:'nora',prompt:'Dar una luz',talk:[
       L('Nora','Se me había olvidado cómo era. Toma, esta flor es para ti.')]},
     {id:'lia',name:'Lía',x:900,look:'lia',prompt:'Dar una luz',talk:[
       L('Lía','Yo también estaba esperando a alguien. Quédate un rato.')]},
     {id:'guardian',name:'El guardián',x:1180,look:'guardian',prompt:'Dar una luz',talk:[
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
       L('Enmanuel','Vine detrás de ti toda la noche, sin dejarme ver.'),
       L('Enmanuel','No traigo una caja. Traigo siete cosas tuyas, escritas.'),
       L('Génesis','No fue la noche que esperaba.'),
       L('Enmanuel','Lo sé. Lo que te dolió también cuenta.'),
       L('Enmanuel','Es una carta sobre quién eres. Léela a tu ritmo.')]}],
   exit:null},
];

export const LETTER=[
  'Querida Génesis: sé que hoy tampoco vas a dormir mucho. Esa es la primera cosa que admiro de ti, aunque no te lo diga nunca: te levantas igual al día siguiente.',
  'La segunda es tu esfuerzo. El que nadie ve, el que no sale en ninguna foto, el que haces cuando no hay nadie mirando ni nadie que te vaya a aplaudir por él.',
  'La tercera es en lo que te ha ido convirtiendo: cada vez más fuerte y más capaz. No naciste así ni te lo regaló nadie, te lo fuiste haciendo tú sola.',
  'La cuarta es tu manera de cuidar. Las personas fuertes se cuidan a sí mismas; las más fuertes cuidan además a los demás. Tú siempre has sido de las segundas.',
  'La quinta es tu valentía. Mujeres buenas hay muchas, pero una que sepa de verdad lo que es batallar para salir adelante no se encuentra todos los días.',
  'La sexta es que eres ejemplo sin siquiera proponértelo. Y no sólo mío: de tus hermanos y de tu familia. Donde quiera que yo esté, me voy a acordar de ti y de tu esfuerzo.',
  'Y la séptima son las ganas que todavía te quedan. Por eso quiero seguir leyendo tu historia, que es la más bonita que voy a leer en esta vida. Te quiero por lo que eres, Génesis.',
];

/** Alturas de referencia para colocar cosas sobre el suelo del escenario. */
export const FLOOR=GROUND;
export const ACT_IDS=ACTS.map(act=>act.id);
