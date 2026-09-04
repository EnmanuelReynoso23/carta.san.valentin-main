"""Read original sprite sheets and emit crop/anchor metadata. Never edits images."""
from pathlib import Path
from PIL import Image
import numpy as np
import json
root=Path(__file__).resolve().parents[1]
out={}
for name,cols,rows in [('genesis',[100,350,630,900,1160],[0,335,643,933,1254]),('enmanuel',[90,340,630,910,1180],[0,328,644,947,1254])]:
    im=Image.open(root/'assets'/f'{name}.png').convert('RGBA')
    frames=[]
    for row in range(4):
        for col in range(4):
            x0,y0,x1,y1=cols[col],rows[row],cols[col+1],rows[row+1]
            crop=im.crop((x0,y0,x1,y1))
            a=np.array(crop)[:,:,3]>160
            yy,xx=np.where(a)
            left,top,right,bottom=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
            torso=a[top+int((bottom-top)*.45):top+int((bottom-top)*.70),:]
            _,tx=np.where(torso)
            pivot=float(np.median(tx)) if len(tx) else (left+right)/2
            frames.append({'x':x0+left,'y':y0+top,'w':right-left,'h':bottom-top,'pivotX':round(pivot-left,1),'pivotY':bottom-top})
    out[name]=frames
(root/'assets'/'characters.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('Catalogue ready: 32 source rectangles with explicit foot anchors.')
