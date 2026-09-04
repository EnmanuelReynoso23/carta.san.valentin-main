// El guion completo. Cada acto es una lista de pasos y cada paso pesa un poco
// del tiempo de la canción: por eso la historia siempre termina con la música.
const L=(who,text)=>({kind:'say',who,text});
const W=x=>({kind:'walk',to:x});
const P=hold=>({kind:'hold',hold});

export const LIGHTS=[
  {name:'tus noches sin dormir',color:'#ffc37a'},
  {name:'lo mucho que te esfuerzas',color:'#ffd9a0'},
  {name:'tu manera de cuidar',color:'#9fe3c8'},
  {name:'la valentía de seguir',color:'#ffb0c1'},
  {name:'las ganas que aún tienes',color:'#bcc4ff'},
];

export const ACTS=[
  {id:'room',kind:'room',name:'La habitación de las promesas',act:'I · La espera',
   width:620,spawn:130,ghost:false,
   script:[
     P(1.4),
     L('Narración','Habías imaginado esta noche de otra manera.'),
     W(250),
     L('Narración','Pusiste sillas de más. Por si llegaban.'),
     W(360),
     L('Génesis','Ya se hizo tarde…'),
     L('Narración','Nadie vino. Lo que dolía era haberlos imaginado aquí.'),
     W(478),
     L('Narración','El pastel llevaba horas esperando, con su vela encendida.'),
     L('Narración','Pide el deseo igual. Este también cuenta.'),
     P(1.2),
     L('Narración','Soplaste. Y la llama no se apagó: se soltó.'),
     P(1.6)]},

  {id:'street',kind:'street',name:'La calle que seguía despierta',act:'II · La chispa',
   width:1180,spawn:70,ghost:true,
   script:[
     L('Narración','La lucecita cruzó la puerta y esperó afuera.'),
     W(330),
     L('Génesis','¿Y tú de dónde saliste?'),
     L('Luz','De la parte de ti que todavía desea cosas bonitas.'),
     W(690),
     L('Narración','Delante, muy lejos, iba alguien que no llegabas a ver.'),
     L('Narración','No se dejaba alcanzar. Solo dejaba el camino encendido.'),
     W(1090),
     L('Génesis','Hace mucho que no caminaba sin mirar el reloj.')]},

  {id:'garden',kind:'garden',name:'El camino de las luces',act:'III · La travesía',
   width:1520,spawn:70,ghost:true,
   lights:[250,520,790,1060,1300],
   script:[
     L('Narración','Cada luz de esta noche llevaba tu nombre.'),
     W(250),W(520),W(790),
     L('Génesis','¿Todas eran mías?'),
     L('Luz','Todas. Solo estaban esperando que las miraras.'),
     W(1060),W(1300),
     L('Narración','Las llevabas contigo y pesaban menos que la espera.'),
     W(1440)]},

  {id:'plaza',kind:'plaza',name:'La plaza de los otros',act:'IV · Los otros',
   width:1420,spawn:70,ghost:true,
   people:[300,600,900,1180],
   script:[
     L('Narración','No eras la única a oscuras esta noche.'),
     W(300),
     L('Simón','Nadie me había mirado hoy. Gracias.'),
     W(600),
     L('Nora','Se me había olvidado cómo era. Toma, esta flor es para ti.'),
     W(900),
     L('Lía','Yo también estaba esperando a alguien. Quédate un rato.'),
     W(1180),
     L('El guardián','Guárdate un poco para mañana, ¿me lo prometes?'),
     L('Génesis','Lo prometo.'),
     L('Narración','Diste luz. Y esta vez también te dieron.'),
     W(1350)]},

  {id:'dawn',kind:'dawn',name:'Un amanecer para Génesis',act:'V · El amanecer',
   width:900,spawn:70,ghost:false,
   script:[
     L('Narración','El cielo empezó a cambiar de color.'),
     W(330),
     L('Narración','El que iba delante se detuvo. Y por fin lo viste.'),
     W(520),
     L('Enmanuel','Te estaba esperando aquí.'),
     L('Enmanuel','No traigo una caja. Traigo el mismo camino que hiciste.'),
     L('Génesis','No fue la noche que esperaba.'),
     L('Enmanuel','Lo sé. Lo que te dolió también cuenta.'),
     L('Enmanuel','Hay una carta para ti. Léela a tu ritmo.'),
     P(1.8)]},
];

export const LETTER=[
  'Merecías que cumplieran lo que te prometieron: que se acordaran, que llegaran, que estuvieran. Si eso dolió, no tienes que hacer como si nada.',
  'Por eso quise darte una noche entera: un rato de calma, una ciudad encendida y alguien caminando cerca.',
  'El regalo nunca fue una caja. Era todo lo que llevas dentro para dar, y que hoy también vuelve hacia ti.',
  'No tienes que estar siempre bien, ni ser siempre fuerte, ni cuidar a todos para merecer que te cuiden.',
  'Feliz cumpleaños, Génesis. Que nunca te falte un cielo donde puedas ser tú.',
];
