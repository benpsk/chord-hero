
--bun:split

create table if not exists admin_users (
    id serial primary key,
    username varchar(150) not null unique,
    password_hash varchar(255) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_admin_users_updated_at
before update on admin_users
for each row
execute procedure update_updated_at_column();
