insert into public.workouts (title,description,score_type,better,reps_per_round,time_cap_s,movements,anchors_m,anchors_f,source,counts_in_level,workout_date) values
('Fran','21-15-9
Thruster 43/30 kg
Pull-up','time','lower',null,null,array['thruster','kipping-pull-up']::text[],'{"100": 135, "90": 180, "75": 270, "60": 360, "40": 540}'::jsonb,'{"100": 165, "90": 210, "75": 300, "60": 420, "40": 600}'::jsonb,'benchmark',true,'2026-01-01'),
('Grace','30 clean & jerk pour le temps
61/43 kg','time','lower',null,null,array['clean-and-jerk']::text[],'{"100": 90, "90": 130, "75": 195, "60": 270, "40": 420}'::jsonb,'{"100": 110, "90": 150, "75": 225, "60": 300, "40": 450}'::jsonb,'benchmark',true,'2026-01-01'),
('Isabel','30 snatch pour le temps
61/43 kg','time','lower',null,null,array['snatch']::text[],'{"100": 90, "90": 120, "75": 180, "60": 270, "40": 420}'::jsonb,'{"100": 105, "90": 140, "75": 210, "60": 300, "40": 450}'::jsonb,'benchmark',true,'2026-01-01'),
('Helen','3 rounds :
400 m course
21 KB swing 24/16 kg
12 pull-up','time','lower',null,null,array['run-400','kb-swing','kipping-pull-up']::text[],'{"100": 420, "90": 480, "75": 570, "60": 660, "40": 840}'::jsonb,'{"100": 470, "90": 540, "75": 630, "60": 720, "40": 900}'::jsonb,'benchmark',true,'2026-01-01'),
('Diane','21-15-9
Deadlift 102/70 kg
Handstand push-up','time','lower',null,null,array['deadlift','kipping-hspu']::text[],'{"100": 130, "90": 180, "75": 300, "60": 420, "40": 660}'::jsonb,'{"100": 160, "90": 220, "75": 360, "60": 480, "40": 720}'::jsonb,'benchmark',true,'2026-01-01'),
('Elizabeth','21-15-9
Clean 61/43 kg
Ring dip','time','lower',null,null,array['clean','strict-ring-dip']::text[],'{"100": 180, "90": 240, "75": 360, "60": 480, "40": 720}'::jsonb,'{"100": 220, "90": 280, "75": 420, "60": 540, "40": 780}'::jsonb,'benchmark',true,'2026-01-01'),
('Karen','150 wall balls pour le temps
9/6 kg','time','lower',null,null,array['wall-ball']::text[],'{"100": 330, "90": 390, "75": 480, "60": 600, "40": 780}'::jsonb,'{"100": 360, "90": 420, "75": 540, "60": 660, "40": 840}'::jsonb,'benchmark',true,'2026-01-01'),
('Annie','50-40-30-20-10
Double-under
AbMat sit-up','time','lower',null,null,array['double-under','abmat-sit-up']::text[],'{"100": 330, "90": 390, "75": 480, "60": 600, "40": 780}'::jsonb,'{"100": 360, "90": 420, "75": 510, "60": 630, "40": 810}'::jsonb,'benchmark',true,'2026-01-01'),
('Jackie','1000 m rameur
50 thrusters 20/15 kg
30 pull-up','time','lower',null,null,array['row-2000','thruster','kipping-pull-up']::text[],'{"100": 315, "90": 360, "75": 435, "60": 510, "40": 660}'::jsonb,'{"100": 360, "90": 405, "75": 480, "60": 570, "40": 720}'::jsonb,'benchmark',true,'2026-01-01'),
('Nancy','5 rounds :
400 m course
15 overhead squat 43/30 kg','time','lower',null,null,array['run-400','overhead-squat']::text[],'{"100": 510, "90": 600, "75": 720, "60": 870, "40": 1080}'::jsonb,'{"100": 570, "90": 660, "75": 810, "60": 960, "40": 1200}'::jsonb,'benchmark',true,'2026-01-01'),
('DT','5 rounds :
12 deadlift
9 hang power clean
6 push jerk
70/47,5 kg','time','lower',null,null,array['deadlift','hang-power-clean','push-jerk']::text[],'{"100": 270, "90": 360, "75": 480, "60": 630, "40": 900}'::jsonb,'{"100": 330, "90": 420, "75": 570, "60": 720, "40": 1020}'::jsonb,'benchmark',true,'2026-01-01'),
('Amanda','9-7-5
Ring muscle-up
Squat snatch 61/43 kg','time','lower',null,null,array['ring-muscle-up','snatch']::text[],'{"100": 240, "90": 360, "75": 540, "60": 780, "40": 1200}'::jsonb,'{"100": 300, "90": 450, "75": 660, "60": 900, "40": 1320}'::jsonb,'benchmark',true,'2026-01-01'),
('Murph','1 mile course
100 pull-up
200 push-up
300 air squat
1 mile course
Gilet 9/6 kg','time','lower',null,null,array['run-1600','kipping-pull-up','push-up','air-squat']::text[],'{"100": 2100, "90": 2400, "75": 2880, "60": 3480, "40": 4500}'::jsonb,'{"100": 2400, "90": 2760, "75": 3300, "60": 3900, "40": 5100}'::jsonb,'benchmark',true,'2026-01-01'),
('Cindy','AMRAP 20 min :
5 pull-up
10 push-up
15 air squat
(score en reps totales : rounds × 30 + reps)','rounds_reps','higher',30,null,array['kipping-pull-up','push-up','air-squat']::text[],'{"100": 900, "90": 750, "75": 600, "60": 480, "40": 330}'::jsonb,'{"100": 810, "90": 660, "75": 540, "60": 420, "40": 300}'::jsonb,'benchmark',true,'2026-01-01'),
('Fight Gone Bad','3 rounds, 1 min par station :
Wall ball 9/6 kg, SDHP 34/25 kg, box jump 50/40 cm, push press 34/25 kg, rameur (cal), 1 min repos
Score : reps totales','reps','higher',null,null,array['wall-ball','box-jump','push-press','row-cal-1min']::text[],'{"100": 450, "90": 400, "75": 330, "60": 280, "40": 220}'::jsonb,'{"100": 410, "90": 360, "75": 300, "60": 250, "40": 200}'::jsonb,'benchmark',true,'2026-01-01'),
('Chelsea','EMOM 30 min :
5 pull-up
10 push-up
15 air squat
Score : minutes complétées','reps','higher',null,null,array['kipping-pull-up','push-up','air-squat']::text[],null,null,'benchmark',true,'2026-01-01'),
('Angie','100 pull-up
100 push-up
100 sit-up
100 air squat','time','lower',null,null,array['kipping-pull-up','push-up','abmat-sit-up','air-squat']::text[],'{"100": 660, "90": 840, "75": 1080, "60": 1380, "40": 1920}'::jsonb,'{"100": 750, "90": 960, "75": 1200, "60": 1500, "40": 2100}'::jsonb,'benchmark',true,'2026-01-01'),
('Kelly','5 rounds :
400 m course
30 box jump 61/50 cm
30 wall ball 9/6 kg','time','lower',null,null,array['run-400','box-jump','wall-ball']::text[],'{"100": 1020, "90": 1200, "75": 1440, "60": 1680, "40": 2100}'::jsonb,'{"100": 1110, "90": 1320, "75": 1560, "60": 1800, "40": 2280}'::jsonb,'benchmark',true,'2026-01-01');
