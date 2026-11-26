"""Génère supabase/seed/movements.sql et benchmarks.sql.

Barèmes : points d'ancrage {100: réf. Games, 90: réf. Élite, 75: réf. RX, 60: réf. Intermédiaire, 40: réf. Fitness}.
La note entre deux ancres est interpolée linéairement (voir src/lib/scoring.ts).
Les barèmes sont modifiables ensuite dans l'admin (page Barèmes).
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEVELS = ["100", "90", "75", "60", "40"]
LIFT_RATIOS = [1, 0.86, 0.70, 0.58, 0.40]


def r25(x):
    return round(x / 2.5) * 2.5


def lift(g):
    return [r25(g * k) for k in LIFT_RATIOS]


def t(s):
    """'6:05' -> 365 s"""
    if isinstance(s, (int, float)):
        return s
    p = [int(x) for x in s.split(":")]
    return p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]


def anchors(vals):
    if vals is None:
        return None
    return {k: v for k, v in zip(LEVELS, vals)}


M = []  # (id, name, name_en, category, family, equipment, metric, test_label, better, am, af, weight)


def add(id, name, cat, fam, metric, label=None, m=None, f=None, en=None, eq=None, better=None, w=1.0):
    if better is None:
        better = "lower" if metric == "time" and label and "hold" not in label.lower() and "tenue" not in label.lower() else "higher"
    M.append(dict(id=id, name=name, name_en=en, category=cat, family=fam, equipment=eq, metric=metric,
                  test_label=label, better=better, anchors_m=anchors(m), anchors_f=anchors(f), weight_in_level=w))


L = "load"; R = "reps"; T = "time"; D = "distance"; C = "calories"; H = "height"
RM = "1RM"; UB = "Max reps unbroken"

# ───────── HALTÉROPHILIE ─────────
H_ = "halterophilie"
add("snatch", "Snatch (squat)", H_, "snatch", L, RM, lift(125), lift(84), "Squat Snatch", "barre")
add("power-snatch", "Power snatch", H_, "snatch", L, RM, lift(112), lift(75), eq="barre", w=0.7)
add("hang-snatch", "Hang snatch", H_, "snatch", L, RM, lift(115), lift(77), eq="barre", w=0.4)
add("hang-power-snatch", "Hang power snatch", H_, "snatch", L, RM, lift(105), lift(70), eq="barre", w=0.4)
add("muscle-snatch", "Muscle snatch", H_, "snatch", L, RM, eq="barre")
add("snatch-balance", "Snatch balance", H_, "snatch", L, RM, lift(130), lift(86), eq="barre", w=0.4)
add("overhead-squat", "Overhead squat", H_, "snatch", L, RM, lift(130), lift(88), eq="barre", w=0.6)
add("snatch-pull", "Snatch pull", H_, "snatch", L, RM, eq="barre")
add("snatch-high-pull", "Snatch high pull", H_, "snatch", L, RM, eq="barre")
add("snatch-deadlift", "Snatch-grip deadlift", H_, "snatch", L, RM, eq="barre")
add("sots-press", "Sots press", H_, "snatch", L, RM, eq="barre")
add("clean", "Clean (squat)", H_, "clean", L, RM, lift(160), lift(105), "Squat Clean", "barre")
add("power-clean", "Power clean", H_, "clean", L, RM, lift(145), lift(95), eq="barre", w=0.7)
add("hang-clean", "Hang clean", H_, "clean", L, RM, lift(150), lift(100), eq="barre", w=0.4)
add("hang-power-clean", "Hang power clean", H_, "clean", L, RM, lift(140), lift(92), eq="barre", w=0.4)
add("clean-and-jerk", "Clean & jerk", H_, "clean", L, RM, lift(155), lift(102), eq="barre")
add("split-jerk", "Split jerk", H_, "jerk", L, RM, lift(150), lift(98), eq="barre", w=0.6)
add("push-jerk", "Push jerk", H_, "jerk", L, RM, lift(145), lift(95), eq="barre", w=0.6)
add("squat-jerk", "Squat jerk", H_, "jerk", L, RM, eq="barre")
add("clean-pull", "Clean pull", H_, "clean", L, RM, eq="barre")
add("clean-high-pull", "Clean high pull", H_, "clean", L, RM, eq="barre")
add("tall-clean", "Tall clean", H_, "clean", L, RM, eq="barre")
add("tall-snatch", "Tall snatch", H_, "snatch", L, RM, eq="barre")
add("jerk-dip", "Jerk dip / drive", H_, "jerk", L, RM, eq="barre")

# ───────── FORCE ─────────
F_ = "force"
add("back-squat", "Back squat", F_, "squat", L, RM, lift(225), lift(145), eq="barre")
add("front-squat", "Front squat", F_, "squat", L, RM, lift(190), lift(122), eq="barre")
add("deadlift", "Deadlift", F_, "hinge", L, RM, lift(270), lift(175), eq="barre")
add("strict-press", "Strict press", F_, "press", L, RM, lift(100), lift(63), "Shoulder Press", "barre")
add("push-press", "Push press", F_, "press", L, RM, lift(130), lift(85), eq="barre", w=0.7)
add("bench-press", "Bench press", F_, "press", L, RM, lift(160), lift(90), eq="barre", w=0.6)
add("thruster", "Thruster", F_, "squat", L, RM, lift(140), lift(92), eq="barre", w=0.5)
add("weighted-pull-up", "Weighted pull-up (lest)", F_, "pull", L, "1RM lest ajouté", [60, 45, 30, 18, 5], [30, 22, 13, 7, 2], eq="barre de traction", w=0.6)
add("weighted-dip", "Weighted dip (lest)", F_, "press", L, "1RM lest ajouté", [70, 52.5, 35, 22.5, 7.5], [35, 25, 15, 8, 2.5], eq="barres parallèles", w=0.4)
add("sumo-deadlift", "Sumo deadlift", F_, "hinge", L, RM, eq="barre")
add("pause-back-squat", "Pause back squat", F_, "squat", L, RM, eq="barre")
add("pause-front-squat", "Pause front squat", F_, "squat", L, RM, eq="barre")
add("tempo-back-squat", "Tempo back squat", F_, "squat", L, "Charge de travail", eq="barre")
add("box-squat", "Box squat", F_, "squat", L, RM, eq="barre")
add("zercher-squat", "Zercher squat", F_, "squat", L, RM, eq="barre")
add("deficit-deadlift", "Deficit deadlift", F_, "hinge", L, RM, eq="barre")
add("romanian-deadlift", "Romanian deadlift (RDL)", F_, "hinge", L, "Charge de travail", eq="barre")
add("good-morning", "Good morning", F_, "hinge", L, "Charge de travail", eq="barre")
add("hip-thrust", "Hip thrust", F_, "hinge", L, RM, eq="barre")
add("incline-bench", "Incline bench press", F_, "press", L, RM, eq="barre")
add("floor-press", "Floor press", F_, "press", L, RM, eq="barre")
add("z-press", "Z press", F_, "press", L, RM, eq="barre")
add("behind-neck-press", "Behind the neck press", F_, "press", L, RM, eq="barre")
add("pendlay-row", "Pendlay row", F_, "pull", L, RM, eq="barre")
add("bent-over-row", "Bent-over row", F_, "pull", L, "Charge de travail", eq="barre")

# ───────── GYMNASTIQUE ─────────
G_ = "gymnastique"
add("strict-pull-up", "Strict pull-up", G_, "pull", R, UB, [35, 25, 15, 9, 3], [25, 17, 9, 4, 1], eq="barre")
add("kipping-pull-up", "Pull-up (kipping)", G_, "pull", R, UB, [70, 50, 30, 18, 6], [55, 40, 22, 12, 3], eq="barre", w=0.6)
add("butterfly-pull-up", "Butterfly pull-up", G_, "pull", R, UB, eq="barre")
add("chest-to-bar", "Chest-to-bar pull-up", G_, "pull", R, UB, [50, 35, 20, 12, 3], [40, 28, 15, 7, 1], eq="barre", w=0.7)
add("bar-muscle-up", "Bar muscle-up", G_, "muscle-up", R, UB, [30, 20, 10, 5, 1], [20, 12, 6, 3, 1], eq="barre")
add("ring-muscle-up", "Ring muscle-up", G_, "muscle-up", R, UB, [25, 16, 8, 4, 1], [15, 9, 4, 2, 1], eq="anneaux")
add("strict-ring-muscle-up", "Strict ring muscle-up", G_, "muscle-up", R, UB, [12, 7, 3, 2, 1], [8, 4, 2, 1, 0.5], eq="anneaux", w=0.5)
add("toes-to-bar", "Toes-to-bar", G_, "core", R, UB, [60, 40, 25, 15, 5], [50, 35, 20, 12, 3], eq="barre", w=0.7)
add("knees-to-elbow", "Knees-to-elbow", G_, "core", R, UB, eq="barre")
add("strict-hspu", "Strict handstand push-up", G_, "press", R, UB, [30, 20, 12, 6, 1], [20, 12, 6, 2, 1], eq="mur")
add("kipping-hspu", "Handstand push-up (kipping)", G_, "press", R, UB, [50, 35, 20, 12, 3], [40, 25, 14, 6, 1], eq="mur", w=0.7)
add("deficit-hspu", "Deficit HSPU", G_, "press", R, UB, eq="mur")
add("wall-facing-hspu", "Wall-facing HSPU", G_, "press", R, UB, eq="mur")
add("handstand-walk", "Handstand walk", G_, "handstand", D, "Distance max sans chute (m)", [80, 50, 25, 10, 2], [70, 40, 20, 8, 2])
add("handstand-hold", "Handstand hold", G_, "handstand", T, "Tenue max (s)", [180, 120, 60, 30, 10], [150, 100, 50, 25, 8], better="higher", w=0.4)
add("wall-walk", "Wall walk", G_, "handstand", R, UB)
add("strict-ring-dip", "Strict ring dip", G_, "press", R, UB, [50, 35, 20, 12, 4], [30, 20, 10, 5, 1], eq="anneaux", w=0.6)
add("bar-dip", "Bar dip", G_, "press", R, UB, eq="barres parallèles")
add("push-up", "Push-up", G_, "press", R, UB, [80, 60, 45, 30, 15], [60, 45, 30, 18, 6], w=0.4)
add("rope-climb", "Rope climb", G_, "pull", R, "Max en 2 min", eq="corde")
add("legless-rope-climb", "Legless rope climb", G_, "pull", R, UB, [12, 7, 3, 2, 1], [8, 4, 2, 1, 0.5], eq="corde", w=0.5)
add("pistol", "Pistol squat", G_, "squat", R, "Max reps unbroken (alterné)", [80, 50, 30, 18, 6], [70, 45, 28, 15, 5], w=0.4)
add("double-under", "Double-under", G_, "corde", R, UB, [300, 200, 100, 50, 10], [250, 170, 90, 45, 10], eq="corde à sauter", w=0.6)
add("triple-under", "Triple-under", G_, "corde", R, UB, eq="corde à sauter")
add("crossover", "Crossover double-under", G_, "corde", R, UB, eq="corde à sauter")
add("l-sit", "L-sit", G_, "core", T, "Tenue max (s)", [90, 60, 35, 20, 8], [75, 50, 30, 18, 6], better="higher", w=0.4)
add("box-jump", "Box jump", G_, "saut", H, "Hauteur max (cm)", [150, 130, 110, 95, 70], [125, 110, 90, 80, 60], eq="box", w=0.4)
add("box-jump-over", "Box jump over", G_, "saut", R, "Max en 1 min", eq="box")
add("burpee", "Burpee", G_, "burpee", R, "Max en 7 min", [150, 130, 110, 95, 70], [130, 112, 95, 82, 60], w=0.4)
add("bar-facing-burpee", "Bar-facing burpee", G_, "burpee", R, "Max en 1 min")
add("burpee-box-jump-over", "Burpee box jump over", G_, "burpee", R, "Max en 1 min", eq="box")
add("ring-row", "Ring row", G_, "pull", R, UB, eq="anneaux")
add("jumping-pull-up", "Jumping pull-up", G_, "pull", R, UB, eq="barre")
add("ring-push-up", "Ring push-up", G_, "press", R, UB, eq="anneaux")
add("pike-push-up", "Pike push-up", G_, "press", R, UB, eq="box")
add("ring-support", "Ring support hold", G_, "press", T, "Tenue max (s)", eq="anneaux", better="higher")
add("skin-the-cat", "Skin the cat", G_, "pull", R, UB, eq="anneaux")
add("kip-swing", "Kip swing", G_, "pull", R, UB, eq="barre")
add("scap-pull-up", "Scap pull-up", G_, "pull", R, UB, eq="barre")
add("air-squat", "Air squat", G_, "squat", R, "Max en 2 min")
add("lunge-bw", "Fente au poids du corps", G_, "squat", R, "Max en 2 min")

# ───────── ENGINE ─────────
E_ = "engine"
add("row-500", "Rameur 500 m", E_, "rameur", T, "500 m", [t("1:25"), t("1:31"), t("1:38"), t("1:45"), t("2:00")], [t("1:38"), t("1:45"), t("1:53"), t("2:02"), t("2:20")], eq="rameur", w=0.6)
add("row-2000", "Rameur 2000 m", E_, "rameur", T, "2000 m", [t("6:05"), t("6:30"), t("7:00"), t("7:30"), t("8:30")], [t("6:55"), t("7:25"), t("8:00"), t("8:35"), t("9:40")], eq="rameur")
add("row-5000", "Rameur 5000 m", E_, "rameur", T, "5000 m", [t("16:45"), t("18:00"), t("19:30"), t("21:00"), t("24:00")], [t("19:00"), t("20:15"), t("22:00"), t("23:30"), t("26:40")], eq="rameur", w=0.6)
add("row-cal-1min", "Rameur max cal 1 min", E_, "rameur", C, "Calories en 1 min", eq="rameur")
add("ski-1000", "SkiErg 1000 m", E_, "ski", T, "1000 m", [t("3:20"), t("3:35"), t("3:55"), t("4:15"), t("4:50")], [t("3:50"), t("4:05"), t("4:30"), t("4:55"), t("5:35")], eq="skierg", w=0.6)
add("ski-500", "SkiErg 500 m", E_, "ski", T, "500 m", eq="skierg")
add("bike-erg-2000", "BikeErg 2000 m", E_, "bike", T, "2000 m", [t("3:05"), t("3:20"), t("3:35"), t("3:55"), t("4:25")], [t("3:35"), t("3:50"), t("4:10"), t("4:30"), t("5:05")], eq="bikeerg", w=0.5)
add("bike-erg-10k", "BikeErg 10 km", E_, "bike", T, "10 km", eq="bikeerg")
add("echo-bike-cal-1min", "Echo / Assault bike max cal 1 min", E_, "bike", C, "Calories en 1 min", eq="air bike")
add("echo-bike-10min", "Echo / Assault bike 10 min", E_, "bike", C, "Calories en 10 min", eq="air bike")
add("run-400", "Course 400 m", E_, "course", T, "400 m", [60, 68, 78, 88, 105], [70, 78, 90, 100, 120], w=0.5)
add("run-1600", "Course 1 mile (1609 m)", E_, "course", T, "1 mile", [t("4:45"), t("5:20"), t("6:00"), t("6:45"), t("8:00")], [t("5:30"), t("6:05"), t("6:50"), t("7:40"), t("9:10")], w=0.7)
add("run-5k", "Course 5 km", E_, "course", T, "5 km", [t("17:00"), t("19:00"), t("21:30"), t("24:00"), t("28:00")], [t("19:30"), t("21:30"), t("24:30"), t("27:30"), t("32:00")])
add("run-10k", "Course 10 km", E_, "course", T, "10 km")
add("swim-400", "Natation 400 m", E_, "natation", T, "400 m")
add("sled-push", "Poussée de traîneau", E_, "traineau", T, "Distance fixe")

# ───────── HALTÈRES & KETTLEBELL ─────────
K_ = "haltere_kb"
add("db-snatch", "Dumbbell snatch", K_, "olympique", R, "Max en 1 min (22,5/15 kg)", eq="haltère")
add("db-clean-and-jerk", "Dumbbell clean & jerk", K_, "olympique", R, "Max en 1 min", eq="haltère")
add("db-power-clean", "Dumbbell power clean", K_, "olympique", L, "Charge de travail", eq="haltère")
add("db-thruster", "Dumbbell thruster", K_, "squat", L, "Charge de travail", eq="haltère")
add("db-press", "Dumbbell strict press", K_, "press", L, "Charge de travail", eq="haltère")
add("db-push-press", "Dumbbell push press", K_, "press", L, "Charge de travail", eq="haltère")
add("db-bench", "Dumbbell bench press", K_, "press", L, "Charge de travail", eq="haltère")
add("db-row", "Dumbbell row", K_, "pull", L, "Charge de travail", eq="haltère")
add("db-lunge", "Dumbbell walking lunge", K_, "squat", L, "Charge de travail", eq="haltère")
add("db-box-step-over", "Dumbbell box step-over", K_, "squat", R, "Max en 1 min", eq="haltère")
add("db-front-squat", "Dumbbell front squat", K_, "squat", L, "Charge de travail", eq="haltère")
add("db-ohs", "Single-arm DB overhead squat", K_, "squat", L, "Charge de travail", eq="haltère")
add("devil-press", "Devil press", K_, "burpee", R, "Max en 1 min", eq="haltère")
add("man-maker", "Man maker", K_, "burpee", R, "Max en 1 min", eq="haltère")
add("kb-swing", "Kettlebell swing (américain)", K_, "hinge", R, UB, eq="kettlebell")
add("kb-swing-ru", "Kettlebell swing (russe)", K_, "hinge", R, UB, eq="kettlebell")
add("kb-snatch", "Kettlebell snatch", K_, "olympique", R, "Max en 1 min", eq="kettlebell")
add("kb-clean", "Kettlebell clean", K_, "olympique", R, "Max en 1 min", eq="kettlebell")
add("kb-goblet-squat", "Goblet squat", K_, "squat", L, "Charge de travail", eq="kettlebell")
add("turkish-get-up", "Turkish get-up", K_, "full body", L, RM, eq="kettlebell")
add("kb-windmill", "Kettlebell windmill", K_, "core", L, "Charge de travail", eq="kettlebell")
add("wall-ball", "Wall ball", K_, "squat", R, UB + " (9/6 kg)", [150, 100, 60, 40, 20], [150, 100, 60, 40, 20], eq="medecine ball", w=0.4)

# ───────── RENFORCEMENT ─────────
R_ = "renfo"
renfo = [
    ("bulgarian-split-squat", "Bulgarian split squat", "unilatéral", L),
    ("walking-lunge", "Fentes marchées chargées", "unilatéral", L),
    ("reverse-lunge", "Fentes arrière", "unilatéral", L),
    ("step-up", "Step-up", "unilatéral", L),
    ("cossack-squat", "Cossack squat", "mobilité-force", L),
    ("single-leg-rdl", "RDL unijambe", "unilatéral", L),
    ("kickstand-rdl", "Kickstand RDL", "unilatéral", L),
    ("nordic-curl", "Nordic hamstring curl", "ischios", R),
    ("ghd-hip-extension", "GHD hip extension", "chaîne postérieure", R),
    ("ghd-back-extension", "GHD back extension", "chaîne postérieure", R),
    ("reverse-hyper", "Reverse hyper", "chaîne postérieure", L),
    ("glute-bridge", "Glute bridge", "fessiers", L),
    ("belt-squat", "Belt squat", "squat", L),
    ("leg-press", "Presse à cuisses", "squat", L),
    ("leg-curl", "Leg curl", "ischios", L),
    ("calf-raise", "Mollets (calf raise)", "bas de jambe", L),
    ("tibialis-raise", "Tibialis raise", "bas de jambe", R),
    ("jefferson-curl", "Jefferson curl", "mobilité-force", L),
    ("chest-supported-row", "Rowing poitrine appuyée", "tirage", L),
    ("seal-row", "Seal row", "tirage", L),
    ("lat-pulldown", "Tirage vertical (lat pulldown)", "tirage", L),
    ("pull-over", "Pull-over", "tirage", L),
    ("face-pull", "Face pull", "épaules", L),
    ("band-pull-apart", "Band pull-apart", "épaules", R),
    ("cuban-press", "Cuban press", "épaules", L),
    ("external-rotation", "Rotation externe", "épaules", L),
    ("ytw-raise", "Y-T-W raises", "épaules", L),
    ("lateral-raise", "Élévations latérales", "épaules", L),
    ("landmine-press", "Landmine press", "poussée", L),
    ("seated-db-press", "Développé haltères assis", "poussée", L),
    ("arnold-press", "Arnold press", "poussée", L),
    ("bottom-up-press", "Bottom-up KB press", "épaules", L),
    ("biceps-curl", "Curl biceps", "bras", L),
    ("hammer-curl", "Curl marteau", "bras", L),
    ("triceps-extension", "Extension triceps", "bras", L),
    ("skull-crusher", "Skull crusher", "bras", L),
    ("dips-banc", "Dips sur banc", "bras", R),
    ("wrist-curl", "Avant-bras (wrist curl)", "bras", L),
    ("dead-hang", "Suspension (dead hang)", "grip", T),
    ("plate-pinch", "Plate pinch", "grip", T),
    ("strict-knees-to-chest", "Strict knees to chest", "gainage", R),
    ("ring-fly", "Écarté aux anneaux", "poussée", R),
    ("pause-snatch", "Pause snatch", "technique", L),
    ("snatch-from-blocks", "Snatch depuis blocs", "technique", L),
    ("clean-from-blocks", "Clean depuis blocs", "technique", L),
    ("drop-snatch", "Drop snatch", "technique", L),
    ("tempo-pull-up", "Tempo pull-up", "tirage", R),
    ("negative-pull-up", "Traction négative", "tirage", R),
    ("negative-hspu", "HSPU négatif", "poussée", R),
    ("arch-hold", "Arch hold (superman)", "gainage", T),
]
for i, (id_, name, fam, metric) in enumerate(renfo):
    label = "Charge de travail" if metric == L else ("Tenue max (s)" if metric == T else "Max reps")
    add(id_, name, R_, fam, metric, label, better="higher")

# ───────── CORE ─────────
C_ = "core"
add("ghd-sit-up", "GHD sit-up", C_, "flexion", R, UB, eq="GHD")
add("abmat-sit-up", "Sit-up AbMat", C_, "flexion", R, "Max en 2 min", eq="abmat")
add("hollow-hold", "Hollow hold", C_, "gainage", T, "Tenue max (s)", better="higher")
add("hollow-rock", "Hollow rock", C_, "gainage", R, UB)
add("v-up", "V-up", C_, "flexion", R, UB)
add("plank", "Planche (plank)", C_, "gainage", T, "Tenue max (s)", better="higher")
add("side-plank", "Planche latérale", C_, "gainage", T, "Tenue max (s)", better="higher")
add("copenhagen-plank", "Copenhagen plank", C_, "gainage", T, "Tenue max (s)", better="higher")
add("ab-wheel", "Ab wheel rollout", C_, "anti-extension", R, UB)
add("hanging-leg-raise", "Relevé de jambes suspendu", C_, "flexion", R, UB, eq="barre")
add("dragon-flag", "Dragon flag", C_, "anti-extension", R, UB)
add("pallof-press", "Pallof press", C_, "anti-rotation", L, "Charge de travail")
add("russian-twist", "Russian twist", C_, "rotation", R, UB)
add("dead-bug", "Dead bug", C_, "anti-extension", R, UB)

# ───────── STRONGMAN ─────────
S_ = "strongman"
add("sandbag-clean", "Sandbag clean", S_, "sac", R, "Max en 1 min", eq="sandbag")
add("sandbag-to-shoulder", "Sandbag to shoulder", S_, "sac", R, "Max en 1 min", eq="sandbag")
add("sandbag-carry", "Sandbag carry", S_, "portés", L, "Charge de travail", eq="sandbag")
add("farmer-carry", "Farmer carry", S_, "portés", L, "Charge max 20 m", eq="haltères / trap bar")
add("yoke-carry", "Yoke carry", S_, "portés", L, "Charge max 20 m", eq="yoke")
add("front-rack-carry", "Front rack carry", S_, "portés", L, "Charge de travail", eq="kettlebell")
add("overhead-carry", "Overhead carry", S_, "portés", L, "Charge de travail", eq="haltère")
add("sled-pull", "Tirage de traîneau", S_, "traîneau", L, "Charge de travail", eq="traîneau")
add("sled-drag", "Sled drag à reculons", S_, "traîneau", L, "Charge de travail", eq="traîneau")
add("atlas-stone", "Atlas stone", S_, "pierre", L, RM, eq="pierre")
add("d-ball-over-shoulder", "D-ball over shoulder", S_, "pierre", R, "Max en 1 min", eq="D-ball")
add("worm", "Worm", S_, "équipe", R, "Max en 1 min", eq="worm")
add("log-press", "Log press", S_, "press", L, RM, eq="log")
add("axle-deadlift", "Axle deadlift", S_, "hinge", L, RM, eq="axle")

# ─────────────── BENCHMARKS (séances de référence) ───────────────
B = []


def bench(title, desc, score, m, f, rpr=None, cap=None, movs=()):
    better = "lower" if score == "time" else "higher"
    B.append(dict(title=title, description=desc, score_type=score, better=better, reps_per_round=rpr,
                  time_cap_s=cap, movements=list(movs), anchors_m=anchors(m), anchors_f=anchors(f)))


TM = lambda *xs: [t(x) for x in xs]
bench("Fran", "21-15-9\nThruster 43/30 kg\nPull-up", "time", TM("2:15", "3:00", "4:30", "6:00", "9:00"), TM("2:45", "3:30", "5:00", "7:00", "10:00"), movs=["thruster", "kipping-pull-up"])
bench("Grace", "30 clean & jerk pour le temps\n61/43 kg", "time", TM("1:30", "2:10", "3:15", "4:30", "7:00"), TM("1:50", "2:30", "3:45", "5:00", "7:30"), movs=["clean-and-jerk"])
bench("Isabel", "30 snatch pour le temps\n61/43 kg", "time", TM("1:30", "2:00", "3:00", "4:30", "7:00"), TM("1:45", "2:20", "3:30", "5:00", "7:30"), movs=["snatch"])
bench("Helen", "3 rounds :\n400 m course\n21 KB swing 24/16 kg\n12 pull-up", "time", TM("7:00", "8:00", "9:30", "11:00", "14:00"), TM("7:50", "9:00", "10:30", "12:00", "15:00"), movs=["run-400", "kb-swing", "kipping-pull-up"])
bench("Diane", "21-15-9\nDeadlift 102/70 kg\nHandstand push-up", "time", TM("2:10", "3:00", "5:00", "7:00", "11:00"), TM("2:40", "3:40", "6:00", "8:00", "12:00"), movs=["deadlift", "kipping-hspu"])
bench("Elizabeth", "21-15-9\nClean 61/43 kg\nRing dip", "time", TM("3:00", "4:00", "6:00", "8:00", "12:00"), TM("3:40", "4:40", "7:00", "9:00", "13:00"), movs=["clean", "strict-ring-dip"])
bench("Karen", "150 wall balls pour le temps\n9/6 kg", "time", TM("5:30", "6:30", "8:00", "10:00", "13:00"), TM("6:00", "7:00", "9:00", "11:00", "14:00"), movs=["wall-ball"])
bench("Annie", "50-40-30-20-10\nDouble-under\nAbMat sit-up", "time", TM("5:30", "6:30", "8:00", "10:00", "13:00"), TM("6:00", "7:00", "8:30", "10:30", "13:30"), movs=["double-under", "abmat-sit-up"])
bench("Jackie", "1000 m rameur\n50 thrusters 20/15 kg\n30 pull-up", "time", TM("5:15", "6:00", "7:15", "8:30", "11:00"), TM("6:00", "6:45", "8:00", "9:30", "12:00"), movs=["row-2000", "thruster", "kipping-pull-up"])
bench("Nancy", "5 rounds :\n400 m course\n15 overhead squat 43/30 kg", "time", TM("8:30", "10:00", "12:00", "14:30", "18:00"), TM("9:30", "11:00", "13:30", "16:00", "20:00"), movs=["run-400", "overhead-squat"])
bench("DT", "5 rounds :\n12 deadlift\n9 hang power clean\n6 push jerk\n70/47,5 kg", "time", TM("4:30", "6:00", "8:00", "10:30", "15:00"), TM("5:30", "7:00", "9:30", "12:00", "17:00"), movs=["deadlift", "hang-power-clean", "push-jerk"])
bench("Amanda", "9-7-5\nRing muscle-up\nSquat snatch 61/43 kg", "time", TM("4:00", "6:00", "9:00", "13:00", "20:00"), TM("5:00", "7:30", "11:00", "15:00", "22:00"), movs=["ring-muscle-up", "snatch"])
bench("Murph", "1 mile course\n100 pull-up\n200 push-up\n300 air squat\n1 mile course\nGilet 9/6 kg", "time", TM("35:00", "40:00", "48:00", "58:00", "1:15:00"), TM("40:00", "46:00", "55:00", "1:05:00", "1:25:00"), movs=["run-1600", "kipping-pull-up", "push-up", "air-squat"])
bench("Cindy", "AMRAP 20 min :\n5 pull-up\n10 push-up\n15 air squat\n(score en reps totales : rounds × 30 + reps)", "rounds_reps", [900, 750, 600, 480, 330], [810, 660, 540, 420, 300], rpr=30, movs=["kipping-pull-up", "push-up", "air-squat"])
bench("Fight Gone Bad", "3 rounds, 1 min par station :\nWall ball 9/6 kg, SDHP 34/25 kg, box jump 50/40 cm, push press 34/25 kg, rameur (cal), 1 min repos\nScore : reps totales", "reps", [450, 400, 330, 280, 220], [410, 360, 300, 250, 200], movs=["wall-ball", "box-jump", "push-press", "row-cal-1min"])
bench("Chelsea", "EMOM 30 min :\n5 pull-up\n10 push-up\n15 air squat\nScore : minutes complétées", "reps", None, None, movs=["kipping-pull-up", "push-up", "air-squat"])
bench("Angie", "100 pull-up\n100 push-up\n100 sit-up\n100 air squat", "time", TM("11:00", "14:00", "18:00", "23:00", "32:00"), TM("12:30", "16:00", "20:00", "25:00", "35:00"), movs=["kipping-pull-up", "push-up", "abmat-sit-up", "air-squat"])
bench("Kelly", "5 rounds :\n400 m course\n30 box jump 61/50 cm\n30 wall ball 9/6 kg", "time", TM("17:00", "20:00", "24:00", "28:00", "35:00"), TM("18:30", "22:00", "26:00", "30:00", "38:00"), movs=["run-400", "box-jump", "wall-ball"])


def sql_val(v):
    if v is None:
        return "null"
    if isinstance(v, (dict, list)) and not isinstance(v, str) and isinstance(v, dict):
        return "'" + json.dumps(v).replace("'", "''") + "'::jsonb"
    if isinstance(v, list):
        return "array[" + ",".join(sql_val(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


out = ROOT / "supabase" / "seed"
out.mkdir(parents=True, exist_ok=True)
ids = set()
cols = ["id", "name", "name_en", "category", "family", "equipment", "metric", "test_label", "better", "anchors_m", "anchors_f", "weight_in_level", "sort"]
rows = []
for i, m in enumerate(M):
    assert m["id"] not in ids, m["id"]
    ids.add(m["id"])
    m["sort"] = i
    rows.append("(" + ",".join(sql_val(m[c]) for c in cols) + ")")
(out / "movements.sql").write_text(
    f"insert into public.movements ({','.join(cols)}) values\n" + ",\n".join(rows)
    + "\non conflict (id) do update set " + ",".join(f"{c}=excluded.{c}" for c in cols if c != "id") + ";\n")

for b in B:
    for mv in b["movements"]:
        assert mv in ids, mv
bcols = ["title", "description", "score_type", "better", "reps_per_round", "time_cap_s", "movements", "anchors_m", "anchors_f"]
brows = ["(" + ",".join(sql_val(b[c]) for c in bcols) + ",'benchmark',true,'2026-01-01')" for b in B]
(out / "benchmarks.sql").write_text(
    f"insert into public.workouts ({','.join(bcols)},source,counts_in_level,workout_date) values\n" + ",\n".join(brows) + ";\n")

scored = sum(1 for m in M if m["anchors_m"])
print(f"{len(M)} mouvements ({scored} avec barème), {len(B)} benchmarks")
from collections import Counter
print(Counter(m["category"] for m in M))
