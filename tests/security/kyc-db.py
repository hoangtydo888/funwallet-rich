"""KYC authorization regression on a dedicated disposable local database only."""
from pathlib import Path
import subprocess
PSQL='/opt/homebrew/opt/postgresql@17/bin/psql'
BASE=[PSQL,'host=/private/tmp port=55439 dbname=postgres','-XAt','-v','ON_ERROR_STOP=1']
def base(q):
 r=subprocess.run(BASE+['-c',q],capture_output=True,text=True)
 if r.returncode:raise AssertionError(r.stderr)
base("DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres SUPERUSER LOGIN; END IF; END $$;")
base('DROP DATABASE IF EXISTS fun_wallet_kyc_test;');base('CREATE DATABASE fun_wallet_kyc_test OWNER postgres;')
ROOT=Path(__file__).resolve().parents[2];checks=0
CMD=[PSQL,'host=/private/tmp port=55439 dbname=fun_wallet_kyc_test user=postgres','-XAt','-v','ON_ERROR_STOP=1']
def sql(q,ok=True):
 r=subprocess.run(CMD+['-c',q],capture_output=True,text=True)
 if ok and r.returncode:raise AssertionError(r.stderr)
 return r
def eq(a,b):
 global checks
 assert a==b,(a,b);checks+=1
a='00000000-0000-0000-0000-000000000001';b='00000000-0000-0000-0000-000000000002';admin='00000000-0000-0000-0000-000000000003'
one='10000000-0000-0000-0000-000000000001';two='10000000-0000-0000-0000-000000000002'
def as_user(uid,q,ok=True,role='authenticated'):
 return sql(f"SET ROLE {role}; SELECT set_config('request.jwt.claim.sub','{uid}',false); {q}",ok)
sql('''CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
CREATE TABLE storage.objects(id uuid,name text,bucket_id text);
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1,'/') $$;''')
sql((ROOT/'supabase/migrations/20260703183924_dfcd8396-e88f-4b3f-8dba-64155b1608d3.sql').read_text())
sql((ROOT/'supabase/migrations/20260703185432_6438ce90-5629-4d50-ba32-506976a168d0.sql').read_text())
sql(f"INSERT INTO auth.users VALUES('{a}','fixture-a@example.invalid','{{}}'),('{b}','fixture-b@example.invalid','{{}}'),('{admin}','fixture-admin@example.invalid','{{}}'); INSERT INTO public.user_roles(user_id,role)VALUES('{admin}','admin');")
# Reproduce original vulnerability without reading any real KYC data.
eq(as_user(a,f"UPDATE public.profiles SET kyc_status='approved' WHERE user_id='{a}';").returncode,0)
sql(f"UPDATE public.profiles SET kyc_status='pending';")
migration=(ROOT/'supabase/migrations/20261025100000_wallet_kyc_review_guards.sql').read_text();sql(migration)
eq(as_user(a,f"UPDATE public.profiles SET kyc_status='approved' WHERE user_id='{a}';",False).returncode!=0,True)
eq(as_user(a,f"INSERT INTO public.kyc_submissions(user_id,status)VALUES('{a}','approved');",False).returncode!=0,True)
eq(as_user(a,f"INSERT INTO public.kyc_submissions(user_id,reviewed_by)VALUES('{a}','{admin}');",False).returncode!=0,True)
eq(as_user(a,f"INSERT INTO public.kyc_submissions(user_id,id_front_path)VALUES('{a}','{b}/front.png');",False).returncode!=0,True)
eq(as_user(a,f"INSERT INTO public.kyc_submissions(id,user_id,id_front_path)VALUES('{one}','{a}','{a}/front.png');").returncode,0)
eq(as_user(b,f"INSERT INTO public.kyc_submissions(id,user_id)VALUES('{two}','{b}');").returncode,0)
eq(as_user(a,f"SELECT count(*) FROM public.kyc_submissions WHERE user_id='{b}'").stdout.strip().splitlines()[-1],'0')
eq(as_user(a,f"UPDATE public.kyc_submissions SET status='approved' WHERE id='{one}';",False).returncode!=0,True)
eq(as_user(a,f"UPDATE public.kyc_submissions SET user_id='{b}' WHERE id='{one}';",False).returncode!=0,True)
eq(as_user(a,f"UPDATE public.kyc_submissions SET full_name='fixture revised' WHERE id='{one}';").returncode,0)
eq(as_user(a,f"UPDATE public.profiles SET kyc_status='submitted',display_name='fixture' WHERE user_id='{a}';").returncode,0)
eq(as_user(a,f"SELECT public.review_wallet_kyc('{one}','approved',null);",False).returncode!=0,True)
eq(as_user('',f"SELECT public.review_wallet_kyc('{one}','approved',null);",False,'anon').returncode!=0,True)
eq(as_user(admin,f"SELECT public.review_wallet_kyc('{one}','approved',null);").returncode,0)
eq(sql(f"SELECT status||':'||reviewed_by::text FROM public.kyc_submissions WHERE id='{one}';").stdout.strip(),'approved:'+admin)
eq(sql(f"SELECT kyc_status FROM public.profiles WHERE user_id='{a}';").stdout.strip(),'approved')
eq(as_user(admin,f"SELECT public.review_wallet_kyc('{one}','rejected','second decision');",False).returncode!=0,True)
eq(as_user(admin,f"SELECT public.review_wallet_kyc('{two}','rejected','');",False).returncode!=0,True)
# Force profile write failure to verify that submission review also rolls back.
sql(f"CREATE FUNCTION public.test_profile_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id='{b}' THEN RAISE EXCEPTION 'fixture failure'; END IF;RETURN NEW;END $$; CREATE TRIGGER test_profile_fail BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.test_profile_fail();")
eq(as_user(admin,f"SELECT public.review_wallet_kyc('{two}','rejected','fixture reason');",False).returncode!=0,True)
eq(sql(f"SELECT status||':'||coalesce(reviewed_by::text,'none') FROM public.kyc_submissions WHERE id='{two}';").stdout.strip(),'pending:none')
sql('DROP TRIGGER test_profile_fail ON public.profiles;DROP FUNCTION public.test_profile_fail();')
eq(as_user(admin,f"SELECT public.review_wallet_kyc('{two}','rejected','fixture reason');").returncode,0)
eq(sql(f"SELECT kyc_status FROM public.profiles WHERE user_id='{b}';").stdout.strip(),'rejected')
sql(migration) # Idempotent guards, no changes to existing reviews.
eq(sql(f"SELECT status FROM public.kyc_submissions WHERE id='{one}';").stdout.strip(),'approved')
print(f'{checks} KYC database assertions passed, including original exploit reproduction, role isolation and atomic rollback.')
