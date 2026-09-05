-- Public game ledger for priley86/trade-quest.
-- Personal contact information never belongs in this database.
create table if not exists player_accounts (
  player_id varchar(36) primary key,
  crew_public_id varchar(36) not null,
  display_name varchar(80) not null,
  cash_cents bigint not null default 100000,
  created_at timestamp not null default current_timestamp,
  index idx_crew (crew_public_id)
);

create table if not exists holdings (
  id varchar(36) primary key,
  player_id varchar(36) not null,
  asset_type enum('stock','pokemon_card','sports_card') not null,
  sport_segment varchar(40),
  asset_public_id varchar(120) not null,
  display_name varchar(160) not null,
  quantity decimal(18,6) not null,
  cost_basis_cents bigint not null,
  current_value_cents bigint not null,
  product_url varchar(2048) not null,
  image_url varchar(2048),
  acquired_at timestamp not null,
  index idx_player (player_id),
  constraint fk_holding_player foreign key (player_id) references player_accounts(player_id)
);

create table if not exists trades (
  id varchar(36) primary key,
  player_id varchar(36) not null,
  asset_type enum('stock','pokemon_card','sports_card') not null,
  asset_public_id varchar(120) not null,
  side enum('buy','sell') not null,
  quantity decimal(18,6) not null,
  price_cents bigint not null,
  executed_at timestamp not null default current_timestamp,
  index idx_trade_player_time (player_id, executed_at),
  constraint fk_trade_player foreign key (player_id) references player_accounts(player_id)
);

create table if not exists holding_price_history (
  id bigint auto_increment primary key,
  holding_id varchar(36) not null,
  recorded_date date not null,
  market_value_cents bigint not null,
  source varchar(40) not null,
  card_api_id varchar(120) not null,
  unique key uq_holding_day (holding_id, recorded_date),
  index idx_holding_date (holding_id, recorded_date)
);

create table if not exists portfolio_snapshots (
  player_id varchar(36) not null,
  snapshot_date date not null,
  cash_cents bigint not null,
  holdings_value_cents bigint not null,
  total_value_cents bigint not null,
  primary key (player_id, snapshot_date),
  constraint fk_snapshot_player foreign key (player_id) references player_accounts(player_id)
);
