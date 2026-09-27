-- Project window starts August 2026: months 1 (Aug) and 2 (Sept) are completed.
insert into settings (key, value) values ('project_completed_months', '2')
on conflict (key) do update set value = excluded.value;

update project_items set status = 'done', note = 'Dorëzuar — muaji 1'
  where id in ('D1', 'D2');
update project_items set status = 'done', note = 'Dorëzuar — muaji 2'
  where id = 'D3';
update project_items set status = 'in_progress'
  where id in ('A1.1', 'A1.2', 'A1.3', 'A2.1', 'A3.1');
