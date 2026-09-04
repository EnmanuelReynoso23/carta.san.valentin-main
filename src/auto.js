import {gapAhead,readSeconds,PHYSICS} from './logic.js';

/**
 * El modo historia: alguien invisible juega por ti. No salta pasos ni acorta
 * nada, usa los mismos mandos que tú —camina, salta y pulsa— así que ve
 * exactamente la misma aventura, solo que sin tener que tocar nada.
 */
export class Director{
  constructor({pace=1.1}={}){this.pace=pace;this.jumpCool=0;this.stuck=0;this.lastX=0;}
  /** Cuánto se queda una frase antes de pasar sola a la siguiente. */
  hold(text){return readSeconds(text)*this.pace;}
  /** De camino se para a mirar lo que hay: la ventana, el buzón, el banco. */
  stop(game){
    const main=game.objective();
    if(!main)return null;
    const side=game.state.props.filter(p=>!p.used&&!p.key&&p.x<=main.x+8)
      .sort((a,b)=>Math.abs(a.x-game.state.player.x)-Math.abs(b.x-game.state.player.x))[0];
    return side?{x:side.x,y:main.y,action:true,reach:18}:null;
  }
  intent(game,dt){
    const move={left:false,right:false,jump:false,action:false};
    const s=game.state;
    this.jumpCool=Math.max(0,this.jumpCool-dt);
    if(s.mode!=='play')return move;
    if(game.dialogue.active){
      const line=game.dialogue.line;
      if(game.dialogue.done&&game.dialogue.held>=this.hold(line.text))move.action=true;
      return move;
    }
    const target=this.stop(game)||game.objective();
    if(!target)return move;
    const player=s.player,dx=target.x-player.x,dir=Math.sign(dx)||1;
    const reach=target.reach??14;
    if(Math.abs(dx)<=reach){
      if(target.action)move.action=true;
      return move;
    }
    move[dx>0?'right':'left']=true;
    if(player.onGround&&this.jumpCool<=0){
      // Salta por dos motivos: el suelo se acaba, o la luz está en el aire.
      const overGap=gapAhead(game.solids,player.x,dir,player.y,26);
      const overhead=target.pickup&&target.y<player.y-40&&Math.abs(dx)>26&&Math.abs(dx)<58;
      const blocked=this.stuck>1.1;
      if(overGap||overhead||blocked){move.jump=true;this.jumpCool=.4;this.stuck=0;}
    }
    // Si lleva un rato sin avanzar, prueba un salto: nunca se queda encallada.
    this.stuck=Math.abs(player.x-this.lastX)<.4*PHYSICS.speed*dt?this.stuck+dt:0;
    this.lastX=player.x;
    return move;
  }
}
