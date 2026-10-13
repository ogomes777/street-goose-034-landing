create function public.customer_cpf_valid(value text) returns boolean language plpgsql immutable set search_path='' as $$
declare n integer; i integer; total integer; digit integer;
begin
 if value='' then return true; end if;
 if value !~ '^[0-9]{11}$' or value=repeat(substr(value,1,1),11) then return false; end if;
 for n in 9..10 loop
 total:=0;
 for i in 1..n loop total:=total+substr(value,i,1)::integer*(n+2-i); end loop;
 digit:=(total*10%11)%10;
 if digit<>substr(value,n+1,1)::integer then return false; end if;
 end loop;
 return true;
end; $$;
alter table public.customer_details add column cpf text not null default '' check(public.customer_cpf_valid(cpf));
