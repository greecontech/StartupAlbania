-- Aneksi 1 — Plani i aktiviteteve dhe dukshmërisë (Greecon shpk / Greecon Platform)
insert into project_items (id, kind, code, title, months, sort) values
  ('R1',    'result',   'R1',    'Produkti Greecon i zhvilluar dhe funksional',                          '{}',          100),
  ('A1.1',  'activity', 'A 1.1', 'Menaxhimi dhe koordinimi i projektit',                                 '{1,2,3,4,5}', 110),
  ('A1.2',  'activity', 'A 1.2', 'Zhvillimi dhe finalizimi teknologjik i platformës Greecon',            '{1,2,3}',     120),
  ('A1.3',  'activity', 'A 1.3', 'Konsulencë, validim dhe optimizim teknik',                             '{1,2,3}',     130),
  ('R2',    'result',   'R2',    'Produkti Greecon i pilotuar dhe lançuar në treg',                      '{}',          200),
  ('A2.1',  'activity', 'A 2.1', 'Brandim, marketing digjital dhe promovim',                             '{1,2,3,4,5}', 210),
  ('A2.2',  'activity', 'A 2.2', 'Pilotimi, testimi dhe validimi i platformës në kushte reale',          '{4,5}',       220),
  ('R3',    'result',   'R3',    'Marka Greecon e regjistruar dhe e mbrojtur',                           '{}',          300),
  ('A3.1',  'activity', 'A 3.1', 'Regjistrimi dhe mbrojtja e markës Greecon',                            '{2,3}',       310)
on conflict (id) do nothing;

-- ToR — Eksperti për Zhvillim Teknologjik (Aneksi I, §3)
insert into project_items (id, kind, code, title, months, sort) values
  ('D1', 'deliverable', 'D1', 'Plan Pune për Zhvillimin Teknologjik të Greecon Platform',                 '{1}', 400),
  ('D2', 'deliverable', 'D2', 'Specifikimi i kërkesave funksionale dhe teknike të platformës',            '{1}', 410),
  ('D3', 'deliverable', 'D3', 'Struktura funksionale dhe teknike e moduleve dhe funksionaliteteve prioritare', '{2}', 420),
  ('D4', 'deliverable', 'D4', 'Funksionalitetet dhe komponentët teknologjikë të zhvilluar dhe përmirësuar', '{3}', 430),
  ('D5', 'deliverable', 'D5', 'Testimi funksional dhe teknik dhe dokumentimi i problematikave/përmirësimeve', '{4}', 440),
  ('D6', 'deliverable', 'D6', 'Versioni funksional i platformës i gatshëm për testim, demonstrim dhe pilotim', '{5}', 450),
  ('D7', 'deliverable', 'D7', 'Raport përmbledhës mbi zhvillimin teknologjik, funksionalitetet e realizuara dhe përmirësimet', '{5}', 460)
on conflict (id) do nothing;

-- D1 and D2 were delivered and accepted in month 1 (Raport përmbledhës, Dorëzimi I, 09.09.2026).
update project_items set status = 'done', note = 'Dorëzuar 09.09.2026 — Dorëzimi I' where id in ('D1', 'D2');
update project_items set status = 'in_progress' where id in ('A1.1', 'A1.2', 'A1.3', 'A2.1');
