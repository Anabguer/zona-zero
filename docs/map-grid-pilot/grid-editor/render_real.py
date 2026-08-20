import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

JSON_PATH  = Path(r"W:\juegos\zona-zero\docs\mapa-zona-zero (1).json")
BG_PATH    = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\approved-master\00-MAPA_MAESTRO_APROBADO.png")
SPR_DIR    = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\approved-master\buildings")
SHELTER    = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\building-pilots\lote-3\01-shelter-3x2.png")
OUT_PATH   = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\grid-editor\render-real.png")

SPRITE_FILE = {
    "house":"01-house-4x2.png","hq":"01-hq-5x4.png","shelter":None,
    "kitchen":"01-kitchen-4x2.png","infirmary":"01-infirmary-4x3.png",
    "medkit":"01-medkit-2x2.png","radio":"01-radio-3x2.png",
    "workshop":"01-workshop-5x2.png","sawmill":"01-sawmill-5x3.png",
    "scrapyard":"01-scrapyard-5x3.png","greenhouse":"01-greenhouse-4x3.png",
    "farm":"01-farm-3x2.png","storage":"01-storage-5x3.png",
    "cistern":"01-cistern-2x2.png","well":"01-well-2x1.png",
}
_CR = 100.0/80.0; _CG = 69.0/56.0

def chroma_magenta(img):
    img = img.convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    r,g,b,a = arr[...,0],arr[...,1],arr[...,2],arr[...,3]
    arr[...,3] = np.where((r>180)&(b>180)&(g<80), 0, a)
    return Image.fromarray(arr.astype(np.uint8),"RGBA")

def match_map(spr, map_patch=None):
    has_alpha = spr.mode=="RGBA"
    alpha = spr.split()[3] if has_alpha else None
    arr = np.array(spr.convert("RGB")).astype(np.float32)
    arr[...,0] = np.clip(arr[...,0]*_CR,0,255)
    arr[...,1] = np.clip(arr[...,1]*_CG,0,255)
    if map_patch is not None:
        h,w = arr.shape[:2]; bs = int(h*0.72)
        patch = map_patch.resize((w,h-bs),Image.Resampling.LANCZOS)
        pa = np.array(patch.convert("RGB")).astype(np.float32)
        mask = (np.array(alpha.resize((w,h),Image.Resampling.LANCZOS)).astype(np.float32)/255.0)[bs:]>0.5 if alpha else np.ones((h-bs,w),dtype=bool)
        for c in range(3):
            f=arr[bs:,:,c]; arr[bs:,:,c]=np.where(mask,f*0.72+pa[:,:,c]*0.28,f)
    out = Image.fromarray(np.clip(arr,0,255).astype(np.uint8),"RGB")
    if has_alpha: out.putalpha(alpha)
    out = out.filter(ImageFilter.GaussianBlur(radius=0.5))
    return ImageEnhance.Sharpness(out).enhance(0.85)

def scale_to_footprint(spr, fw, fh):
    sw,sh=spr.size; ratio=min(fw/sw,fh/sh)
    return spr.resize((max(1,int(sw*ratio)),max(1,int(sh*ratio))),Image.Resampling.LANCZOS)

data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
ED_COLS,ED_ROWS = data["cols"],data["rows"]
buildings = sorted(data["buildings"], key=lambda b: b["row"]+b["h"])
bg = Image.open(BG_PATH).convert("RGBA")
W,H = bg.size; bg_rgb = bg.convert("RGB")
cw,ch = W/ED_COLS, H/ED_ROWS
canvas = bg.copy()

for b in buildings:
    bid,col,row,bw,bh = b["bid"],b["col"],b["row"],b["w"],b["h"]
    spr_path = SHELTER if bid=="shelter" else SPR_DIR/SPRITE_FILE.get(bid,"")
    if not spr_path or not spr_path.exists(): print("skip",bid); continue
    spr = chroma_magenta(Image.open(spr_path).convert("RGBA"))
    spr = scale_to_footprint(spr, bw*cw*2.0, bh*ch*2.0)
    x0,y0,x1,y1 = col*cw,row*ch,(col+bw)*cw,(row+bh)*ch
    mp = bg_rgb.crop((int(x0),int(y0),min(int(x0)+spr.width,W),min(int(y0)+spr.height,H)))
    spr = match_map(spr, mp)
    shadow = Image.new("RGBA",(int(bw*cw*1.1),int(ch*0.25)),(0,0,0,0))
    ImageDraw.Draw(shadow).ellipse([0,0,shadow.width,shadow.height],fill=(0,0,0,60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=10))
    sx,sy = int(x0+(bw*cw-shadow.width)/2),int(y1-shadow.height*0.5)
    if sx>=0 and sy>=0: canvas.alpha_composite(shadow,(sx,sy))
    sw2,sh2=spr.size; px=int(x0+(bw*cw-sw2)/2); py=int(y1-sh2)
    if py<0: py=0
    canvas.paste(spr,(px,py),spr)

canvas.convert("RGB").save(OUT_PATH,"PNG",optimize=True)
print("OK",OUT_PATH)
