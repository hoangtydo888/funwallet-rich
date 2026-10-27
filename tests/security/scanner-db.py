"""Disposable local PostgreSQL only. Pass a local DSN; never a production URL.
Requires an empty test database and CREATE ROLE rights. Runs the migration from source.
"""
import concurrent.futures, os, pathlib, subprocess, sys
psql='/opt/homebrew/opt/postgresql@17/bin/psql'
dsn=sys.argv[1] if len(sys.argv)>1 else 'host=/private/tmp port=55439 dbname=postgres'
if '55439' not in dsn or 'host=/private/tmp' not in dsn: raise SystemExit('Use the dedicated disposable local test database')
def sql(query,check=True):
 r=subprocess.run([psql,dsn,'-XAt','-v','ON_ERROR_STOP=1','-c',query],capture_output=True,text=True)
 if check and r.returncode: raise AssertionError(r.stderr)
 return r
for role in ['anon','authenticated','service_role']:
 sql(f"DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='{role}') THEN CREATE ROLE {role}; END IF; END $$")
migration=pathlib.Path(__file__).resolve().parents[2]/'supabase/migrations/20261025090000_wallet_scanner_budgets.sql'
sql(migration.read_text()); checks=0
def equal(actual,expected):
 global checks
 assert actual==expected,(actual,expected);checks+=1
def call(user=1,scope='token-scanner',role='service_role'):
 uid=f'00000000-0000-0000-0000-{user:012d}'
 return sql(f"SET ROLE {role}; SELECT public.consume_wallet_scan_budget('{uid}','{scope}');").stdout.strip().splitlines()[-1]
def reset():sql('TRUNCATE public.wallet_scan_budgets;')
for role in ['anon','authenticated']:
 equal(sql(f"SET ROLE {role}; SELECT public.consume_wallet_scan_budget('00000000-0000-0000-0000-000000000001','token-scanner');",False).returncode!=0,True)
 equal(sql(f'SET ROLE {role}; SELECT * FROM public.wallet_scan_budgets;',False).returncode!=0,True)
equal(sql('SET ROLE service_role; SELECT * FROM public.wallet_scan_budgets;',False).returncode!=0,True)
equal(sql("SET ROLE service_role; SELECT public.consume_wallet_scan_budget(null,'token-scanner');",False).returncode!=0,True)
equal(sql("SET ROLE service_role; SELECT public.consume_wallet_scan_budget('00000000-0000-0000-0000-000000000001','attacker-scope');",False).returncode!=0,True)
reset()
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool: outcomes=list(pool.map(lambda _:call(),range(16)))
equal(outcomes.count('0'),12);equal(outcomes.count('60'),4)
equal(call(scope='nft-scanner'),'60');equal(call(scope='bscscan-proxy'),'60');equal(call(2),'0')
equal(sql("SELECT hits FROM public.wallet_scan_budgets WHERE bucket='user-minute:00000000-0000-0000-0000-000000000001';").stdout.strip(),'12')
for bucket,cap,retry in [('user-hour:00000000-0000-0000-0000-000000000001',120,3600),('global-minute',600,60),('global-hour',6000,3600)]:
 reset(); unit='minute' if bucket.endswith('minute') else 'hour'
 sql(f"INSERT INTO public.wallet_scan_budgets VALUES('{bucket}',date_trunc('{unit}',clock_timestamp()),{cap});")
 equal(call(),str(retry))
reset();sql("INSERT INTO public.wallet_scan_budgets VALUES('expired',clock_timestamp()-interval '3 hours',1)");equal(call(),'0');equal(sql("SELECT count(*) FROM public.wallet_scan_budgets WHERE bucket='expired'").stdout.strip(),'0')
equal(sql("SELECT relrowsecurity FROM pg_class WHERE oid='public.wallet_scan_budgets'::regclass;").stdout.strip(),'t')
# Applying the migration again must preserve existing counters.
sql(migration.read_text());equal(call(),'0');equal(sql("SELECT hits FROM public.wallet_scan_budgets WHERE bucket='user-minute:00000000-0000-0000-0000-000000000001';").stdout.strip(),'2')
print(f'{checks} database assertions passed; concurrency, shared scope, roles, cleanup and replay verified.')
