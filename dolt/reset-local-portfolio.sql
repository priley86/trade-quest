-- TradeQuest local portfolio reset
-- Destructive: removes all holdings, trades, price history, and snapshots.
-- Preserves player accounts, users, crews, and memberships.

START TRANSACTION;

DELETE FROM `holding_price_history`;
DELETE FROM `trades`;
DELETE FROM `holdings`;
DELETE FROM `portfolio_snapshots`;

-- The game starts each player with the crew's default $1,000 balance.
UPDATE `player_accounts` SET `cash_cents` = 100000;

COMMIT;

-- Verification: all should return zero; cash should return 100000 per player.
SELECT 'holdings' AS table_name, COUNT(*) AS remaining
FROM `holdings`
UNION ALL
SELECT 'trades', COUNT(*) FROM `trades`
UNION ALL
SELECT 'holding_price_history', COUNT(*) FROM `holding_price_history`
UNION ALL
SELECT 'portfolio_snapshots', COUNT(*) FROM `portfolio_snapshots`;

SELECT `player_id`, `cash_cents`
FROM `player_accounts`
ORDER BY `player_id`;
