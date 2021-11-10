/* Replace with your SQL commands */

 CREATE TABLE IF NOT EXISTS `lending_aave_eth_interest_rate` (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    lending_rate DECIMAL(32, 2) NOT NULL,
    borrowing_rate DECIMAL(32,2) NOT NULL,
    lending_distribution_apy DECIMAL(32,18) NOT NULL,
    borrowing_distribution_apy DECIMAL(32,18) NOT NULL,
    time_recorded TIMESTAMP NOT NULL
)