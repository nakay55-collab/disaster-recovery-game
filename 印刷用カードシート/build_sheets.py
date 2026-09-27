"""
既存のカードイラスト（8種）を、A-one「マルチカード 51275」（F10A4-1）シートに
必要枚数ぶん複製して並べる印刷用A4シートを作成します。

- シート実寸: A4 (210mm x 297mm)
- カードセル: 91mm(横) x 55mm(縦) を 2列 x 5行 = 10面
- 余白: 左右14mm / 上下11mm、セル間の隙間なし（ミシン目製品のため）
- 出力解像度: 300dpi

カード自体の絵柄は一切加工しません（色調補正・トリミングなし）。
画像の縦横比が91x55の枠と完全には一致しないため、
「全体を縮小して枠の中央に配置し、余った部分は白で埋める」方式（レターボックス）にしています。
"""
import math
import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, "originals")
OUT_DIR = os.path.join(BASE_DIR, "print-sheets")
os.makedirs(OUT_DIR, exist_ok=True)

DPI = 300
MM_PER_INCH = 25.4
PX_PER_MM = DPI / MM_PER_INCH

A4_W_MM, A4_H_MM = 210.0, 297.0
CELL_W_MM, CELL_H_MM = 91.0, 55.0  # シート上でのセルの向き（横長）
COLS, ROWS = 2, 5
MARGIN_L_MM, MARGIN_T_MM = 14.0, 11.0

def mm2px(mm):
    return round(mm * PX_PER_MM)

A4_W_PX, A4_H_PX = mm2px(A4_W_MM), mm2px(A4_H_MM)
CELL_W_PX, CELL_H_PX = mm2px(CELL_W_MM), mm2px(CELL_H_MM)
MARGIN_L_PX, MARGIN_T_PX = mm2px(MARGIN_L_MM), mm2px(MARGIN_T_MM)

WHITE = (255, 255, 255)

# 出力する順に: (フォルダ名, 表示名, ファイル名, 必要枚数)
CARDS = [
    ("job", "重機オペレーター", "06_重機オペレーター.png", 60),
    ("job", "現場リーダー", "07_現場リーダー.png", 20),
    ("job", "地域サポート", "08_地域サポート.png", 60),
    ("machine", "バックホウ", "01_バックホウ.png", 10),
    ("machine", "ミニショベル", "02_ミニショベル.png", 10),
    ("machine", "ダンプトラック", "03_ダンプトラック.png", 10),
    ("machine", "ロードローラー", "04_ロードローラー.png", 10),
    ("machine", "クレーン", "05_クレーン.png", 10),
]


def make_cell_image(src_img, h_align="center"):
    """縦長のカード画像を90度回転して横長セルに収め、余った部分は白で埋める。
    h_align: 左右に余白ができる絵柄のとき、余白をどちら側に寄せるか。
             "center"=中央（既定）/ "left"=右に寄せて左に余白 / "right"=左に寄せて右に余白
    """
    rotated = src_img.convert("RGB").rotate(-90, expand=True)  # 時計回りに90度
    rw, rh = rotated.size
    scale = min(CELL_W_PX / rw, CELL_H_PX / rh)
    new_w, new_h = max(1, round(rw * scale)), max(1, round(rh * scale))
    resized = rotated.resize((new_w, new_h), Image.LANCZOS)
    cell = Image.new("RGB", (CELL_W_PX, CELL_H_PX), WHITE)
    if h_align == "left":
        x = CELL_W_PX - new_w
    elif h_align == "right":
        x = 0
    else:
        x = (CELL_W_PX - new_w) // 2
    y = (CELL_H_PX - new_h) // 2
    cell.paste(resized, (x, y))
    return cell


def build_sheets_for(name, filename, qty):
    src_path = os.path.join(SRC_DIR, filename)
    src_img = Image.open(src_path)
    # 列と列の継ぎ目をくっつけるため、左右に余白が出る絵柄は外側（1列目は右寄せ＝左に余白、
    # 2列目は左寄せ＝右に余白）へ逃がし、内側（列と列の間）の余白をなくします。
    cell_by_col = [make_cell_image(src_img, h_align="left" if c == 0 else "right") for c in range(COLS)]

    sheets = math.ceil(qty / (COLS * ROWS))
    made = 0
    out_paths = []
    for sheet_index in range(sheets):
        sheet = Image.new("RGB", (A4_W_PX, A4_H_PX), WHITE)
        for r in range(ROWS):
            for c in range(COLS):
                if made >= qty:
                    break
                x = MARGIN_L_PX + c * CELL_W_PX
                y = MARGIN_T_PX + r * CELL_H_PX
                sheet.paste(cell_by_col[c], (x, y))
                made += 1
        out_path = os.path.join(OUT_DIR, f"{name}_{sheet_index + 1:02d}.png")
        sheet.save(out_path, dpi=(DPI, DPI))
        out_paths.append(out_path)
    return out_paths, made


def main():
    print(f"A4: {A4_W_PX}x{A4_H_PX}px / セル: {CELL_W_PX}x{CELL_H_PX}px / 余白(左,上): {MARGIN_L_PX},{MARGIN_T_PX}px @ {DPI}dpi")
    total_sheets = 0
    total_cards = 0
    for _, name, filename, qty in CARDS:
        paths, made = build_sheets_for(name, filename, qty)
        total_sheets += len(paths)
        total_cards += made
        print(f"{name}: {made}枚 -> {len(paths)}シート ({', '.join(os.path.basename(p) for p in paths)})")
    print(f"\n合計: {total_cards}枚 / {total_sheets}シート")


if __name__ == "__main__":
    main()
