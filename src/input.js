/**
 * Un solo gesto para tres maneras de jugar: teclado, pantalla táctil y mando.
 * Cada fotograma devuelve lo que se está pulsando; `jump` y `action` sólo van en
 * true el instante en que se aprietan, que es lo que espera el juego.
 */
const KEYS={
  ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',
  ArrowUp:'jump',w:'jump',W:'jump',' ':'jump',
  e:'action',E:'action',Enter:'action',ArrowDown:'action',s:'action',S:'action',
};
export class Input{
  constructor(){
    this.keys={};this.touch={};this.pad={};this.pending={};
    this.previous={jump:false,action:false};
    this.kind='teclado';this.onAny=()=>{};
    this.enabled=true;
  }
  /** Engancha teclado y botones de pantalla. Los botones llevan data-hold. */
  bind({buttons=[],onAny=()=>{}}={}){
    this.onAny=onAny;
    addEventListener('keydown',event=>{
      const name=KEYS[event.key];if(!name)return;
      if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
      if(event.key===' '||event.key.startsWith('Arrow'))event.preventDefault();
      if(event.repeat)return;
      this.keys[name]=true;this.pending[name]=true;this.kind='teclado';this.onAny(name);
    });
    addEventListener('keyup',event=>{const name=KEYS[event.key];if(name)this.keys[name]=false;});
    addEventListener('blur',()=>{this.keys={};this.touch={};this.pending={};});
    for(const button of buttons){
      const name=button.dataset.hold;
      const press=event=>{event.preventDefault();this.touch[name]=true;this.pending[name]=true;this.kind='táctil';button.classList.add('pressed');this.onAny(name);};
      const release=event=>{event.preventDefault();this.touch[name]=false;button.classList.remove('pressed');};
      button.addEventListener('pointerdown',press);
      for(const type of ['pointerup','pointercancel','pointerleave'])button.addEventListener(type,release);
      button.addEventListener('contextmenu',event=>event.preventDefault());
    }
    return this;
  }
  /** Mandos: cruceta o palanca izquierda, A para saltar, B/X para hablar. */
  pollPad(){
    const pads=navigator.getGamepads?.()||[];
    const next={};
    for(const pad of pads){
      if(!pad)continue;
      const axis=pad.axes?.[0]||0;
      if(pad.buttons[14]?.pressed||axis<-.35)next.left=true;
      if(pad.buttons[15]?.pressed||axis>.35)next.right=true;
      if(pad.buttons[0]?.pressed||pad.buttons[12]?.pressed)next.jump=true;
      if(pad.buttons[1]?.pressed||pad.buttons[2]?.pressed||pad.buttons[3]?.pressed)next.action=true;
    }
    for(const name of ['left','right','jump','action'])if(next[name]&&!this.pad[name]){this.kind='mando';this.onAny(name);}
    this.pad=next;
  }
  read(){
    this.pollPad();
    const held=name=>!!(this.keys[name]||this.touch[name]||this.pad[name]);
    const now={left:held('left'),right:held('right'),jump:held('jump'),action:held('action')};
    // Un toque muy corto no se pierde aunque caiga entre dos fotogramas.
    const out={left:now.left,right:now.right,
      jump:!!this.pending.jump||(now.jump&&!this.previous.jump),
      action:!!this.pending.action||(now.action&&!this.previous.action),held:now};
    this.pending={};this.previous={jump:now.jump,action:now.action};
    return this.enabled?out:{left:false,right:false,jump:false,action:false,held:now};
  }
  clear(){this.keys={};this.touch={};this.pad={};this.pending={};this.previous={jump:false,action:false};}
}
