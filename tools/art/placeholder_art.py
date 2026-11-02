#!/usr/bin/env python3
"""Draws the placeholder art for watching a job (step 3).

The finished art comes in step 6. Until then this script draws, at native pixel size:

  - block-<business id>.png: the beach strip block at night with no cars or people,
    one for each business, with that business's building in the middle of the block
  - sprites.png and sprites.json: the cars, people and lights that move about on top

Needs Python 3 with numpy and Pillow:

    python3 -m pip install numpy pillow
    python3 tools/art/placeholder_art.py

It writes into src/city/art, and draws the same pixels every time it runs.
"""
import argparse
import json
import math
import os
import random

import numpy as np
from PIL import Image

W, H = 240, 168


def C(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255.0


P = {
    'asphalt': C('4b4956'), 'asphalt2': C('403e4a'), 'yellow': C('e0bf4f'), 'white': C('e9e6de'),
    'walk': C('bdb3aa'), 'walk2': C('b0a69d'), 'curb': C('8c837c'), 'apron': C('a5a09a'),
    'sand': C('ead5a6'), 'sand2': C('dcc392'), 'sand3': C('f4e3bd'), 'wet': C('c9b07f'),
    'water': C('38abbc'), 'water_mid': C('2b94ae'), 'water_deep': C('1f7a99'), 'water_hi': C('a3e4e2'),
    'foam': C('f4f7f2'),
    'palm': C('2f7b4a'), 'palm_hi': C('58a85d'), 'palm_dark': C('215b3a'), 'trunk': C('7d5c3b'),
    'tar': C('5d5961'), 'tar2': C('6c6771'), 'gravel': C('78737b'),
    'pink': C('f3b3c6'), 'mint': C('aee4cf'), 'lav': C('c8b9eb'), 'peach': C('f6c39f'), 'lemon': C('f2de97'),
    'bone': C('e8e3d6'), 'stone': C('bab5b0'), 'plum': C('8e7d96'), 'deck': C('ddd5c6'),
    'ac': C('cfcfd2'), 'ac_dark': C('7f7f88'), 'tank': C('aba69e'), 'tank_lt': C('cbc6bd'), 'tank_dk': C('807a71'),
    'pool': C('5ed4e5'), 'pool_hi': C('b0f2f4'), 'rim': C('eeede7'),
    'dumpster': C('3f6c4b'), 'dumpster_dk': C('2c4f36'), 'wood': C('9c7650'),
    'teal_paint': C('2fb3a6'), 'orange_paint': C('f08a4b'),
    'coral': C('f4a48c'), 'sky': C('a9c9ec'), 'flamingo': C('f7b0cf'),
}
NEON = {
    'pink': C('ff4fae'), 'cyan': C('4ff0ff'), 'amber': C('ffb54a'), 'red': C('ff3048'), 'blue': C('3d6dff'),
    'warm': C('ffd890'), 'head': C('fff3cf'), 'pool': C('3cc9e6'), 'moon': C('c4dcf4'), 'green': C('3dff8a'),
    'teal': C('3fe6cc'), 'orange': C('ff8a3d'), 'door': C('ffcf80'),
}

# Each business gets the building in the middle of the block, in its own colours.
BUSINESS_ART = {
    'starlight': {'word': 'STARLIGHT', 'wall': P['lav'], 'neon': 'pink', 'roof': 'pool'},
    'coral-wash': {'word': 'LAUNDRY', 'wall': P['coral'], 'neon': 'cyan', 'roof': 'flat'},
    'neptune': {'word': 'NEPTUNE', 'wall': P['sky'], 'neon': 'amber', 'roof': 'flat'},
    'sunny-side': {'word': 'DINER', 'wall': P['lemon'], 'neon': 'red', 'roof': 'flat'},
    'palm-court': {'word': 'MOTEL', 'wall': P['peach'], 'neon': 'pink', 'roof': 'pool'},
    'lucky-seven': {'word': 'ARCADE', 'wall': P['plum'], 'neon': 'green', 'roof': 'flat'},
    'flamingo': {'word': 'CAR WASH', 'wall': P['flamingo'], 'neon': 'cyan', 'roof': 'flat'},
}

FONT = {
    'A': ["010", "101", "111", "101", "101"],
    'B': ["110", "101", "110", "101", "110"],
    'C': ["011", "100", "100", "100", "011"],
    'D': ["110", "101", "101", "101", "110"],
    'E': ["111", "100", "110", "100", "111"],
    'F': ["111", "100", "110", "100", "100"],
    'G': ["011", "100", "101", "101", "011"],
    'H': ["101", "101", "111", "101", "101"],
    'I': ["111", "010", "010", "010", "111"],
    'J': ["001", "001", "001", "101", "010"],
    'K': ["101", "101", "110", "101", "101"],
    'L': ["100", "100", "100", "100", "111"],
    'M': ["10001", "11011", "10101", "10001", "10001"],
    'N': ["1001", "1101", "1011", "1001", "1001"],
    'O': ["111", "101", "101", "101", "111"],
    'P': ["110", "101", "110", "100", "100"],
    'Q': ["010", "101", "101", "110", "011"],
    'R': ["110", "101", "110", "101", "101"],
    'S': ["011", "100", "010", "001", "110"],
    'T': ["111", "010", "010", "010", "010"],
    'U': ["101", "101", "101", "101", "111"],
    'V': ["101", "101", "101", "101", "010"],
    'W': ["10001", "10001", "10101", "11011", "10001"],
    'X': ["101", "101", "010", "101", "101"],
    'Y': ["101", "101", "010", "010", "010"],
    'Z': ["111", "001", "010", "100", "111"],
    ' ': ["0", "0", "0", "0", "0"],
}


def text_width(s):
    return sum(len(FONT[ch][0]) for ch in s) + len(s) - 1


# ---------------------------------------------------------------- sprite shapes (facing north)
CAR = [
    ".LbbbL.",
    "BbbbbbB",
    "BbbbbbB",
    "BgWgggB",
    "BgggggB",
    "BrrrrrB",
    "BrrrrrB",
    "BrrrrrB",
    "BgggggB",
    "BbbbbbB",
    "BbbbbbB",
    "BbbbbbB",
    ".TBbBT.",
]
SPORTS = [
    ".LbbbL.",
    "BbbbbbB",
    "BbbbbbB",
    "BbbbbbB",
    "BbBbBbB",
    "BgWgggB",
    "BgggggB",
    "BrrrrrB",
    "BgggggB",
    "BbbbbbB",
    "BbbbbbB",
    ".TBBBT.",
]
POLICE = [
    ".LbbbL.",
    "DbbbbbD",
    "DbbbbbD",
    "DgWgggD",
    "DgggggD",
    "DbbbbbD",
    "DRRkUUD",
    "DbbbbbD",
    "DgggggD",
    "DbbbbbD",
    "DbbbbbD",
    "DbbbbbD",
    ".TDbDT.",
]
TAXI = [
    ".LbbbL.",
    "BbbbbbB",
    "BbbbbbB",
    "BgWgggB",
    "BgggggB",
    "BbbbbbB",
    "BbYYYbB",
    "BbbbbbB",
    "BgggggB",
    "BbbbbbB",
    "BbbbbbB",
    "BbbbbbB",
    ".TBbBT.",
]
CONVERTIBLE = [
    ".LbbbL.",
    "BbbbbbB",
    "BbbbbbB",
    "BbbbbbB",
    "BgggggB",
    "BiIbIiB",
    "BiIbIiB",
    "BbbbbbB",
    "BiiiiiB",
    "BIIIIIB",
    "BbbbbbB",
    "BbbbbbB",
    ".TBbBT.",
]
PERSON = [
    ".hh.",
    "chhC",
    "cccC",
]
CHEVRON = [
    "###",
    ".#.",
]
ALERT = [
    "#",
    "#",
    "#",
    ".",
    "#",
]
UMBRELLA = [
    ".bab.",
    "baaab",
    "aacaa",
    "baaab",
    ".bab.",
]
HUT = [
    "ooooooo",
    "oppppPo",
    "owwwwWo",
    "ottttTo",
    "owwwwWo",
    "oyyyyYo",
    "ooooooo",
]
BOAT = [
    "..w..",
    ".www.",
    ".www.",
    "NwwwS",
    "wwwww",
    "wwwww",
    "wgWgw",
    "wdddw",
    "wdddw",
    "wwwww",
    "wpwww",
    "wwpww",
    "wwwpw",
    "wwwww",
    "wwwww",
    "wwwww",
    ".mXm.",
]


def car_legend(body, lights=True, bar=None):
    """Colours for a car. Each entry is (paint, glow): glow is set for parts that light up.
    `bar` lights the police car's red or blue lamps."""
    b = np.array(body)
    return {
        'b': (b, None), 'B': (b * 0.72, None), 'r': (np.minimum(1, b * 1.1 + 0.06), None),
        'g': (C('263347'), None), 'W': (C('8ea5c0'), None),
        'L': (C('f2efd6') if lights else C('8f8b7c'), NEON['head'] if lights else None),
        'T': (C('b5333b'), NEON['red'] if lights else None),
        'i': (C('c9a77a'), None), 'I': (C('9c7d58'), None),
        'D': (C('243a6b'), None), 'k': (C('2a2a33'), None),
        'R': (C('c0303c'), NEON['red'] if bar == 'red' else None),
        'U': (C('3050c0'), NEON['blue'] if bar == 'blue' else None),
        'Y': (C('f4f1e4'), C('fff1c2') if lights else None),
    }


def person_legend(hair, cloth):
    c = np.array(cloth)
    return {'h': (np.array(hair), None), 'c': (c, None), 'C': (c * 0.75, None)}


class Light:
    def __init__(self, x, y, r, col, i=1.0, p=1.3, direction=None, half=0.45, exclude=None, dither=0.55,
                 add=0.0):
        self.x, self.y, self.r, self.col, self.i, self.p = x, y, r, np.array(col), i, p
        self.direction, self.half, self.exclude, self.dither, self.add = direction, half, exclude, dither, add


class Scene:
    """A drawing at native size: paint colours, glowing parts, heights for shadows, and lights."""

    def __init__(self, w=W, h=H):
        self.w, self.h = w, h
        self.alb = np.zeros((h, w, 3))
        self.emi = np.zeros((h, w, 3))
        self.hgt = np.zeros((h, w))
        self.water = np.zeros((h, w), bool)
        self.bloom = np.zeros((h, w), bool)
        self.lights = []

    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def rect(self, x, y, w, h, col, height=None):
        x0, y0, x1, y1 = max(0, x), max(0, y), min(self.w, x + w), min(self.h, y + h)
        if x1 > x0 and y1 > y0:
            self.alb[y0:y1, x0:x1] = col
            if height is not None:
                self.hgt[y0:y1, x0:x1] = height

    def px(self, x, y, col, height=None):
        if self.inb(x, y):
            self.alb[y, x] = col
            if height is not None:
                self.hgt[y, x] = height

    def neon(self, x, y, ncol, dcol=None, height=None, bloom=True, i=1.0):
        """A lit tube or lamp that glows at night."""
        if not self.inb(x, y):
            return
        self.emi[y, x] = np.array(ncol) * i
        self.bloom[y, x] = bloom
        self.alb[y, x] = np.minimum(1, np.array(ncol) * 0.5 + 0.4)
        if height is not None:
            self.hgt[y, x] = height

    def light(self, *a, **k):
        self.lights.append(Light(*a, **k))


def put(sc, rows, x, y, legend, rot=0, height=2):
    arr = np.array([list(r) for r in rows])
    if rot:
        arr = np.rot90(arr, k=rot)
    for r in range(arr.shape[0]):
        for c in range(arr.shape[1]):
            ch = arr[r, c]
            if ch == '.':
                continue
            dcol, ecol = legend[ch]
            if ecol is not None:
                sc.neon(x + c, y + r, ecol, dcol=dcol, height=height)
            else:
                sc.px(x + c, y + r, dcol, height=height)
    return arr.shape[1], arr.shape[0]


def text(sc, s, x, y, ncol, dcol=None, height=None):
    cx = x
    for ch in s:
        g = FONT[ch]
        for r, row in enumerate(g):
            for c, v in enumerate(row):
                if v == '1':
                    sc.neon(cx + c, y + r, ncol, dcol=dcol, height=height)
        cx += len(g[0]) + 1


def building(sc, x, y, w, h, col, height):
    col = np.array(col)
    sc.rect(x, y, w, h, col, height)
    hi = np.minimum(1, col * 1.07 + 0.05)
    lo = col * 0.8
    for i in range(w):
        sc.px(x + i, y, hi)
        sc.px(x + i, y + h - 1, lo)
    for j in range(h):
        sc.px(x, y + j, hi)
        sc.px(x + w - 1, y + j, lo)


def speckle(sc, rnd, x, y, w, h, col, n):
    for _ in range(n):
        sc.px(x + rnd.randrange(w), y + rnd.randrange(h), col)


def ac_unit(sc, x, y, height):
    sc.rect(x, y, 3, 2, P['ac'], height)
    sc.px(x + 1, y + 1, P['ac_dark'])
    sc.px(x + 2, y + 1, P['ac'] * 0.85)


def tank(sc, cx, cy, height, r=3.2):
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = math.hypot(dx, dy)
            if d <= r:
                col = P['tank_dk'] if d > r - 0.9 else (P['tank_lt'] if dx + dy < -1 else P['tank'])
                sc.px(cx + dx, cy + dy, col, height)


def palm_pixels(rnd, size=6):
    leaf, ray = [], []
    base = rnd.random() * math.tau
    n = 7
    for k in range(n):
        a = base + k * math.tau / n + rnd.uniform(-0.18, 0.18)
        length = size + rnd.choice([-1, 0, 0, 1])
        for t in range(1, length + 1):
            fx, fy = math.cos(a) * t, math.sin(a) * t
            col = 'palm_hi' if t <= 2 else ('palm' if t < length - 1 else 'palm_dark')
            ray.append((round(fx), round(fy), col))
            if 2 <= t <= length - 1:
                for s in (-1, 1):
                    lx = fx + math.cos(a + s * math.pi / 2) * 1.1 + math.cos(a) * 0.6
                    ly = fy + math.sin(a + s * math.pi / 2) * 1.1 + math.sin(a) * 0.6
                    leaf.append((round(lx), round(ly), 'palm_dark' if (t + s) % 2 else 'palm'))
    return leaf + ray + [(0, 0, 'trunk')]


def palm(sc, rnd, cx, cy, size=6, height=12):
    for dx, dy, col in palm_pixels(rnd, size):
        sc.px(cx + dx, cy + dy, P[col], height)


# ---------------------------------------------------------------- the block
ROAD_X = [(55, 71), (154, 174)]      # inner street, boulevard
ROAD_Y = [(43, 59), (115, 131)]      # cross streets
INTER_Y = [(40, 62), (112, 134)]     # cross-street rows incl. sidewalks


def ground(sc, rnd):
    sc.rect(0, 0, W, H, P['walk'])
    for y in range(H):
        for x in range(W):
            if (x % 6 == 0) or (y % 6 == 0):
                sc.alb[y, x] = P['walk2']
    road = np.zeros((H, W), bool)
    for x0, x1 in ROAD_X:
        road[:, x0:x1] = True
    for y0, y1 in ROAD_Y:
        road[y0:y1, 0:154] = True
    sc.alb[road] = P['asphalt']
    for _ in range(1400):
        x, y = rnd.randrange(W), rnd.randrange(H)
        if road[y, x]:
            sc.alb[y, x] = P['asphalt2'] if rnd.random() < 0.75 else P['asphalt'] * 1.07
    for y in range(H):
        for x in range(W):
            if road[y, x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and road[yy, xx]:
                    sc.alb[y, x] = P['curb']
                    break

    def in_inter(y):
        return any(a <= y < b for a, b in INTER_Y)

    for y in range(H):
        if not in_inter(y):
            sc.px(163, y, P['yellow'])
            sc.px(164, y, P['yellow'])
            if (y // 4) % 2 == 0:
                sc.px(62, y, P['yellow'])
                sc.px(63, y, P['yellow'])
    for x in range(0, 154):
        if not (52 <= x < 74 or x >= 145) and (x // 4) % 2 == 0:
            for yy in (50, 51, 122, 123):
                sc.px(x, yy, P['yellow'])
    for y0, y1 in ((40, 43), (59, 62), (112, 115), (131, 134)):
        for y in range(y0, y1):
            for x in list(range(55, 71)) + list(range(154, 174)):
                if x % 2 == 0:
                    sc.px(x, y, P['white'])
    for x0, x1 in ((52, 55), (71, 74), (147, 154)):
        for y0, y1 in ROAD_Y:
            for y in range(y0, y1):
                if y % 2 == 0:
                    for x in range(x0, x1):
                        sc.px(x, y, P['white'])


def west_block(sc, rnd):
    # a parking garage's top deck
    building(sc, -2, -8, 54, 48, P['stone'], 9)
    for sx in range(4, 45, 8):
        for yy in range(0, 13):
            sc.px(sx, yy, P['white'])
        for yy in range(25, 38):
            sc.px(sx, yy, P['white'])
    building(sc, 45, -4, 7, 15, P['tar2'], 12)
    for yy in range(25, 38):
        for xx in range(45, 51):
            if (xx + yy) % 4 == 0:
                sc.px(xx, yy, P['stone'] * 0.88)
    parked = [(5, 0, C('7d9bd1'), 2), (21, 0, C('8c2f3f'), 2), (29, 0, C('efece4'), 2),
              (13, 25, C('2b2b33'), 0), (37, 25, C('3aa39a'), 0)]
    for x, y, col, rot in parked:
        put(sc, CAR, x, y, car_legend(col, lights=False), rot=rot, height=11)
    sc.light(46, 13, 6, NEON['warm'], 0.6)
    sc.neon(46, 11, NEON['warm'], dcol=P['tar2'], height=12)

    # an inn round a pool
    sc.rect(0, 62, 52, 50, P['asphalt2'])
    for y in (74, 82, 90, 98, 106):
        for x in range(35, 52):
            sc.px(x, y, P['white'])
    put(sc, CAR, 38, 75, car_legend(C('d38a5f'), lights=False), rot=1, height=2)
    put(sc, CAR, 38, 99, car_legend(C('5c6a8f'), lights=False), rot=1, height=2)
    sc.rect(13, 73, 21, 38, P['deck'])
    building(sc, 1, 63, 50, 10, P['peach'], 7)
    building(sc, 1, 73, 12, 38, P['peach'], 7)
    for x in range(2, 50):
        sc.px(x, 72, P['bone'])
    for y in range(73, 110):
        sc.px(12, y, P['bone'])
    for x in range(4, 50, 5):
        sc.neon(x, 72, NEON['warm'], dcol=P['bone'], height=7)
    for y in range(76, 110, 5):
        sc.neon(12, y, NEON['warm'], dcol=P['bone'], height=7)
    pool = np.zeros((H, W), bool)
    for y in range(80, 106):
        for x in range(13, 34):
            e1 = ((x - 21) / 6.2) ** 2 + ((y - 96) / 5.2) ** 2 <= 1
            e2 = ((x - 27) / 4.4) ** 2 + ((y - 89) / 3.8) ** 2 <= 1
            if e1 or e2:
                pool[y, x] = True
    water_body(sc, pool)
    sc.light(23, 93, 10, NEON['pool'], 0.5)
    palm(sc, rnd, 30, 78, size=5)
    text(sc, 'INN', 1 + (50 - text_width('INN')) // 2, 65, NEON['pink'], dcol=C('d9577f'), height=8)

    # a gas station
    sc.rect(0, 134, 52, 34, P['apron'])
    for y in range(156, 166):
        for x in range(1, 6):
            sc.px(x, y, P['palm_dark'] * 0.9)
    building(sc, 6, 138, 30, 15, P['bone'], 6)
    for i in range(30):
        sc.neon(6 + i, 138, NEON['teal'], dcol=P['teal_paint'], height=6, i=0.7)
        sc.neon(6 + i, 152, NEON['teal'], dcol=P['teal_paint'], height=6, i=0.7)
        sc.neon(6 + i, 139, NEON['orange'], dcol=P['orange_paint'], height=6, i=0.7)
    for j in range(15):
        sc.neon(6, 138 + j, NEON['teal'], dcol=P['teal_paint'], height=6, i=0.7)
        sc.neon(35, 138 + j, NEON['teal'], dcol=P['teal_paint'], height=6, i=0.7)
    put(sc, CAR, 22, 158, car_legend(C('e3d6a8'), lights=False), rot=1, height=2)
    building(sc, 39, 150, 13, 16, P['tar2'], 5)
    text(sc, 'GAS', 40, 152, NEON['amber'], dcol=C('d18a2e'), height=6)
    sc.light(21, 145, 27, C('f6f1df'), 0.85, p=0.9, exclude=(6, 138, 36, 153))
    palm(sc, rnd, 3, 161, size=5)


def water_body(sc, mask):
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        sc.alb[y, x] = P['pool']
        sc.hgt[y, x] = 0
        sc.emi[y, x] = NEON['pool'] * 0.55
    for y, x in zip(ys, xs):
        if (y + int(round(math.sin(x * 0.75)))) % 4 == 0 and mask[y, min(x + 1, W - 1)]:
            sc.alb[y, x] = P['pool_hi']
            sc.emi[y, x] = NEON['pool'] * 0.85
    for y in range(H):
        for x in range(W):
            if mask[y, x]:
                continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and mask[y + dy, x + dx]
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                sc.alb[y, x] = P['rim']


def shops(sc, rnd):
    building(sc, 74, -6, 23, 46, P['tar'], 6)
    speckle(sc, rnd, 75, 0, 21, 38, P['gravel'], 60)
    ac_unit(sc, 78, 8, 7)
    ac_unit(sc, 87, 15, 7)
    text(sc, 'PAWN', 74 + (23 - text_width('PAWN')) // 2, 30, NEON['amber'], dcol=C('cf8a34'), height=7)

    building(sc, 74, 62, 23, 25, P['stone'], 6)
    for x in (79, 83, 87, 91):
        sc.px(x, 78, P['tar'] * 0.7, 7)
        sc.px(x, 79, P['tar'], 7)
    text(sc, 'DELI', 74 + (23 - text_width('DELI')) // 2, 66, NEON['cyan'], dcol=C('3aa7b8'), height=7)

    building(sc, 74, 87, 23, 25, P['plum'], 6)
    ac_unit(sc, 79, 91, 7)
    text(sc, 'SHOES', 74 + (23 - text_width('SHOES')) // 2, 100, NEON['pink'], dcol=C('d9577f'), height=7)

    building(sc, 74, 134, 23, 40, P['lemon'], 5)
    for x in (79, 80):
        for y in (142, 143):
            sc.px(x, y, P['ac_dark'], 6)
    ac_unit(sc, 86, 150, 6)

    # a payphone on the corner by the alley
    sc.rect(93, 112, 2, 2, P['stone'] * 0.7, 3)
    sc.neon(93, 112, NEON['blue'], height=3, i=0.7)


def alley(sc, rnd):
    for y0, y1 in ((0, 40), (62, 112), (134, 168)):
        sc.rect(97, y0, 7, y1 - y0, P['asphalt2'])
        for _ in range(16):
            sc.px(97 + rnd.randrange(7), y0 + rnd.randrange(y1 - y0), P['asphalt2'] * 0.85)
    for x, y in ((98, 20), (98, 63), (98, 140)):
        sc.rect(x, y, 3, 5, P['dumpster'], 3)
        sc.rect(x, y + 2, 3, 1, P['dumpster_dk'], 3)


def target_building(sc, rnd, art):
    """The business the crew is visiting, between the alley and the boulevard."""
    wall = np.array(art['wall'])
    neon = NEON[art['neon']]
    building(sc, 104, 62, 43, 50, wall, 18)
    word = art['word']
    text(sc, word, 104 + (43 - text_width(word)) // 2, 65, neon, height=19)
    if art['roof'] == 'pool':
        pool = np.zeros((H, W), bool)
        pool[76:88, 109:127] = True
        water_body(sc, pool)
        sc.light(118, 82, 12, NEON['pool'], 0.55)
        for i, x in enumerate((109, 112, 115, 118, 121, 124)):
            sc.rect(x, 91, 1, 3, P['bone'], 19)
            sc.px(x, 91, [C('f08a9c'), C('5ec2d6'), C('f2d06b')][i % 3], 19)
    else:
        speckle(sc, rnd, 106, 74, 24, 34, wall * 0.9, 90)
        for x, y in ((110, 78), (118, 78), (110, 92), (118, 92)):
            ac_unit(sc, x, y, 19)
        tank(sc, 116, 102, 21)
    building(sc, 108, 98, 6, 7, P['tar2'], 21)
    hi = np.minimum(1, wall * 1.08 + 0.06)
    building(sc, 132, 76, 14, 20, hi, 20)
    building(sc, 135, 79, 8, 14, np.minimum(1, hi * 1.06 + 0.04), 22)
    building(sc, 137, 82, 4, 8, P['bone'], 24)
    for x, y in ((138, 85), (139, 85), (138, 86), (139, 86)):
        sc.neon(x, y, neon, height=25)
    for y in range(62, 112):
        if not 91 <= y <= 94:
            sc.neon(146, y, neon, height=18, i=0.75)
    # the front door onto the boulevard
    for y in (92, 93):
        sc.neon(146, y, NEON['door'], dcol=C('6b4a3a'))
    sc.light(149, 93, 8, NEON['door'], 0.8, p=1.1)
    # the back door onto the alley
    for y in (77, 78, 79):
        sc.neon(103, y, NEON['door'], dcol=C('6b4a3a'))
    sc.light(100, 78, 9, NEON['door'], 0.95, p=1.1)


def hotels(sc, rnd, art):
    # the hotel to the north
    building(sc, 104, -10, 43, 50, P['bone'], 16)
    tank(sc, 112, 9, 20)
    building(sc, 127, 2, 7, 6, P['tar2'], 19)
    for x in (117, 121):
        ac_unit(sc, x, 19, 17)
    text(sc, 'OCEAN', 104 + (43 - text_width('OCEAN')) // 2, 30, NEON['cyan'], dcol=C('3aa7b8'), height=17)
    for y in range(0, 40):
        sc.neon(146, y, NEON['cyan'], dcol=C('7fd6dc'), height=16, i=0.75)
    for x in range(140, 147):
        sc.neon(x, 39, NEON['cyan'], dcol=C('7fd6dc'), height=16, i=0.75)

    target_building(sc, rnd, art)

    # the hotel to the south
    building(sc, 104, 134, 43, 44, P['mint'], 15)
    text(sc, 'BAYSIDE', 104 + (43 - text_width('BAYSIDE')) // 2, 138, NEON['amber'], dcol=C('cf8a34'),
         height=16)
    for x in (110, 116, 122, 128):
        ac_unit(sc, x, 152, 16)
    building(sc, 134, 150, 7, 6, P['tar2'], 18)
    for y in range(134, 168):
        sc.neon(146, y, NEON['cyan'], dcol=C('7fd6dc'), height=15, i=0.75)


def frontage(sc, rnd, art):
    signs = ((20, NEON['cyan'], C('3aa7b8')), (86, NEON[art['neon']], NEON[art['neon']] * 0.7),
             (151, NEON['cyan'], C('3aa7b8')))
    for ym, ncol, dcol in signs:
        sc.rect(147, ym - 3, 3, 7, dcol, 4)
        for y in range(ym - 3, ym + 4):
            sc.neon(149, y, ncol, dcol=dcol * 0.85, height=4)
        sc.light(151, ym, 12, NEON['warm'], 0.8)
    for y in (4, 30, 64, 100, 138, 160):
        for tx, ty in ((148, y), (151, y + 2)):
            sc.rect(tx, ty, 2, 2, P['bone'], 1)
            sc.neon(tx, ty, NEON['warm'], height=1, i=0.8)
        sc.light(150, y + 2, 6, NEON['warm'], 0.45)


def promenade_and_beach(sc, rnd):
    for y in range(H):
        if not (64 <= y <= 66 or 120 <= y <= 122):
            sc.px(182, y, P['stone'], 1)
    sc.rect(183, 0, W - 183, H, P['sand'])
    for _ in range(420):
        x, y = rnd.randrange(183, 214), rnd.randrange(H)
        sc.px(x, y, P['sand2'] if rnd.random() < 0.6 else P['sand3'])
    for y in (64, 65, 66, 120, 121, 122):
        for x in range(183, 190):
            sc.px(x, y, P['wood'] if y in (65, 121) else P['sand2'])
    for y in range(H):
        sx = 205 + int(round(2 * math.sin(y * 0.21) + 1.2 * math.sin(y * 0.53 + 1.3)))
        for x in range(sx, W):
            depth = x - sx
            sc.alb[y, x] = P['water'] if depth < 6 else (P['water_mid'] if depth < 15 else P['water_deep'])
            sc.water[y, x] = True
        sc.px(sx - 1, y, P['wet'])
        sc.px(sx - 2, y, P['wet'] if y % 3 else P['sand2'])
        sc.px(sx, y, P['foam'])
        if (y + int(3 * math.sin(y * 0.4))) % 6 in (0, 1, 2):
            sc.px(sx + 1, y, P['foam'])
        if (y % 9) in (0, 1):
            sc.px(sx + 2, y, P['water_hi'])
    for _ in range(150):
        x, y = rnd.randrange(209, W - 4), rnd.randrange(H)
        if sc.water[y, x]:
            ln = rnd.choice([2, 3, 3, 4])
            for k in range(ln):
                if x + k < W:
                    sc.px(x + k, y, P['water_hi'] if x < 222 else P['water_mid'] * 1.25)
    for _ in range(46):
        x, y = rnd.randrange(224, 236), rnd.randrange(H)
        if sc.water[y, x]:
            for k in range(rnd.choice([1, 2, 2, 3])):
                sc.neon(x + k, y, NEON['moon'] * rnd.uniform(0.55, 0.9), bloom=False)
    hut = {'o': (P['wood'] * 0.8, None), 'p': (C('f28aa8'), None), 'P': (C('d0708c'), None),
           'w': (P['bone'], None), 'W': (P['bone'] * 0.85, None), 't': (C('49c2c9'), None),
           'T': (C('379ba1'), None), 'y': (C('f2d26b'), None), 'Y': (C('cfb257'), None)}
    put(sc, HUT, 189, 82, hut, height=5)
    for y in range(89, 93):
        sc.px(192, y, P['wood'], 1)
    sc.rect(185, 96, 2, 4, P['bone'], 1)
    sc.rect(188, 96, 2, 4, P['bone'], 1)
    for i in range(14):
        sc.px(186 + i % 3 + (i // 5), 40 + i * 2, P['sand2'])
    boat = {'w': (C('f1f0ea'), None), 'g': (C('263347'), None), 'W': (C('8ea5c0'), None),
            'd': (C('c9a77a'), None), 'p': (C('ef5f9a'), None), 'm': (C('3a3a44'), None),
            'X': (C('3a3a44'), C('ffffff')), 'N': (C('f1f0ea'), NEON['red']),
            'S': (C('f1f0ea'), NEON['green'])}
    bx, by = 221, 22
    for t in range(1, 30):
        yy = by + 17 + t
        spread = 1.5 + t * 0.42
        for sgn in (-1, 1):
            xx = bx + 2 + int(round(sgn * spread))
            if rnd.random() < 0.85:
                sc.px(xx, yy, P['foam'] if t < 16 else P['water_hi'])
        if t < 10:
            sc.px(bx + 2, yy, P['foam'])
        if t < 5:
            sc.px(bx + 1, yy, P['foam'])
            sc.px(bx + 3, yy, P['foam'])
    put(sc, BOAT, bx, by, boat, height=1)
    for y in (8, 30, 52, 74, 96, 118, 140, 162):
        palm(sc, rnd, 178, y)
    # street lamps along the boulevard, so the cars driving past are lit
    for y in (30, 70, 108, 146):
        sc.light(176, y, 16, NEON['warm'], 0.35, p=1.4)


def build_block(art):
    rnd = random.Random(1985)
    sc = Scene()
    ground(sc, rnd)
    west_block(sc, rnd)
    shops(sc, rnd)
    alley(sc, rnd)
    hotels(sc, rnd, art)
    frontage(sc, rnd, art)
    promenade_and_beach(sc, rnd)
    return sc


# ---------------------------------------------------------------- rendering
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def quant(f, B, levels=4, dither=0.55):
    return np.clip(np.floor(f * levels + 0.5 + (B - 0.5) * dither) / levels, 0, 1)


def render_night(sc, ambient=(0.27, 0.28, 0.50)):
    h, w = sc.h, sc.w
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    B = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    Lm = np.zeros((h, w, 3)) + np.array(ambient)
    A = np.zeros((h, w, 3))
    for lt in sc.lights:
        dx, dy = xx - lt.x, yy - lt.y
        d = np.hypot(dx, dy)
        f = np.clip(1 - d / lt.r, 0, 1) ** lt.p
        if lt.direction is not None:
            ang = math.atan2(lt.direction[1], lt.direction[0])
            a = (np.arctan2(dy, dx) - ang + math.pi) % math.tau - math.pi
            f = f * np.clip((1 - np.abs(a) / lt.half) * 1.8, 0, 1)
        q = quant(f, B, dither=lt.dither)
        if lt.exclude:
            x0, y0, x1, y1 = lt.exclude
            q[y0:y1, x0:x1] = 0
        Lm += q[..., None] * lt.col * lt.i
        A += q[..., None] * lt.col * lt.i * lt.add
    E = sc.emi
    G = np.zeros((h, w, 3))
    R = 4
    ky, kx = np.mgrid[-R:R + 1, -R:R + 1]
    K = np.clip(1 - np.hypot(kx, ky) / (R + 0.5), 0, 1) ** 2.0
    ys, xs = np.nonzero((E.max(axis=2) > 0) & sc.bloom)
    for y, x in zip(ys, xs):
        y0, y1, x0, x1 = max(0, y - R), min(h, y + R + 1), max(0, x - R), min(w, x + R + 1)
        G[y0:y1, x0:x1] += K[y0 - y + R:y1 - y + R, x0 - x + R:x1 - x + R, None] * E[y, x]
    gi = G.max(axis=2)
    gq = quant(1 - np.exp(-gi * 0.32), B, levels=4, dither=0.4)
    hue = G / np.maximum(gi[..., None], 1e-6)
    Gq = hue * gq[..., None]
    Lm += Gq * 0.95
    out = sc.alb * Lm + Gq * 0.07 + A
    lit = E.max(axis=2) > 0
    core = lit & sc.bloom
    soft = lit & ~sc.bloom
    out[core] = np.minimum(1, E[core] * 0.72 + 0.30)
    out[soft] = E[soft]
    return np.clip(out, 0, 1)


def save_rgb(arr, path):
    Image.fromarray((arr * 255 + 0.5).astype(np.uint8), 'RGB').save(path, optimize=True)


# ---------------------------------------------------------------- sprites
# Moving things are drawn as if under street lights, a little darker and bluer than by day.
NIGHT = np.array([0.80, 0.78, 0.98])


def sprite(rows, legend):
    """Draws a shape as an RGBA array. Parts that light up are drawn at full brightness."""
    arr = np.array([list(r) for r in rows])
    h, w = arr.shape
    rgba = np.zeros((h, w, 4))
    for r in range(h):
        for c in range(w):
            ch = arr[r, c]
            if ch == '.':
                continue
            dcol, ecol = legend[ch]
            if ecol is not None:
                rgba[r, c, :3] = np.minimum(1, np.array(ecol) * 0.72 + 0.30)
            else:
                rgba[r, c, :3] = np.array(dcol) * NIGHT
            rgba[r, c, 3] = 1
    return rgba


def glow(radius):
    """A dithered round glow, white, for car lights and police lamps. Tinted in the game."""
    size = radius * 2 + 1
    yy, xx = np.mgrid[0:size, 0:size].astype(float)
    d = np.hypot(xx - radius, yy - radius)
    f = np.clip(1 - d / (radius + 0.5), 0, 1) ** 1.6
    B = np.tile(BAYER, (size // 4 + 1, size // 4 + 1))[:size, :size]
    a = quant(f, B, levels=4, dither=0.6) * 0.75
    rgba = np.ones((size, size, 4))
    rgba[..., 3] = a
    return rgba


def cone(length, half_angle=0.42):
    """A dithered headlight beam pointing north, starting at the bottom middle."""
    w = int(length * math.tan(half_angle)) * 2 + 1
    h = length
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx, cy = (w - 1) / 2, h - 0.5
    dx, dy = xx - cx, cy - yy
    d = np.hypot(dx, dy)
    ang = np.abs(np.arctan2(dx, dy))
    f = np.clip(1 - d / length, 0, 1) ** 1.5 * np.clip((1 - ang / half_angle) * 1.8, 0, 1)
    B = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    a = quant(f, B, levels=4, dither=0.5) * 0.9
    rgba = np.ones((h, w, 4))
    rgba[..., 3] = a
    return rgba


def sprites():
    out = {}
    crew_body = C('d9cda9')
    out['car-crew'] = sprite(CAR, car_legend(crew_body))
    out['car-crew-dark'] = sprite(CAR, car_legend(crew_body, lights=False))
    out['car-rivals'] = sprite(SPORTS, car_legend(C('d8283a')))
    out['car-rivals-dark'] = sprite(SPORTS, car_legend(C('d8283a'), lights=False))
    police = C('f1f0ea')
    out['car-patrol'] = sprite(POLICE, car_legend(police))
    out['car-patrol-red'] = sprite(POLICE, car_legend(police, bar='red'))
    out['car-patrol-blue'] = sprite(POLICE, car_legend(police, bar='blue'))
    out['car-traffic-1'] = sprite(CAR, car_legend(C('7d9bd1')))
    out['car-traffic-2'] = sprite(TAXI, car_legend(C('f2c84b')))
    out['car-traffic-3'] = sprite(CONVERTIBLE, car_legend(C('efece4')))
    out['car-traffic-4'] = sprite(CAR, car_legend(C('ef8fb0')))
    people = {
        'driver': (C('3b2a20'), C('f2f0e8')),
        'talker': (C('2b2020'), C('2fb3a6')),
        'muscle': (C('1e1a1a'), C('3a3a48')),
        'lookout': (C('c79a4a'), C('f2d26b')),
        'doorman': (C('1e1a1a'), C('101014')),
        'caller': (C('6b3a24'), C('c9a77a')),
        'local-1': (C('e0b04a'), C('ff6fb0')),
        'local-2': (C('2b2020'), C('f2f0e8')),
        'local-3': (C('6b3a24'), C('49c2c9')),
        'local-4': (C('1e1a1a'), C('f2a65a')),
        'local-5': (C('c79a4a'), C('9fd36a')),
    }
    for name, (hair, cloth) in people.items():
        out[f'person-{name}'] = sprite(PERSON, person_legend(hair, cloth))
    out['chevron-crew'] = sprite(CHEVRON, {'#': (C('48dcea') / NIGHT, None)})
    out['chevron-rivals'] = sprite(CHEVRON, {'#': (C('ff7a45') / NIGHT, None)})
    out['alert'] = sprite(ALERT, {'#': (np.minimum(1, C('f2d26b') / NIGHT), None)})
    out['glow'] = glow(10)
    out['cone'] = cone(16, 0.38)
    return out


def pack(images, width=128, pad=2):
    """Packs the sprites into one sheet, tallest first, in rows."""
    order = sorted(images, key=lambda name: (-images[name].shape[0], name))
    frames, x, y, row = {}, pad, pad, 0
    for name in order:
        h, w = images[name].shape[:2]
        if x + w + pad > width:
            x, y, row = pad, y + row + pad, 0
        frames[name] = [x, y, w, h]
        x += w + pad
        row = max(row, h)
    height = y + row + pad
    sheet = np.zeros((height, width, 4))
    for name, (fx, fy, w, h) in frames.items():
        sheet[fy:fy + h, fx:fx + w] = images[name]
    return sheet, dict(sorted(frames.items()))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    default_out = os.path.normpath(os.path.join(here, '..', '..', 'src', 'city', 'art'))
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--out', default=default_out, help='folder to write the art into')
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)

    for business, art in BUSINESS_ART.items():
        save_rgb(render_night(build_block(art)), os.path.join(args.out, f'block-{business}.png'))
        print(f'block-{business}.png')

    sheet, frames = pack(sprites())
    img = Image.fromarray((np.clip(sheet, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
    img.save(os.path.join(args.out, 'sprites.png'), optimize=True)
    # Written the way Prettier formats it, so running this again doesn't change the file's layout.
    lines = [f'  "size": {json.dumps([sheet.shape[1], sheet.shape[0]])},', '  "frames": {']
    names = list(frames)
    for i, name in enumerate(names):
        comma = ',' if i < len(names) - 1 else ''
        lines.append(f'    {json.dumps(name)}: {json.dumps(frames[name])}{comma}')
    with open(os.path.join(args.out, 'sprites.json'), 'w') as f:
        f.write('{\n' + '\n'.join(lines) + '\n  }\n}\n')
    print(f'sprites.png ({len(frames)} sprites, {sheet.shape[1]} x {sheet.shape[0]})')


if __name__ == '__main__':
    main()
